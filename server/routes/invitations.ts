import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type UserSession } from "../middleware";

const invitations = new Hono();
invitations.use("*", authMiddleware);

// POST /api/invitations
invitations.post("/", async (c) => {
  const user = c.get("user") as UserSession;
  const { citationId, invitedEmail } = await c.req.json();

  if (!citationId || !invitedEmail) {
    return c.json({ error: "Citation ID and invited email are required" }, 400);
  }

  const cleanEmail = invitedEmail.toLowerCase().trim();

  // Verify citation exists
  const citation = db.prepare("SELECT id, title FROM citations WHERE id = ?").get(citationId) as any;
  if (!citation) {
    return c.json({ error: "Citation not found" }, 404);
  }

  // Check if invited email is already registered
  const registeredUser = db.prepare("SELECT id, email, first_name, last_name FROM users WHERE email = ?").get(cleanEmail) as any;
  if (registeredUser) {
    // Directly add as co-owner!
    db.prepare("INSERT OR IGNORE INTO user_citations (user_id, citation_id) VALUES (?, ?)").run(registeredUser.id, citationId);
    return c.json({
      message: `User ${cleanEmail} is already registered! Citation linked directly to their profile.`,
      linkedDirectly: true,
      coOwner: {
        id: registeredUser.id,
        email: registeredUser.email,
        name: `${registeredUser.first_name || ""} ${registeredUser.last_name || ""}`.trim() || registeredUser.email,
      },
    });
  }

  // Create pending invitation
  const inviteId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO invitations (id, citation_id, inviter_user_id, invited_email, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(inviteId, citationId, user.id, cleanEmail);

  return c.json({
    message: `Invitation sent to ${cleanEmail}. They will automatically gain ownership of this citation upon signing up!`,
    invitation: {
      id: inviteId,
      citationId,
      invitedEmail: cleanEmail,
      status: "pending",
    },
  });
});

// GET /api/invitations
invitations.get("/", (c) => {
  const user = c.get("user") as UserSession;
  const invites = db.prepare(`
    SELECT i.id, i.citation_id, i.invited_email, i.status, i.created_at, c.title as citation_title
    FROM invitations i
    JOIN citations c ON i.citation_id = c.id
    WHERE i.inviter_user_id = ? OR LOWER(i.invited_email) = ?
    ORDER BY i.created_at DESC
  `).all(user.id, user.email.toLowerCase()) as any[];

  return c.json({ invitations: invites });
});

export default invitations;
