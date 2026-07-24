import { Hono } from "hono";
import { db } from "../db";
import { formatCitation, type CitationStyle } from "../formatter";
import { optionalAuthMiddleware, authMiddleware, type UserSession } from "../middleware";

const citations = new Hono();

// Helper to parse authors JSON safely
function parseAuthors(authorsJson: string) {
  try {
    const parsed = JSON.parse(authorsJson);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [{ lastName: parsed, firstName: "" }];
    return [];
  } catch (_) {
    return [];
  }
}

// GET /api/citations - Search, Scope, PubType, Author, Year, Journal & Sorting
citations.get("/", optionalAuthMiddleware, (c) => {
  const user = c.get("user") as UserSession | undefined;
  const scope = (c.req.query("scope") || "all").toLowerCase().trim();
  const search = (c.req.query("search") || "").toLowerCase().trim();
  const pubType = c.req.query("pubType") ? c.req.query("pubType")!.toLowerCase().trim() : null;
  const authorFilterStr = (c.req.query("author") || "").toLowerCase().trim();
  const yearFilterStr = c.req.query("year") ? c.req.query("year")!.trim() : "";
  const journalFilter = (c.req.query("journal") || "").toLowerCase().trim();
  const sortBy = (c.req.query("sortBy") || "created_at").toLowerCase().trim();
  const sortOrder = (c.req.query("sortOrder") || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "12", 10);
  const offset = (page - 1) * limit;

  // Build common filter SQL conditions (independent of scope)
  const commonConditions: string[] = [];
  const commonParams: any[] = [];

  // 1. Search Query (Keyword across title, authors, journal, doi, year)
  if (search) {
    commonConditions.push(
      "(LOWER(c.title) LIKE ? OR LOWER(c.authors) LIKE ? OR LOWER(c.journal_or_publisher) LIKE ? OR LOWER(c.doi) LIKE ? OR CAST(c.year AS TEXT) LIKE ?)"
    );
    const pattern = `%${search}%`;
    commonParams.push(pattern, pattern, pattern, pattern, pattern);
  }

  // 2. Publication Type Facet
  if (pubType && pubType !== "all") {
    commonConditions.push("c.pub_type = ?");
    commonParams.push(pubType);
  }

  // 3. Multi-Author Fuzzy Filter
  if (authorFilterStr && authorFilterStr !== "all") {
    const delimiter = authorFilterStr.includes("||") ? "||" : ",";
    const authorList = authorFilterStr
      .split(delimiter)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (authorList.length > 0) {
      const authorConditions: string[] = [];
      for (const auth of authorList) {
        authorConditions.push("LOWER(c.authors) LIKE ?");
        commonParams.push(`%${auth}%`);
      }
      commonConditions.push(`(${authorConditions.join(" OR ")})`);
    }
  }

  // 4. Year Filter
  if (yearFilterStr && yearFilterStr !== "all") {
    if (yearFilterStr.includes("..")) {
      const parts = yearFilterStr.split("..");
      const minY = parseInt(parts[0], 10);
      const maxY = parseInt(parts[1], 10);
      if (!isNaN(minY) && !isNaN(maxY)) {
        commonConditions.push("c.year >= ? AND c.year <= ?");
        commonParams.push(minY, maxY);
      }
    } else {
      const yearList = yearFilterStr
        .split(",")
        .map((y) => parseInt(y.trim(), 10))
        .filter((y) => !isNaN(y));

      if (yearList.length > 0) {
        const placeholders = yearList.map(() => "?").join(",");
        commonConditions.push(`c.year IN (${placeholders})`);
        commonParams.push(...yearList);
      }
    }
  }

  // 5. Journal / Publisher Filter
  if (journalFilter && journalFilter !== "all") {
    commonConditions.push("(LOWER(c.journal_or_publisher) = ? OR LOWER(c.journal_or_publisher) LIKE ?)");
    commonParams.push(journalFilter, `%${journalFilter}%`);
  }

  // Apply scope condition for active stream query
  const streamConditions = [...commonConditions];
  const streamParams = [...commonParams];

  if (scope === "my" && user) {
    streamConditions.push("c.id IN (SELECT citation_id FROM user_citations WHERE user_id = ?)");
    streamParams.push(user.id);
  } else if (scope === "unowned") {
    streamConditions.push("c.id NOT IN (SELECT citation_id FROM user_citations)");
  }

  const streamWhereClause = streamConditions.length > 0 ? `WHERE ${streamConditions.join(" AND ")}` : "";

  // Count total matching records for current active scope & filters
  const countSql = `SELECT COUNT(*) as total FROM citations c ${streamWhereClause}`;
  const totalRow = db.prepare(countSql).get(...streamParams) as { total: number };
  const total = totalRow ? totalRow.total : 0;

  // Sorting Mapping with NULLS LAST handling
  let sortColumn = "c.created_at";
  if (sortBy === "year") sortColumn = "c.year";
  else if (sortBy === "title") sortColumn = "c.title";
  else if (sortBy === "journal") sortColumn = "c.journal_or_publisher";

  const fetchSql = `
    SELECT c.id, c.title, c.authors, c.year, c.journal_or_publisher,
           c.volume, c.issue, c.pages, c.doi, c.url, c.pub_type, c.abstract, c.created_at
    FROM citations c
    ${streamWhereClause}
    ORDER BY ${sortColumn} IS NULL ASC, ${sortColumn} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(fetchSql).all(...streamParams, limit, offset) as any[];

  // Attach ownership and pre-rendered CSL formats
  const formattedCitations = rows.map((r) => {
    const authors = parseAuthors(r.authors);
    const citationData = {
      id: r.id,
      title: r.title,
      authors,
      year: r.year,
      journalOrPublisher: r.journal_or_publisher,
      volume: r.volume,
      issue: r.issue,
      pages: r.pages,
      doi: r.doi,
      url: r.url,
      pubType: r.pub_type,
      abstract: r.abstract,
      createdAt: r.created_at,
    };

    let isOwner = false;
    if (user) {
      const ownerCheck = db
        .prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?")
        .get(user.id, r.id);
      isOwner = !!ownerCheck;
    }

    const styles: CitationStyle[] = ["APA7", "IEEE", "MLA9", "Chicago17", "BibTeX", "RIS", "CSL-JSON"];
    const formats: Record<string, any> = {};
    for (const style of styles) {
      formats[style] = formatCitation(citationData, style);
    }

    return {
      ...citationData,
      isOwner,
      formats,
    };
  });

  // Dynamically compute Scope Counts reflecting active search & facet filters
  // 1. My Citations Scope Count
  let myCount = 0;
  if (user) {
    const myConds = ["c.id IN (SELECT citation_id FROM user_citations WHERE user_id = ?)", ...commonConditions];
    const myWhere = `WHERE ${myConds.join(" AND ")}`;
    myCount = (db.prepare(`SELECT COUNT(*) as cnt FROM citations c ${myWhere}`).get(user.id, ...commonParams) as any)?.cnt || 0;
  }

  // 2. Unowned Citations Scope Count
  const unownedConds = ["c.id NOT IN (SELECT citation_id FROM user_citations)", ...commonConditions];
  const unownedWhere = `WHERE ${unownedConds.join(" AND ")}`;
  const unownedCount = (db.prepare(`SELECT COUNT(*) as cnt FROM citations c ${unownedWhere}`).get(...commonParams) as any)?.cnt || 0;

  // 3. All Citations Scope Count
  const allWhere = commonConditions.length > 0 ? `WHERE ${commonConditions.join(" AND ")}` : "";
  const allCount = (db.prepare(`SELECT COUNT(*) as cnt FROM citations c ${allWhere}`).get(...commonParams) as any)?.cnt || 0;

  // Extract available years, journals, and authors dynamically from active database citations
  const availableYearsRows = db.prepare("SELECT DISTINCT year FROM citations WHERE year IS NOT NULL ORDER BY year DESC").all() as any[];
  const availableJournalsRows = db.prepare("SELECT DISTINCT journal_or_publisher FROM citations WHERE journal_or_publisher IS NOT NULL AND journal_or_publisher != '' ORDER BY journal_or_publisher ASC LIMIT 50").all() as any[];
  const allAuthorsRows = db.prepare("SELECT authors FROM citations WHERE authors IS NOT NULL AND authors != ''").all() as any[];

  // Collect unique author display names for fuzzy search autocomplete
  const authorNameSet = new Set<string>();
  for (const r of allAuthorsRows) {
    const parsed = parseAuthors(r.authors);
    for (const a of parsed) {
      if (a.lastName) {
        const displayName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
        authorNameSet.add(displayName);
      }
    }
  }
  const availableAuthors = Array.from(authorNameSet).sort();

  return c.json({
    citations: formattedCitations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    scopeCounts: {
      my: myCount,
      unowned: unownedCount,
      all: allCount,
    },
    filterOptions: {
      availableYears: availableYearsRows.map((r) => r.year),
      availableJournals: availableJournalsRows.map((r) => r.journal_or_publisher),
      availableAuthors,
    },
  });
});

// GET /api/citations/:id - Retrieve single citation details
citations.get("/:id", optionalAuthMiddleware, (c) => {
  const { id } = c.req.param();
  const user = c.get("user") as UserSession | undefined;

  const r = db.prepare(`
    SELECT c.id, c.title, c.authors, c.year, c.journal_or_publisher,
           c.volume, c.issue, c.pages, c.doi, c.url, c.pub_type, c.abstract, c.created_at
    FROM citations c
    WHERE c.id = ?
  `).get(id) as any;

  if (!r) return c.json({ error: "Citation not found" }, 404);

  const authors = parseAuthors(r.authors);
  const citationData = {
    id: r.id,
    title: r.title,
    authors,
    year: r.year,
    journalOrPublisher: r.journal_or_publisher,
    volume: r.volume,
    issue: r.issue,
    pages: r.pages,
    doi: r.doi,
    url: r.url,
    pubType: r.pub_type,
    abstract: r.abstract,
    createdAt: r.created_at,
  };

  let isOwner = false;
  if (user) {
    const ownerCheck = db
      .prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?")
      .get(user.id, r.id);
    isOwner = !!ownerCheck;
  }

  const styles: CitationStyle[] = ["APA7", "IEEE", "MLA9", "Chicago17", "BibTeX", "RIS", "CSL-JSON"];
  const formats: Record<string, any> = {};
  for (const style of styles) {
    formats[style] = formatCitation(citationData, style);
  }

  // Fetch list of current owners for collaboration
  const owners = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name
    FROM users u
    JOIN user_citations uc ON u.id = uc.user_id
    WHERE uc.citation_id = ?
  `).all(r.id) as any[];

  return c.json({
    citation: {
      ...citationData,
      isOwner,
      owners,
      formats,
    },
  });
});

