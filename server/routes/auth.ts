import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, signToken, type UserSession } from "../middleware";

const auth = new Hono();

// Helper to check domain whitelist with EXACT and WILDCARD pattern support
export function isDomainWhitelisted(email: string): boolean {
  if (!email.includes("@")) return false;
  const domain = email.split("@")[1].toLowerCase().trim();

  const rows = db.prepare("SELECT domain, policy_type FROM whitelisted_domains").all() as any[];

  for (const row of rows) {
    const pattern = row.domain.toLowerCase().trim();
    const type = row.policy_type || "EXACT";

    if (type === "EXACT" && domain === pattern) {
      return true;
    }
    if (type === "WILDCARD" || pattern.startsWith("*.")) {
      const suffix = pattern.replace(/^\*\./, "");
      if (domain.endsWith(suffix) || domain === suffix) {
        return true;
      }
    }
  }

  return false;
}

// POST /api/auth/register
auth.post("/register", async (c) => {
  try {
    const { email, password, firstName, lastName } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Enforce Whitelist Check
    if (!isDomainWhitelisted(cleanEmail)) {
      return c.json(
        {
          error: `Registration restricted. Domain '@${cleanEmail.split("@")[1]}' is not in the active whitelist.`,
        },
        403
      );
    }

    // Check if user already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (existing) {
      return c.json({ error: "An account with this email address already exists" }, 400);
    }

    const passwordHash = await Bun.password.hash(password);
    const userId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, first_name, last_name, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `).run(userId, cleanEmail, firstName || "", lastName || "", passwordHash);

    // Auto-claim any pending invitations for this email
    const pendingInvites = db.prepare("SELECT id, citation_id FROM invitations WHERE LOWER(invited_email) = ? AND status = 'pending'").all(cleanEmail) as any[];

    let autoClaimedCount = 0;
    if (pendingInvites.length > 0) {
      const claimStmt = db.prepare("INSERT OR IGNORE INTO user_citations (user_id, citation_id) VALUES (?, ?)");
      const updateInviteStmt = db.prepare("UPDATE invitations SET status = 'accepted' WHERE id = ?");

      db.transaction(() => {
        for (const inv of pendingInvites) {
          claimStmt.run(userId, inv.citation_id);
          updateInviteStmt.run(inv.id);
          autoClaimedCount++;
        }
      })();
    }

    const session: UserSession = {
      id: userId,
      email: cleanEmail,
      firstName: firstName || "",
      lastName: lastName || "",
      role: "user",
    };

    const token = signToken(session);

    return c.json({
      message: "Registration successful",
      user: session,
      token,
      autoClaimedCount,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return c.json({ error: err.message || "Registration failed" }, 500);
  }
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = db.prepare("SELECT id, email, first_name, last_name, password_hash, role FROM users WHERE email = ?").get(cleanEmail) as any;

    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const isValid = await Bun.password.verify(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const session: UserSession = {
      id: user.id,
      email: user.email,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      role: user.role,
    };

    const token = signToken(session);

    return c.json({
      message: "Login successful",
      user: session,
      token,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Login failed" }, 500);
  }
});

// GET /api/auth/me
auth.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// PUT /api/auth/profile - Update User Profile Name
auth.put("/profile", authMiddleware, async (c) => {
  const userSession = c.get("user") as UserSession;
  try {
    const { firstName, lastName } = await c.req.json();
    db.prepare("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?").run(
      firstName || "",
      lastName || "",
      userSession.id
    );

    return c.json({
      message: "Profile updated successfully",
      user: {
        ...userSession,
        firstName: firstName || "",
        lastName: lastName || "",
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update profile" }, 500);
  }
});

// PUT /api/auth/change-password - Password Change Handler
auth.put("/change-password", authMiddleware, async (c) => {
  const userSession = c.get("user") as UserSession;
  try {
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: "Current password and new password are required" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "New password must be at least 6 characters long" }, 400);
    }

    const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userSession.id) as any;
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const isValid = await Bun.password.verify(currentPassword, user.password_hash);
    if (!isValid) {
      return c.json({ error: "Current password entered is incorrect" }, 400);
    }

    const newHash = await Bun.password.hash(newPassword);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userSession.id);

    return c.json({ message: "Password updated successfully!" });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to change password" }, 500);
  }
});

export default auth;
