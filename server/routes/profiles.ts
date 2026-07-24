import { Hono } from "hono";
import { db } from "../db";
import { formatCitation, type CitationStyle } from "../formatter";
import { optionalAuthMiddleware, type UserSession } from "../middleware";

const profiles = new Hono();

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

// Smart Academic Author Matching Logic (Handles "Last, First", "First Last", and initial variations like "A. Sencer" vs "Asli Sencer")
function isAuthorMatch(authors: any[], searchName: string): boolean {
  if (!searchName || !authors || authors.length === 0) return false;
  const clean = searchName.trim().toLowerCase();
  const parts = clean.replace(",", " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;

  const searchLastName = clean.includes(",") ? parts[0] : parts[parts.length - 1];
  const searchFirstName = clean.includes(",") ? parts.slice(1).join(" ") : parts.slice(0, -1).join(" ");
  const initial = searchFirstName.length > 0 ? searchFirstName[0] : "";

  return authors.some((a: any) => {
    if (!a.lastName) return false;
    const aLast = a.lastName.toLowerCase();
    const aFirst = (a.firstName || "").toLowerCase();

    // Check Last Name match (exact or substring)
    const matchesLast = aLast === searchLastName || aLast.includes(searchLastName) || searchLastName.includes(aLast);
    if (!matchesLast) return false;

    // If search specified a first name/initial, verify first initial
    if (!initial) return true;
    if (!aFirst) return true;
    return aFirst.startsWith(initial);
  });
}

// GET /api/profiles/search?q=query - Search across registered users and directory authors
profiles.get("/search", optionalAuthMiddleware, (c) => {
  const query = (c.req.query("q") || "").trim().toLowerCase();
  if (!query) return c.json({ results: [] });

  // 1. Search registered users
  const users = db.prepare(`
    SELECT id, email, first_name, last_name, role, created_at
    FROM users
    WHERE LOWER(email) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(first_name || ' ' || last_name) LIKE ?
    LIMIT 10
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];

  // 2. Search distinct citation authors from database
  const allAuthorsRows = db.prepare("SELECT authors FROM citations WHERE authors IS NOT NULL AND authors != ''").all() as any[];
  const authorMap = new Map<string, number>();

  for (const r of allAuthorsRows) {
    const parsed = parseAuthors(r.authors);
    for (const a of parsed) {
      if (a.lastName) {
        const displayName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
        const fullNormal = a.firstName ? `${a.firstName} ${a.lastName}` : a.lastName;
        if (displayName.toLowerCase().includes(query) || fullNormal.toLowerCase().includes(query)) {
          authorMap.set(displayName, (authorMap.get(displayName) || 0) + 1);
        }
      }
    }
  }

  const results: any[] = [];

  // Formatted User Results
  for (const u of users) {
    const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
    results.push({
      type: "user",
      id: u.id,
      name,
      email: u.email,
      role: u.role,
      identifier: u.id,
    });
  }

  // Formatted External Author Results
  for (const [authorName, count] of authorMap.entries()) {
    const matchedUser = users.find((u) => {
      const uName = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      return uName.toLowerCase() === authorName.toLowerCase() || u.last_name.toLowerCase() === authorName.toLowerCase();
    });

    if (!matchedUser) {
      results.push({
        type: "author",
        name: authorName,
        paperCount: count,
        identifier: encodeURIComponent(authorName),
      });
    }
  }

  return c.json({ results: results.slice(0, 15) });
});

// GET /api/profiles/:identifier - Fetch detailed Profile for User OR Directory Author
profiles.get("/:identifier", optionalAuthMiddleware, (c) => {
  const { identifier } = c.req.param();
  const decodedIdentifier = decodeURIComponent(identifier).trim();
  const sessionUser = c.get("user") as UserSession | undefined;

  // Step 1: Check if identifier matches a registered User ID or Email
  let userRow = db.prepare("SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ? OR LOWER(email) = ?").get(decodedIdentifier, decodedIdentifier.toLowerCase()) as any;

  // If not found by ID/email, check if identifier matches a User's Full Name (e.g. "Mehmet Nuri Aydin" or "Sencer, Asli")
  if (!userRow) {
    const allUsers = db.prepare("SELECT id, email, first_name, last_name, role, created_at FROM users").all() as any[];
    userRow = allUsers.find((u) => {
      const full1 = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
      const full2 = `${u.last_name || ""}, ${u.first_name || ""}`.trim().toLowerCase();
      const target = decodedIdentifier.toLowerCase();
      return full1 === target || full2 === target || (u.last_name && u.last_name.toLowerCase() === target);
    });
  }

  // CASE A: Profile is a Registered User
  if (userRow) {
    const userId = userRow.id;
    const userName = `${userRow.first_name || ""} ${userRow.last_name || ""}`.trim() || userRow.email;

    // Fetch citations owned by this user
    const rows = db.prepare(`
      SELECT c.id, c.title, c.authors, c.year, c.journal_or_publisher,
             c.volume, c.issue, c.pages, c.doi, c.url, c.pub_type, c.abstract, c.created_at
      FROM citations c
      JOIN user_citations uc ON c.id = uc.citation_id
      WHERE uc.user_id = ?
      ORDER BY c.year DESC, c.created_at DESC
    `).all(userId) as any[];

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
      if (sessionUser) {
        const ownerCheck = db.prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?").get(sessionUser.id, r.id);
        isOwner = !!ownerCheck;
      }

      const styles: CitationStyle[] = ["APA7", "IEEE", "MLA9", "Chicago17"];
      const formats: Record<string, any> = {};
      for (const style of styles) {
        formats[style] = formatCitation(citationData, style);
      }

      return { ...citationData, isOwner, formats };
    });

    // Collect co-authors network
    const coAuthorSet = new Set<string>();
    for (const r of rows) {
      const parsed = parseAuthors(r.authors);
      for (const a of parsed) {
        if (a.lastName) {
          const dName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
          if (dName.toLowerCase() !== userName.toLowerCase() && dName.toLowerCase() !== (userRow.last_name || "").toLowerCase()) {
            coAuthorSet.add(dName);
          }
        }
      }
    }

    return c.json({
      type: "user",
      profile: {
        id: userRow.id,
        name: userName,
        email: userRow.email,
        firstName: userRow.first_name || "",
        lastName: userRow.last_name || "",
        role: userRow.role,
        createdAt: userRow.created_at,
        paperCount: formattedCitations.length,
        coAuthors: Array.from(coAuthorSet),
      },
      citations: formattedCitations,
    });
  }

  // CASE B: Profile is an External / Unregistered Directory Author
  const allCitations = db.prepare(`
    SELECT c.id, c.title, c.authors, c.year, c.journal_or_publisher,
           c.volume, c.issue, c.pages, c.doi, c.url, c.pub_type, c.abstract, c.created_at
    FROM citations c
    ORDER BY c.year DESC, c.created_at DESC
  `).all() as any[];

  const authorRows = allCitations.filter((r) => {
    const parsed = parseAuthors(r.authors);
    return isAuthorMatch(parsed, decodedIdentifier);
  });

  const formattedAuthorCitations = authorRows.map((r) => {
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
    if (sessionUser) {
      const ownerCheck = db.prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?").get(sessionUser.id, r.id);
      isOwner = !!ownerCheck;
    }

    const styles: CitationStyle[] = ["APA7", "IEEE", "MLA9", "Chicago17"];
    const formats: Record<string, any> = {};
    for (const style of styles) {
      formats[style] = formatCitation(citationData, style);
    }

    return { ...citationData, isOwner, formats };
  });

  // Collect co-authors for this external author
  const coAuthorSet = new Set<string>();
  for (const r of authorRows) {
    const parsed = parseAuthors(r.authors);
    for (const a of parsed) {
      if (a.lastName) {
        const dName = a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
        if (!isAuthorMatch([a], decodedIdentifier)) {
          coAuthorSet.add(dName);
        }
      }
    }
  }

  return c.json({
    type: "author",
    profile: {
      name: decodedIdentifier,
      paperCount: formattedAuthorCitations.length,
      coAuthors: Array.from(coAuthorSet),
      isRegisteredUser: false,
    },
    citations: formattedAuthorCitations,
  });
});

export default profiles;
