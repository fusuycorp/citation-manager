import { Context, Next } from "hono";
import { createHmac } from "node:crypto";
import { db } from "./db";

export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const JWT_SECRET = "citation_manager_secret_key_2026_antigravity";

export function signToken(payload: UserSession): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): UserSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing token" }, 401);
  }
  const token = authHeader.split(" ")[1];
  const session = verifyToken(token);
  if (!session) {
    return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
  }

  // Refresh user details from DB
  const user = db.prepare("SELECT id, email, first_name, last_name, role FROM users WHERE id = ?").get(session.id) as any;
  if (!user) {
    return c.json({ error: "Unauthorized: User not found" }, 401);
  }

  c.set("user", {
    id: user.id,
    email: user.email,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    role: user.role,
  });

  await next();
}

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get("user") as UserSession;
  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden: Admin privileges required" }, 403);
  }
  await next();
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const session = verifyToken(token);
    if (session) {
      const user = db.prepare("SELECT id, email, first_name, last_name, role FROM users WHERE id = ?").get(session.id) as any;
      if (user) {
        c.set("user", {
          id: user.id,
          email: user.email,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          role: user.role,
        });
      }
    }
  }
  await next();
}
