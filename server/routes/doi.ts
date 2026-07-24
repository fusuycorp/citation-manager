import { Hono } from "hono";
import { parseAuthorString, type Author } from "../formatter";
import { authMiddleware } from "../middleware";

const doiRouter = new Hono();
doiRouter.use("*", authMiddleware);

// GET /api/doi/lookup?doi=...
doiRouter.get("/lookup", async (c) => {
  const rawDoi = c.req.query("doi");
  if (!rawDoi) {
    return c.json({ error: "DOI query parameter is required" }, 400);
  }

  // Clean DOI format e.g. 10.1007/s42979-024-03500-1
  const doiMatch = rawDoi.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  if (!doiMatch) {
    return c.json({ error: "Invalid DOI identifier format" }, 400);
  }

  const cleanDoi = doiMatch[0];

  try {
    // 1. Query Crossref REST API using Polite Pool header
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
    const response = await fetch(crossrefUrl, {
      headers: {
        "User-Agent": "CiteSphere/1.0 (mailto:admin@bogazici.edu.tr)",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const item = data.message;

      const title = item.title && item.title.length > 0 ? item.title[0] : "";
      
      const authors: Author[] = [];
      if (item.author && Array.isArray(item.author)) {
        for (const a of item.author) {
          authors.push({
            firstName: a.given || "",
            lastName: a.family ? parseAuthorString(a.family).lastName : "Unknown",
          });
        }
      }

      let year: number | null = null;
      if (item["published-print"]?.["date-parts"]?.[0]?.[0]) {
        year = item["published-print"]["date-parts"][0][0];
      } else if (item["published-online"]?.["date-parts"]?.[0]?.[0]) {
        year = item["published-online"]["date-parts"][0][0];
      } else if (item.created?.["date-parts"]?.[0]?.[0]) {
        year = item.created["date-parts"][0][0];
      }

      const journalOrPublisher = item["container-title"]?.[0] || item.publisher || "";
      const volume = item.volume || "";
      const issue = item.issue || "";
      const pages = item.page || "";
      const doi = item.DOI || cleanDoi;
      const url = item.URL || `https://doi.org/${cleanDoi}`;

      return c.json({
        metadata: {
          title,
          authors: authors.length > 0 ? authors : [{ lastName: "Unknown" }],
          year,
          journalOrPublisher,
          volume,
          issue,
          pages,
          doi,
          url,
          pubType: "article",
        },
      });
    }

    // 2. Fallback to HTTP Content Negotiation if Crossref fails
    const cslResponse = await fetch(`https://doi.org/${encodeURIComponent(cleanDoi)}`, {
      headers: {
        Accept: "application/citeproc+json",
      },
    });

    if (cslResponse.ok) {
      const csl = await cslResponse.json();
      const authors: Author[] = (csl.author || []).map((a: any) => ({
        firstName: a.given || "",
        lastName: a.family || "Unknown",
      }));

      return c.json({
        metadata: {
          title: csl.title || "",
          authors: authors.length > 0 ? authors : [{ lastName: "Unknown" }],
          year: csl.issued?.["date-parts"]?.[0]?.[0] || null,
          journalOrPublisher: csl["container-title"] || "",
          volume: csl.volume || "",
          issue: csl.issue || "",
          pages: csl.page || "",
          doi: csl.DOI || cleanDoi,
          url: csl.URL || `https://doi.org/${cleanDoi}`,
          pubType: "article",
        },
      });
    }

    return c.json({ error: `Failed to resolve DOI metadata for ${cleanDoi}` }, 404);
  } catch (err: any) {
    return c.json({ error: `DOI lookup error: ${err.message}` }, 500);
  }
});

export default doiRouter;