// POST /api/citations - Add new academic citation
citations.post("/", authMiddleware, async (c) => {
  const user = c.get("user") as UserSession;
  const body = await c.req.json();

  const title = (body.title || "").trim();
  if (!title) return c.json({ error: "Paper title is required" }, 400);

  const citationId = crypto.randomUUID();
  const authorsJson = JSON.stringify(body.authors || []);
  const year = body.year ? parseInt(body.year, 10) : null;
  const pubType = (body.pubType || "article").toLowerCase();

  db.prepare(`
    INSERT INTO citations (id, title, authors, year, journal_or_publisher, volume, issue, pages, doi, url, pub_type, abstract)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    citationId,
    title,
    authorsJson,
    year,
    body.journalOrPublisher || null,
    body.volume || null,
    body.issue || null,
    body.pages || null,
    body.doi || null,
    body.url || null,
    pubType,
    body.abstract || null
  );

  // Bind ownership to current logged-in user
  db.prepare("INSERT INTO user_citations (user_id, citation_id) VALUES (?, ?)").run(user.id, citationId);

  return c.json({ success: true, citationId });
});

// PUT /api/citations/:id - Edit citation (Owner or Admin)
citations.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user") as UserSession;
  const { id } = c.req.param();

  const isOwner = db.prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?").get(user.id, id);
  if (!isOwner && user.role !== "admin") {
    return c.json({ error: "Forbidden: You are not an owner of this citation" }, 403);
  }

  const body = await c.req.json();
  const title = (body.title || "").trim();
  if (!title) return c.json({ error: "Paper title is required" }, 400);

  const authorsJson = JSON.stringify(body.authors || []);
  const year = body.year ? parseInt(body.year, 10) : null;
  const pubType = (body.pubType || "article").toLowerCase();

  db.prepare(`
    UPDATE citations
    SET title = ?, authors = ?, year = ?, journal_or_publisher = ?, volume = ?, issue = ?, pages = ?, doi = ?, url = ?, pub_type = ?, abstract = ?
    WHERE id = ?
  `).run(
    title,
    authorsJson,
    year,
    body.journalOrPublisher || null,
    body.volume || null,
    body.issue || null,
    body.pages || null,
    body.doi || null,
    body.url || null,
    pubType,
    body.abstract || null,
    id
  );

  return c.json({ success: true });
});

// POST /api/citations/:id/claim - Claim unowned or co-own citation
citations.post("/:id/claim", authMiddleware, (c) => {
  const user = c.get("user") as UserSession;
  const { id } = c.req.param();

  const existing = db.prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?").get(user.id, id);
  if (existing) return c.json({ error: "You already own this citation" }, 400);

  db.prepare("INSERT INTO user_citations (user_id, citation_id) VALUES (?, ?)").run(user.id, id);
  return c.json({ success: true, message: "Citation claimed successfully" });
});

// DELETE /api/citations/:id/ownership - Un-own citation
citations.delete("/:id/ownership", authMiddleware, (c) => {
  const user = c.get("user") as UserSession;
  const { id } = c.req.param();

  const check = db.prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?").get(user.id, id);
  if (!check) return c.json({ error: "You do not own this citation" }, 400);

  db.prepare("DELETE FROM user_citations WHERE user_id = ? AND citation_id = ?").run(user.id, id);

  const remaining = db.prepare("SELECT COUNT(*) as cnt FROM user_citations WHERE citation_id = ?").get(id) as { cnt: number };
  const isNowUnowned = remaining.cnt === 0;

  return c.json({ success: true, isNowUnowned });
});

export default citations;
