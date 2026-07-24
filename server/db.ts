import { Database } from "bun:sqlite";
import { join } from "path";

const dbPath = join(import.meta.dir, "../citation_manager.sqlite");
export const db = new Database(dbPath, { create: true });

// Enable foreign keys & WAL mode for performance
db.run("PRAGMA foreign_keys = ON;");
db.run("PRAGMA journal_mode = WAL;");

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

  // Seed default whitelisted domains
  const insertDomain = db.prepare("INSERT OR IGNORE INTO whitelisted_domains (id, domain, policy_type) VALUES (?, ?, ?)");
  insertDomain.run("domain-1", "bogazici.edu.tr", "EXACT");
  insertDomain.run("domain-2", "gmail.com", "EXACT");
  insertDomain.run("domain-3", "*.ac.uk", "WILDCARD");
}

// Run DB Init
initDB();
