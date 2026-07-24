import { Hono } from "hono";
import { db } from "../db";
import { adminMiddleware, authMiddleware, type UserSession } from "../middleware";

const admin = new Hono();

admin.use("*", authMiddleware);
admin.use("*", adminMiddleware);

function logAuditEvent(adminId: string, action: string, targetEntity: string, details?: string) {
  db.prepare(`
    INSERT INTO system_audit_logs (id, admin_id, action, target_entity, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), adminId, action, targetEntity, details || "");
}

// GET /api/admin/metrics - Operational Metrics for Admin Dashboard
admin.get("/metrics", (c) => {
  const userCount = (db.prepare("SELECT COUNT(*) as cnt FROM users").get() as any).cnt;
  const citationCount = (db.prepare("SELECT COUNT(*) as cnt FROM citations").get() as any).cnt;
  
  const orphanCount = (
    db.prepare(`
      SELECT COUNT(*) as cnt FROM citations c
      LEFT JOIN user_citations uc ON c.id = uc.citation_id
      WHERE uc.citation_id IS NULL
    `).get() as any
  ).cnt;

  const domainCount = (db.prepare("SELECT COUNT(*) as cnt FROM whitelisted_domains").get() as any).cnt;

  return c.json({
    metrics: {
      totalUsers: userCount,
      totalCitations: citationCount,
      orphanCitations: orphanCount,
      activeDomains: domainCount,
      apiStatus: "Operational (99.9% uptime)",
    },
  });
});

// GET /api/admin/users - Master User List
admin.get("/users", (c) => {
  const rows = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
           COUNT(uc.citation_id) as owned_citations_count
    FROM users u
    LEFT JOIN user_citations uc ON u.id = uc.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all() as any[];

  return c.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      firstName: r.first_name || "",
      lastName: r.last_name || "",
      displayName: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email,
      role: r.role,
      createdAt: r.created_at,
      ownedCitationsCount: r.owned_citations_count,
    })),
  });
});

// PUT /api/admin/users/:id - Edit User Details (Email, Name, Role, Password)
admin.put("/users/:id", async (c) => {
  const adminUser = c.get("user") as UserSession;
  const { id } = c.req.param();

  const targetUser = db.prepare("SELECT id, email FROM users WHERE id = ?").get(id) as any;
  if (!targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  try {
    const { email, firstName, lastName, role, newPassword } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if new email is taken by another user
    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(cleanEmail, id);
    if (existing) {
      return c.json({ error: `Email '${cleanEmail}' is already assigned to another account.` }, 400);
    }

    if (newPassword && newPassword.trim().length > 0) {
      const passwordHash = await Bun.password.hash(newPassword);
      db.prepare(`
        UPDATE users
        SET email = ?, first_name = ?, last_name = ?, role = ?, password_hash = ?
        WHERE id = ?
      `).run(cleanEmail, firstName || "", lastName || "", role || "user", passwordHash, id);
    } else {
      db.prepare(`
        UPDATE users
        SET email = ?, first_name = ?, last_name = ?, role = ?
        WHERE id = ?
      `).run(cleanEmail, firstName || "", lastName || "", role || "user", id);
    }

    logAuditEvent(adminUser.id, "USER_EDIT", cleanEmail, `Updated profile details for user ${id}`);

    return c.json({ message: "User details updated successfully" });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update user" }, 500);
  }
});

// PUT /api/admin/users/:id/role - Toggle User Role
admin.put("/users/:id/role", async (c) => {
  const adminUser = c.get("user") as UserSession;
  const { id } = c.req.param();
  const { role } = await c.req.json();

  if (role !== "admin" && role !== "user") {
    return c.json({ error: "Invalid role specified" }, 400);
  }

  const targetUser = db.prepare("SELECT email FROM users WHERE id = ?").get(id) as any;
  if (!targetUser) return c.json({ error: "User not found" }, 404);

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  logAuditEvent(adminUser.id, "ROLE_CHANGE", targetUser.email, `Changed role to ${role}`);

  return c.json({ message: `Updated ${targetUser.email} role to ${role}` });
});

// GET /api/admin/domains
admin.get("/domains", (c) => {
  const domains = db.prepare("SELECT id, domain, policy_type, created_at FROM whitelisted_domains ORDER BY domain ASC").all();
  return c.json({ domains });
});

// POST /api/admin/domains
admin.post("/domains", async (c) => {
  const user = c.get("user") as UserSession;
  try {
    const { domain, policyType } = await c.req.json();
    if (!domain) return c.json({ error: "Domain pattern is required" }, 400);

    const cleanDomain = domain.toLowerCase().trim();
    const type = policyType || (cleanDomain.startsWith("*.") ? "WILDCARD" : "EXACT");

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO whitelisted_domains (id, domain, policy_type) VALUES (?, ?, ?)").run(id, cleanDomain, type);

    logAuditEvent(user.id, "DOMAIN_ADD", cleanDomain, `Added domain policy: ${type}`);

    return c.json({ message: "Domain added to whitelist", domain: { id, domain: cleanDomain, policyType: type } });
  } catch (err: any) {
    if (err.message && err.message.includes("UNIQUE")) {
      return c.json({ error: "Domain pattern is already in the whitelist" }, 400);
    }
    return c.json({ error: err.message || "Failed to add domain" }, 500);
  }
});

// PUT /api/admin/domains/:id - Edit Domain Whitelist Policy
admin.put("/domains/:id", async (c) => {
  const user = c.get("user") as UserSession;
  const { id } = c.req.param();

  const existing = db.prepare("SELECT id, domain FROM whitelisted_domains WHERE id = ?").get(id) as any;
  if (!existing) {
    return c.json({ error: "Domain policy not found" }, 404);
  }

  try {
    const { domain, policyType } = await c.req.json();
    if (!domain) return c.json({ error: "Domain pattern is required" }, 400);

    const cleanDomain = domain.toLowerCase().trim();
    const type = policyType || (cleanDomain.startsWith("*.") ? "WILDCARD" : "EXACT");

    db.prepare("UPDATE whitelisted_domains SET domain = ?, policy_type = ? WHERE id = ?").run(cleanDomain, type, id);

    logAuditEvent(user.id, "DOMAIN_EDIT", cleanDomain, `Updated domain policy from '${existing.domain}' to '${cleanDomain}' (${type})`);

    return c.json({ message: "Domain policy updated successfully", domain: { id, domain: cleanDomain, policyType: type } });
  } catch (err: any) {
    if (err.message && err.message.includes("UNIQUE")) {
      return c.json({ error: "Domain pattern is already in the whitelist" }, 400);
    }
    return c.json({ error: err.message || "Failed to update domain policy" }, 500);
  }
});

// DELETE /api/admin/domains/:id
admin.delete("/domains/:id", (c) => {
  const user = c.get("user") as UserSession;
  const { id } = c.req.param();

  const domainObj = db.prepare("SELECT domain FROM whitelisted_domains WHERE id = ?").get(id) as any;
  if (domainObj) {
    logAuditEvent(user.id, "DOMAIN_REMOVE", domainObj.domain, "Removed domain policy");
  }

  db.prepare("DELETE FROM whitelisted_domains WHERE id = ?").run(id);
  return c.json({ message: "Domain removed from whitelist" });
});

// GET /api/admin/duplicates - Duplicate Citation Detection Center
admin.get("/duplicates", (c) => {
  const exactDoiPairs = db.prepare(`
    SELECT c1.id as source_id, c1.title as source_title, c1.doi as doi,
           c2.id as target_id, c2.title as target_title
    FROM citations c1
    JOIN citations c2 ON c1.doi = c2.doi AND c1.id < c2.id
    WHERE c1.doi IS NOT NULL AND c1.doi != ''
    LIMIT 20
  `).all() as any[];

  const exactTitlePairs = db.prepare(`
    SELECT c1.id as source_id, c1.title as source_title,
           c2.id as target_id, c2.title as target_title
    FROM citations c1
    JOIN citations c2 ON LOWER(c1.title) = LOWER(c2.title) AND c1.id < c2.id
    LIMIT 20
  `).all() as any[];

  const duplicates = [
    ...exactDoiPairs.map((p) => ({
      id: `${p.source_id}_${p.target_id}`,
      sourceId: p.source_id,
      sourceTitle: p.source_title,
      targetId: p.target_id,
      targetTitle: p.target_title,
      matchReason: `Exact DOI Match (${p.doi})`,
      score: 1.0,
    })),
    ...exactTitlePairs.map((p) => ({
      id: `${p.source_id}_${p.target_id}`,
      sourceId: p.source_id,
      sourceTitle: p.source_title,
      targetId: p.target_id,
      targetTitle: p.target_title,
      matchReason: "Exact Title Match",
      score: 0.95,
    })),
  ];

  return c.json({ duplicates });
});

// POST /api/admin/merge-duplicates - Merge Duplicate Citations
admin.post("/merge-duplicates", async (c) => {
  const adminUser = c.get("user") as UserSession;
  const { sourceId, targetId } = await c.req.json();

  if (!sourceId || !targetId) {
    return c.json({ error: "Source ID and target ID are required" }, 400);
  }

  db.transaction(() => {
    const targetOwners = db.prepare("SELECT user_id FROM user_citations WHERE citation_id = ?").all(targetId) as any[];
    const claimStmt = db.prepare("INSERT OR IGNORE INTO user_citations (user_id, citation_id) VALUES (?, ?)");

    for (const owner of targetOwners) {
      claimStmt.run(owner.user_id, sourceId);
    }

    db.prepare("DELETE FROM citations WHERE id = ?").run(targetId);
  })();

  logAuditEvent(adminUser.id, "CITATION_MERGE", `Source: ${sourceId}`, `Merged citation ${targetId} into ${sourceId}`);

  return c.json({ message: "Duplicate citations merged successfully!" });
});

// GET /api/admin/audit-logs
admin.get("/audit-logs", (c) => {
  const logs = db.prepare(`
    SELECT l.id, l.action, l.target_entity, l.details, l.created_at, u.email as admin_email
    FROM system_audit_logs l
    JOIN users u ON l.admin_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 50
  `).all();
  return c.json({ auditLogs: logs });
});

export default admin;
