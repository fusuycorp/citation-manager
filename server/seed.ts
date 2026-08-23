import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db, initDB } from "./db";
import { parseAuthorString, parseRawAuthorsList, parseRawCitationString, type Author } from "./formatter";

interface RawFaculty {
  name: string;
  email: string;
  citations?: Record<string, string[] | any>;
}

export function runSeed() {
  initDB();

  console.log("Seeding database with faculty citations...");

  const jsonPath = join(import.meta.dir, "../outputs/faculty_directory_en.json");
  if (!existsSync(jsonPath)) {
    console.error("JSON seed file not found at:", jsonPath);
    return;
  }

  const rawData = readFileSync(jsonPath, "utf-8");
  const facultyList: RawFaculty[] = JSON.parse(rawData);

  const defaultPasswordHash = Bun.password.hashSync("password123");

  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, email, first_name, last_name, password_hash, role)
    VALUES (?, ?, ?, ?, ?, 'user')
    ON CONFLICT(email) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name
  `);

  const findUserByEmailStmt = db.prepare("SELECT id FROM users WHERE email = ?");
  const findCitationByTitleStmt = db.prepare("SELECT id FROM citations WHERE title = ?");

  const insertCitationStmt = db.prepare(`
    INSERT INTO citations (id, title, authors, year, journal_or_publisher, volume, issue, pages, doi, raw_source, pub_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'article')
  `);

  const insertUserCitationStmt = db.prepare(`
    INSERT OR IGNORE INTO user_citations (user_id, citation_id)
    VALUES (?, ?)
  `);

  let userCount = 0;
  let citationCount = 0;
  let linkCount = 0;

  db.transaction(() => {
    // Also seed an Admin user
    const adminId = crypto.randomUUID();
    db.run(
      `INSERT INTO users (id, email, first_name, last_name, password_hash, role)
       VALUES (?, 'admin@bogazici.edu.tr', 'System', 'Admin', ?, 'admin')
       ON CONFLICT(email) DO NOTHING`,
      [adminId, defaultPasswordHash]
    );

    for (const faculty of facultyList) {
      if (!faculty.email) continue;

      const email = faculty.email.toLowerCase().trim();
      const nameParts = faculty.name.trim().split(" ");
      const lastName = nameParts.pop() || "";
      const firstName = nameParts.join(" ");

      // 1. Create or find User
      let userId: string;
      const existingUser = findUserByEmailStmt.get(email) as { id: string } | undefined;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        userId = crypto.randomUUID();
        insertUserStmt.run(userId, email, firstName, lastName, defaultPasswordHash);
        userCount++;
      }

      // 2. Process Faculty Citations
      if (faculty.citations && typeof faculty.citations === "object") {
        for (const category of Object.keys(faculty.citations)) {
          const list = faculty.citations[category];
          if (Array.isArray(list)) {
            for (const item of list) {
              if (typeof item !== "string" || item.length < 10) continue;

              const parsed = parseRawCitationString(item);

              // Find or Insert Citation
              let citationId: string;
              const existingCitation = findCitationByTitleStmt.get(parsed.title) as { id: string } | undefined;

              if (existingCitation) {
                citationId = existingCitation.id;
              } else {
                citationId = crypto.randomUUID();
                insertCitationStmt.run(
                  citationId,
                  parsed.title,
                  JSON.stringify(parsed.authors),
                  parsed.year,
                  parsed.journal,
                  parsed.volume,
                  parsed.issue,
                  parsed.pages,
                  parsed.doi,
                  item
                );
                citationCount++;
              }

              // Link User to Citation
              insertUserCitationStmt.run(userId, citationId);
              linkCount++;
            }
          }
        }
      }
    }

    // 3. Insert an Unowned / Orphan Sample Citation for testing lifecycle
    const unownedCitationId = crypto.randomUUID();
    insertCitationStmt.run(
      unownedCitationId,
      "Quantum Information Processing and Distributed Ledger Consensus Algorithms",
      JSON.stringify([
        { firstName: "Alice", lastName: "Smith" },
        { firstName: "Bob", lastName: "Jones" },
      ]),
      2026,
      "Journal of Quantum Computing",
      "12",
      "3",
      "101-115",
      "10.1000/jqc.2026.001",
      "Smith, A., & Jones, B. (2026). Quantum Information Processing. Journal of Quantum Computing."
    );
  })();

  console.log(`Seeding complete! Added ${userCount} users, ${citationCount} citations, and ${linkCount} ownership links.`);
}

if (import.meta.main) {
  runSeed();
}
