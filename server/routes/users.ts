import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware } from "../middleware";

const users = new Hono();
users.use("*", authMiddleware);

// GET /api/users/search?query=...
users.get("/search", (c) => {
  const query = c.req.query("query") || "";
  const surname = c.req.query("surname") || "";

  let sql = "SELECT id, email, first_name, last_name FROM users WHERE 1=1";
  const params: any[] = [];

  if (surname) {
    sql += " AND (LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?)";
    const sStr = `%${surname.toLowerCase().trim()}%`;
    params.push(sStr, sStr);
  } else if (query) {
    sql += " AND (LOWER(last_name) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(email) LIKE ?)";
    const qStr = `%${query.toLowerCase().trim()}%`;
    params.push(qStr, qStr, qStr);
  }

  sql += " ORDER BY last_name ASC LIMIT 20";

  const rows = db.prepare(sql).all(...params) as any[];

  return c.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      displayName: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
    })),
  });
});

export default users;
