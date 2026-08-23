import { Database } from "bun:sqlite";
import { join } from "path";

const isTest = process.env.NODE_ENV === "test" || process.env.DB_PATH === ":memory:";
const dbPath = isTest ? ":memory:" : (process.env.DB_PATH || join(import.meta.dir, "../citation_manager.sqlite"));
export const db = new Database(dbPath, { create: true });

// Enable foreign keys & WAL mode for performance
db.run("PRAGMA foreign_keys = ON;");
if (!isTest) {
  db.run("PRAGMA journal_mode = WAL;");
}

// Initialize Database Schema
export function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS whitelisted_domains (
      id TEXT PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      policy_type TEXT DEFAULT 'EXACT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.run("ALTER TABLE whitelisted_domains ADD COLUMN policy_type TEXT DEFAULT 'EXACT';");
  } catch (_) {
    // Column already exists
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT NOT NULL, -- JSON Array of author objects
      year INTEGER,
      journal_or_publisher TEXT,
      volume TEXT,
      issue TEXT,
      pages TEXT,
      doi TEXT,
      url TEXT,
      pub_type TEXT DEFAULT 'article',
      abstract TEXT,
      raw_source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.run("ALTER TABLE citations ADD COLUMN abstract TEXT;");
  } catch (_) {
    // Column already exists
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS user_citations (
      user_id TEXT NOT NULL,
      citation_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, citation_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (citation_id) REFERENCES citations(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      citation_id TEXT NOT NULL,
      inviter_user_id TEXT NOT NULL,
      invited_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citation_id) REFERENCES citations(id) ON DELETE CASCADE,
      FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // New Standards & Admin Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_entity TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      default_csl_style TEXT DEFAULT 'APA7',
      default_in_text_mode TEXT DEFAULT 'parenthetical',
      theme_mode TEXT DEFAULT 'light',
      view_density TEXT DEFAULT 'card',
      default_export_format TEXT DEFAULT 'BibTeX',
      export_include_abstract INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS citation_duplicates (
      id TEXT PRIMARY KEY,
      source_citation_id TEXT NOT NULL,
      target_citation_id TEXT NOT NULL,
      match_score REAL NOT NULL,
      match_reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_citation_id) REFERENCES citations(id) ON DELETE CASCADE,
      FOREIGN KEY (target_citation_id) REFERENCES citations(id) ON DELETE CASCADE
    );
  `);

  // Secondary Indexes for fast lookups, joins, and filtering
  db.run("CREATE INDEX IF NOT EXISTS idx_citations_year ON citations(year);");
  db.run("CREATE INDEX IF NOT EXISTS idx_citations_pub_type ON citations(pub_type);");
  db.run("CREATE INDEX IF NOT EXISTS idx_citations_created_at ON citations(created_at);");
  db.run("CREATE INDEX IF NOT EXISTS idx_citations_journal ON citations(journal_or_publisher);");
  db.run("CREATE INDEX IF NOT EXISTS idx_citations_doi ON citations(doi);");
  db.run("CREATE INDEX IF NOT EXISTS idx_citations_title ON citations(title);");

  db.run("CREATE INDEX IF NOT EXISTS idx_user_citations_citation_id ON user_citations(citation_id);");
  db.run("CREATE INDEX IF NOT EXISTS idx_user_citations_user_id ON user_citations(user_id);");

  db.run("CREATE INDEX IF NOT EXISTS idx_invitations_citation_id ON invitations(citation_id);");
  db.run("CREATE INDEX IF NOT EXISTS idx_invitations_invited_email ON invitations(invited_email);");
  db.run("CREATE INDEX IF NOT EXISTS idx_invitations_inviter_user_id ON invitations(inviter_user_id);");

  // Seed default whitelisted domains
  const insertDomain = db.prepare("INSERT OR IGNORE INTO whitelisted_domains (id, domain, policy_type) VALUES (?, ?, ?)");
  insertDomain.run("domain-1", "bogazici.edu.tr", "EXACT");
  insertDomain.run("domain-2", "gmail.com", "EXACT");
  insertDomain.run("domain-3", "*.ac.uk", "WILDCARD");

  // Seed default admin if not exists
  const adminEmail = "admin@bogazici.edu.tr";
  const adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (!adminUser) {
    const adminId = crypto.randomUUID();
    const defaultPasswordHash = Bun.password.hashSync("password123");
    db.prepare(`
      INSERT INTO users (id, email, first_name, last_name, password_hash, role)
      VALUES (?, ?, 'System', 'Admin', ?, 'admin')
      ON CONFLICT(email) DO NOTHING
    `).run(adminId, adminEmail, defaultPasswordHash);
  }
}

// Reset Database completely for clean test isolation
export function resetDB() {
  db.run("PRAGMA foreign_keys = OFF;");
  const tables = [
    "system_audit_logs",
    "user_preferences",
    "citation_duplicates",
    "invitations",
    "user_citations",
    "citations",
    "whitelisted_domains",
    "users",
  ];
  for (const t of tables) {
    db.run(`DROP TABLE IF EXISTS ${t};`);
  }
  db.run("PRAGMA foreign_keys = ON;");
  initDB();
}

// Run DB Init
initDB();
