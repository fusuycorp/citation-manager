import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import app from "../index";
import { db, resetDB } from "../db";
import { calculateHIndex } from "../routes/metrics";
import { signToken, verifyToken, type UserSession } from "../middleware";

// ============================================================================
// Test Fixture Helpers (Isolated per-test execution with no shared state)
// ============================================================================

interface RegisterResult {
  status: number;
  body: any;
  token: string;
  user: UserSession;
}

async function registerTestUser(
  email: string = `user.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@bogazici.edu.tr`,
  password: string = "password123",
  firstName: string = "Test",
  lastName: string = "User"
): Promise<RegisterResult> {
  const res = await app.fetch(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
    })
  );
  const body = await res.json();
  return { status: res.status, body, token: body.token, user: body.user };
}

async function loginAdmin(): Promise<{ status: number; body: any; token: string; user: UserSession }> {
  const res = await app.fetch(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bogazici.edu.tr", password: "password123" }),
    })
  );
  const body = await res.json();
  return { status: res.status, body, token: body.token, user: body.user };
}

async function createTestCitation(
  token: string,
  data: Partial<{
    title: string;
    authors: Array<{ firstName?: string; lastName: string }>;
    year: number;
    journalOrPublisher: string;
    volume: string;
    issue: string;
    pages: string;
    doi: string;
    url: string;
    pubType: string;
    abstract: string;
  }> = {}
): Promise<{ status: number; body: any; citationId: string }> {
  const res = await app.fetch(
    new Request("http://localhost/api/citations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: data.title || "Quantum Information Processing and Machine Learning",
        authors: data.authors || [
          { firstName: "Alice", lastName: "Smith" },
          { firstName: "Bob", lastName: "Jones" },
        ],
        year: data.year ?? 2025,
        journalOrPublisher: data.journalOrPublisher || "ACM Transactions on Quantum Computing",
        volume: data.volume || "12",
        issue: data.issue || "3",
        pages: data.pages || "101-118",
        doi: data.doi || "10.1145/3600001",
        url: data.url || "https://doi.org/10.1145/3600001",
        pubType: data.pubType || "article",
        abstract: data.abstract || "This paper analyzes quantum algorithms.",
        ...data,
      }),
    })
  );
  const body = await res.json();
  return { status: res.status, body, citationId: body.citationId };
}

function insertDirectCitation(data: {
  id?: string;
  title: string;
  authors: Array<{ firstName?: string; lastName: string }>;
  year?: number;
  journalOrPublisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  pubType?: string;
  abstract?: string;
}): string {
  const citationId = data.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO citations (id, title, authors, year, journal_or_publisher, volume, issue, pages, doi, url, pub_type, abstract)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    citationId,
    data.title,
    JSON.stringify(data.authors),
    data.year ?? null,
    data.journalOrPublisher || null,
    data.volume || null,
    data.issue || null,
    data.pages || null,
    data.doi || null,
    data.url || null,
    data.pubType || "article",
    data.abstract || null
  );
  return citationId;
}

// ============================================================================
// Integration Test Suite
// ============================================================================

describe("CiteSphere Backend Integration Test Suite", () => {
  beforeEach(() => {
    resetDB();
  });

  // --------------------------------------------------------------------------
  // 1. Health Check & Core Infrastructure
  // --------------------------------------------------------------------------
  describe("Health & Core Infrastructure", () => {
    test("GET /api/health returns operational status with runtime info", async () => {
      const res = await app.fetch(new Request("http://localhost/api/health"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.runtime).toBe("Bun");
      expect(typeof body.timestamp).toBe("string");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Authentication & Domain Whitelisting
  // --------------------------------------------------------------------------
  describe("Authentication & Domain Whitelist Policies", () => {
    test("Registration fails with 403 for non-whitelisted domain", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "unauthorized@untrusted-domain.org",
            password: "password123",
            firstName: "Hacker",
            lastName: "One",
          }),
        })
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toEqual({
        error: "Registration restricted. Domain '@untrusted-domain.org' is not in the active whitelist.",
      });
    });

    test("Registration fails with 403 for domain whitelist suffix bypass attempts", async () => {
      const bypassAttempts = [
        "attacker@evilbogazici.edu.tr",
        "attacker@fakeac.uk",
        "attacker@bogazici.edu.tr.evil.com",
        "attacker@notgmail.com",
      ];

      for (const email of bypassAttempts) {
        const res = await app.fetch(
          new Request("http://localhost/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "password123" }),
          })
        );
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain("is not in the active whitelist");
      }
    });

    test("Registration succeeds for wildcard domain policy (*.ac.uk)", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "stephen.hawking@oxford.ac.uk",
            password: "password123",
            firstName: "Stephen",
            lastName: "Hawking",
          }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Registration successful");
      expect(typeof body.token).toBe("string");
      expect(body.token.length).toBeGreaterThan(30);
      expect(body.user).toMatchObject({
        email: "stephen.hawking@oxford.ac.uk",
        firstName: "Stephen",
        lastName: "Hawking",
        role: "user",
      });
      expect(body.autoClaimedCount).toBe(0);
    });

    test("Registration succeeds for exact whitelist domain (@bogazici.edu.tr)", async () => {
      const res = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "mehmet.aydin@bogazici.edu.tr",
            password: "password123",
            firstName: "Mehmet",
            lastName: "Aydin",
          }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Registration successful");
      expect(typeof body.token).toBe("string");
      expect(body.token.length).toBeGreaterThan(30);
      expect(body.user).toMatchObject({
        email: "mehmet.aydin@bogazici.edu.tr",
        firstName: "Mehmet",
        lastName: "Aydin",
        role: "user",
      });
      expect(typeof body.user.id).toBe("string");
    });

    test("Registration fails with 400 when registering with an existing email", async () => {
      await registerTestUser("duplicate@bogazici.edu.tr", "password123");

      const res = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "duplicate@bogazici.edu.tr",
            password: "anotherpassword",
          }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "An account with this email address already exists" });
    });

    test("Registration fails with 400 when email or password is missing", async () => {
      const res1 = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@bogazici.edu.tr" }),
        })
      );
      expect(res1.status).toBe(400);
      const body1 = await res1.json();
      expect(body1).toEqual({ error: "Email and password are required" });

      const res2 = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "password123" }),
        })
      );
      expect(res2.status).toBe(400);
    });

    test("Login succeeds with valid credentials and returns JWT session", async () => {
      await registerTestUser("login.test@bogazici.edu.tr", "password123", "Login", "User");

      const res = await app.fetch(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "login.test@bogazici.edu.tr", password: "password123" }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Login successful");
      expect(typeof body.token).toBe("string");
      expect(body.token.length).toBeGreaterThan(30);
      expect(body.user).toMatchObject({
        email: "login.test@bogazici.edu.tr",
        firstName: "Login",
        lastName: "User",
        role: "user",
      });
    });

    test("Login fails with 401 for incorrect password or non-existent email", async () => {
      await registerTestUser("valid.user@bogazici.edu.tr", "correctpassword");

      const resWrongPass = await app.fetch(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "valid.user@bogazici.edu.tr", password: "wrongpassword" }),
        })
      );
      expect(resWrongPass.status).toBe(401);
      expect(await resWrongPass.json()).toEqual({ error: "Invalid email or password" });

      const resNonExistent = await app.fetch(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "nonexistent@bogazici.edu.tr", password: "password123" }),
        })
      );
      expect(resNonExistent.status).toBe(401);
      expect(await resNonExistent.json()).toEqual({ error: "Invalid email or password" });
    });

    test("GET /api/auth/me returns authenticated user session or 401 if unauthenticated", async () => {
      const { token, user } = await registerTestUser("me.test@bogazici.edu.tr");

      const authRes = await app.fetch(
        new Request("http://localhost/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(authRes.status).toBe(200);
      const authBody = await authRes.json();
      expect(authBody.user).toMatchObject({
        id: user.id,
        email: "me.test@bogazici.edu.tr",
        role: "user",
      });

      const unauthRes = await app.fetch(new Request("http://localhost/api/auth/me"));
      expect(unauthRes.status).toBe(401);
      expect(await unauthRes.json()).toEqual({ error: "Unauthorized: Missing token" });
    });

    test("JWT timing-safe verification and signature tampering protection", () => {
      const validToken = signToken({
        id: "test-user-1",
        email: "test@bogazici.edu.tr",
        firstName: "Test",
        lastName: "User",
        role: "user",
      });
      expect(verifyToken(validToken)).not.toBeNull();

      // Tampered payload
      const parts = validToken.split(".");
      const tamperedPayload = Buffer.from(JSON.stringify({ id: "admin-id", role: "admin" })).toString("base64url");
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      expect(verifyToken(tamperedToken)).toBeNull();

      // Tampered signature
      const invalidSigToken = `${parts[0]}.${parts[1]}.invalidSignatureHere`;
      expect(verifyToken(invalidSigToken)).toBeNull();

      // Malformed token
      expect(verifyToken("invalid.token")).toBeNull();
      expect(verifyToken("")).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 3. User Profile & Password Management
  // --------------------------------------------------------------------------
  describe("User Profile & Password Management", () => {
    test("User profile name update (PUT /api/auth/profile)", async () => {
      const { token } = await registerTestUser("profile.user@bogazici.edu.tr", "password123", "InitialFirst", "InitialLast");

      const res = await app.fetch(
        new Request("http://localhost/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ firstName: "UpdatedFirst", lastName: "UpdatedLast" }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        message: "Profile updated successfully",
        user: {
          firstName: "UpdatedFirst",
          lastName: "UpdatedLast",
        },
      });
    });

    test("User password change and subsequent re-authentication (PUT /api/auth/change-password)", async () => {
      const { token } = await registerTestUser("password.change@bogazici.edu.tr", "initialPassword123");

      // Change password
      const changeRes = await app.fetch(
        new Request("http://localhost/api/auth/change-password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: "initialPassword123",
            newPassword: "newSecurePassword456",
          }),
        })
      );
      expect(changeRes.status).toBe(200);
      expect(await changeRes.json()).toEqual({ message: "Password updated successfully!" });

      // Verify login with new password succeeds
      const loginNew = await app.fetch(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "password.change@bogazici.edu.tr",
            password: "newSecurePassword456",
          }),
        })
      );
      expect(loginNew.status).toBe(200);

      // Verify login with old password fails
      const loginOld = await app.fetch(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "password.change@bogazici.edu.tr",
            password: "initialPassword123",
          }),
        })
      );
      expect(loginOld.status).toBe(401);
    });

    test("Password change validation for length and incorrect current password", async () => {
      const { token } = await registerTestUser("pw.valid@bogazici.edu.tr", "validPassword123");

      // Short password (<6 chars)
      const shortRes = await app.fetch(
        new Request("http://localhost/api/auth/change-password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: "validPassword123",
            newPassword: "123",
          }),
        })
      );
      expect(shortRes.status).toBe(400);
      expect(await shortRes.json()).toEqual({ error: "New password must be at least 6 characters long" });

      // Incorrect current password
      const wrongCurrentRes = await app.fetch(
        new Request("http://localhost/api/auth/change-password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: "wrongCurrentPassword",
            newPassword: "newValidPassword456",
          }),
        })
      );
      expect(wrongCurrentRes.status).toBe(400);
      expect(await wrongCurrentRes.json()).toEqual({ error: "Current password entered is incorrect" });
    });
  });

  // --------------------------------------------------------------------------
  // 4. Citation Lifecycle, CRUD & Ownership State Machine
  // --------------------------------------------------------------------------
  describe("Citation Lifecycle & Ownership State Machine", () => {
    test("User creates a new citation and automatically gains ownership", async () => {
      const { token, user } = await registerTestUser("cit.creator@bogazici.edu.tr");
      const createRes = await createTestCitation(token, {
        title: "Deep Reinforcement Learning for Autonomous Navigation",
        year: 2025,
        journalOrPublisher: "IEEE Transactions on Robotics",
      });

      expect(createRes.status).toBe(200);
      expect(createRes.body.success).toBe(true);
      expect(typeof createRes.body.citationId).toBe("string");
      expect(createRes.body.citationId.length).toBeGreaterThan(10);

      // Verify ownership in DB
      const ownership = db
        .prepare("SELECT * FROM user_citations WHERE user_id = ? AND citation_id = ?")
        .get(user.id, createRes.citationId);
      expect(ownership).not.toBeNull();
    });

    test("Citation creation validation requires title", async () => {
      const { token } = await registerTestUser("cit.fail@bogazici.edu.tr");
      const res = await app.fetch(
        new Request("http://localhost/api/citations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: "   " }),
        })
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Paper title is required" });
    });

    test("GET /api/citations/:id retrieves complete citation with rendered formats", async () => {
      const { token } = await registerTestUser("cit.reader@bogazici.edu.tr");
      const { citationId } = await createTestCitation(token, {
        title: "Exploring ISIS' Takfir Discourse: BERT Sentiment Analysis",
        authors: [{ firstName: "Reza", lastName: "Dehkharghani" }],
        year: 2025,
        journalOrPublisher: "SN Computer Science",
        doi: "10.1007/s42979-024-03500-1",
      });

      const res = await app.fetch(
        new Request(`http://localhost/api/citations/${citationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.citation.id).toBe(citationId);
      expect(body.citation.title).toBe("Exploring ISIS' Takfir Discourse: BERT Sentiment Analysis");
      expect(body.citation.year).toBe(2025);
      expect(body.citation.isOwner).toBe(true);
      expect(typeof body.citation.formats.APA7.referenceText).toBe("string");
      expect(body.citation.formats.APA7.referenceText).toContain("Dehkharghani, R.");
      expect(typeof body.citation.formats.IEEE.referenceText).toBe("string");
      expect(typeof body.citation.formats.BibTeX.referenceText).toBe("string");
    });

    test("GET /api/citations/:id returns 404 for non-existent citation", async () => {
      const res = await app.fetch(new Request("http://localhost/api/citations/non-existent-id"));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Citation not found" });
    });

    test("Owner can edit citation (PUT /api/citations/:id)", async () => {
      const { token } = await registerTestUser("cit.editor@bogazici.edu.tr");
      const { citationId } = await createTestCitation(token, { title: "Original Title", year: 2024 });

      const editRes = await app.fetch(
        new Request(`http://localhost/api/citations/${citationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Updated Edition Title",
            year: 2025,
            authors: [{ firstName: "John", lastName: "Doe" }],
          }),
        })
      );
      expect(editRes.status).toBe(200);
      expect(await editRes.json()).toEqual({ success: true });

      // Verify updated record
      const updated = db.prepare("SELECT title, year FROM citations WHERE id = ?").get(citationId) as any;
      expect(updated.title).toBe("Updated Edition Title");
      expect(updated.year).toBe(2025);
    });

    test("Non-owner CANNOT edit citation without admin role (403 Forbidden)", async () => {
      const user1 = await registerTestUser("user1.owner@bogazici.edu.tr");
      const user2 = await registerTestUser("user2.intruder@bogazici.edu.tr");

      const { citationId } = await createTestCitation(user1.token, { title: "User 1 Paper" });

      const editRes = await app.fetch(
        new Request(`http://localhost/api/citations/${citationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user2.token}`,
          },
          body: JSON.stringify({ title: "Hacked Paper Title" }),
        })
      );
      expect(editRes.status).toBe(403);
      expect(await editRes.json()).toEqual({ error: "Forbidden: You are not an owner of this citation" });
    });

    test("Admin CAN edit citation even if not an owner (200 OK)", async () => {
      const user = await registerTestUser("regular.author@bogazici.edu.tr");
      const admin = await loginAdmin();

      const { citationId } = await createTestCitation(user.token, { title: "User Paper to Moderate" });

      const editRes = await app.fetch(
        new Request(`http://localhost/api/citations/${citationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ title: "Moderated Paper Title by Admin" }),
        })
      );
      expect(editRes.status).toBe(200);
      expect(await editRes.json()).toEqual({ success: true });
    });

    test("Claiming unowned citation succeeds; IDOR prevention blocks claiming owned citations", async () => {
      const unownedId = insertDirectCitation({
        title: "Orphaned Quantum Paper",
        authors: [{ firstName: "Alice", lastName: "Smith" }],
        year: 2025,
      });

      const user1 = await registerTestUser("claim.user1@bogazici.edu.tr");
      const user2 = await registerTestUser("claim.user2@bogazici.edu.tr");

      // User 1 claims unowned citation -> 200 OK
      const claim1 = await app.fetch(
        new Request(`http://localhost/api/citations/${unownedId}/claim`, {
          method: "POST",
          headers: { Authorization: `Bearer ${user1.token}` },
        })
      );
      expect(claim1.status).toBe(200);
      expect(await claim1.json()).toEqual({ success: true, message: "Citation claimed successfully" });

      // User 2 attempts IDOR claim on now-owned citation -> 403 Forbidden
      const claim2 = await app.fetch(
        new Request(`http://localhost/api/citations/${unownedId}/claim`, {
          method: "POST",
          headers: { Authorization: `Bearer ${user2.token}` },
        })
      );
      expect(claim2.status).toBe(403);
      expect(await claim2.json()).toEqual({ error: "Forbidden: Citation is already owned by another user" });

      // User 1 unlinks citation -> transitions to unowned state
      const unlink = await app.fetch(
        new Request(`http://localhost/api/citations/${unownedId}/ownership`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user1.token}` },
        })
      );
      expect(unlink.status).toBe(200);
      expect(await unlink.json()).toEqual({ success: true, isNowUnowned: true });

      // User 2 can now claim the unowned citation -> 200 OK
      const claim3 = await app.fetch(
        new Request(`http://localhost/api/citations/${unownedId}/claim`, {
          method: "POST",
          headers: { Authorization: `Bearer ${user2.token}` },
        })
      );
      expect(claim3.status).toBe(200);
      expect(await claim3.json()).toEqual({ success: true, message: "Citation claimed successfully" });
    });
  });

  // --------------------------------------------------------------------------
  // 5. Multi-Facet Filtering, Scoping & Pagination
  // --------------------------------------------------------------------------
  describe("Multi-Facet Filtering, Scoping & Pagination", () => {
    test("Multi-facet filtering by author, year range, journal, pubType, search keyword and sorting", async () => {
      const user = await registerTestUser("search.user@bogazici.edu.tr");

      await createTestCitation(user.token, {
        title: "Quantum Algorithms for Financial Portfolio Optimization",
        authors: [{ firstName: "Mehmet Nuri", lastName: "Aydin" }],
        year: 2025,
        journalOrPublisher: "Applied Sciences",
        pubType: "article",
      });

      await createTestCitation(user.token, {
        title: "Takfir Discourse Entity-Level Sentiment Analysis",
        authors: [{ firstName: "Reza", lastName: "Dehkharghani" }],
        year: 2024,
        journalOrPublisher: "SN Computer Science",
        pubType: "article",
      });

      // Filter by Author & Journal
      const filterRes = await app.fetch(
        new Request("http://localhost/api/citations?author=Aydin&journal=Applied%20Sciences&sortBy=year&sortOrder=DESC", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(filterRes.status).toBe(200);
      const filterBody = await filterRes.json();
      expect(filterBody.citations.length).toBe(1);
      expect(filterBody.citations[0].title).toContain("Quantum Algorithms");
      expect(filterBody.citations[0].isOwner).toBe(true);

      // Search keyword query
      const searchRes = await app.fetch(
        new Request("http://localhost/api/citations?search=sentiment", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(searchRes.status).toBe(200);
      const searchBody = await searchRes.json();
      expect(searchBody.citations.length).toBe(1);
      expect(searchBody.citations[0].title).toContain("Sentiment Analysis");

      // Scope filtering (my vs unowned)
      insertDirectCitation({
        title: "Unowned Orphan Paper",
        authors: [{ firstName: "Anonymous", lastName: "Author" }],
        year: 2023,
      });

      const scopeMyRes = await app.fetch(
        new Request("http://localhost/api/citations?scope=my", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(scopeMyRes.status).toBe(200);
      const scopeMyBody = await scopeMyRes.json();
      expect(scopeMyBody.citations.length).toBe(2);
      expect(scopeMyBody.scopeCounts).toMatchObject({
        my: 2,
        unowned: 1,
        all: 3,
      });

      const scopeUnownedRes = await app.fetch(
        new Request("http://localhost/api/citations?scope=unowned", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(scopeUnownedRes.status).toBe(200);
      const scopeUnownedBody = await scopeUnownedRes.json();
      expect(scopeUnownedBody.citations.length).toBe(1);
      expect(scopeUnownedBody.citations[0].title).toBe("Unowned Orphan Paper");
    });
  });

  // --------------------------------------------------------------------------
  // 6. Profiles & Directory Resolution
  // --------------------------------------------------------------------------
  describe("Profiles & Directory Resolution", () => {
    test("Registered user profile resolution (GET /api/profiles/:userId)", async () => {
      const user = await registerTestUser("profile.author@bogazici.edu.tr", "password123", "Asli", "Sencer");
      await createTestCitation(user.token, {
        title: "Supply Chain Risk Management in Healthcare",
        authors: [
          { firstName: "Asli", lastName: "Sencer" },
          { firstName: "Co", lastName: "Author" },
        ],
        year: 2025,
      });

      const res = await app.fetch(
        new Request(`http://localhost/api/profiles/${user.user.id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.type).toBe("user");
      expect(body.profile.id).toBe(user.user.id);
      expect(body.profile.email).toBe("profile.author@bogazici.edu.tr");
      expect(body.profile.name).toBe("Asli Sencer");
      expect(body.profile.paperCount).toBe(1);
      expect(body.profile.coAuthors).toContain("Author, Co");
      expect(Array.isArray(body.citations)).toBe(true);
      expect(body.citations.length).toBe(1);
    });

    test("Directory external author profile resolution (GET /api/profiles/:authorName)", async () => {
      insertDirectCitation({
        title: "Quantum Thermodynamics Principles",
        authors: [
          { firstName: "Alice", lastName: "Smith" },
          { firstName: "Bob", lastName: "Jones" },
        ],
        year: 2024,
      });

      const res = await app.fetch(new Request("http://localhost/api/profiles/Alice%20Smith"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.type).toBe("author");
      expect(body.profile.name).toBe("Alice Smith");
      expect(body.profile.paperCount).toBe(1);
      expect(body.profile.isRegisteredUser).toBe(false);
      expect(body.profile.coAuthors).toContain("Jones, Bob");
      expect(Array.isArray(body.citations)).toBe(true);
      expect(body.citations.length).toBe(1);
    });

    test("Profile search and user search endpoints", async () => {
      const user = await registerTestUser("aydin.profile@bogazici.edu.tr", "password123", "Mehmet Nuri", "Aydin");
      insertDirectCitation({
        title: "Distributed Ledger Architecture",
        authors: [{ firstName: "Nafiz", lastName: "Aydin" }],
        year: 2025,
      });

      // Profiles Search
      const searchRes = await app.fetch(new Request("http://localhost/api/profiles/search?q=Aydin"));
      expect(searchRes.status).toBe(200);
      const searchBody = await searchRes.json();
      expect(searchBody.results.length).toBeGreaterThanOrEqual(1);

      // Users Search
      const usersSearchRes = await app.fetch(
        new Request("http://localhost/api/users/search?surname=Aydin", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(usersSearchRes.status).toBe(200);
      const usersSearchBody = await usersSearchRes.json();
      expect(usersSearchBody.users.length).toBe(1);
      expect(usersSearchBody.users[0].email).toBe("aydin.profile@bogazici.edu.tr");
    });
  });

  // --------------------------------------------------------------------------
  // 7. User Preferences & Metrics
  // --------------------------------------------------------------------------
  describe("User Preferences & Analytics Metrics", () => {
    test("User preferences default view_density = 'compact' and update behavior", async () => {
      const user = await registerTestUser("prefs.user@bogazici.edu.tr");

      // GET defaults
      const getRes = await app.fetch(
        new Request("http://localhost/api/preferences", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.preferences).toMatchObject({
        defaultCslStyle: "APA7",
        defaultInTextMode: "parenthetical",
        viewDensity: "compact",
        defaultExportFormat: "BibTeX",
        exportIncludeAbstract: true,
      });

      // PUT updates
      const putRes = await app.fetch(
        new Request("http://localhost/api/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            defaultCslStyle: "IEEE",
            defaultInTextMode: "narrative",
            viewDensity: "card",
            defaultExportFormat: "RIS",
            exportIncludeAbstract: false,
          }),
        })
      );
      expect(putRes.status).toBe(200);
      expect(await putRes.json()).toEqual({ message: "Preferences saved successfully" });

      // Verify persisted updates
      const getUpdatedRes = await app.fetch(
        new Request("http://localhost/api/preferences", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      const getUpdatedBody = await getUpdatedRes.json();
      expect(getUpdatedBody.preferences).toMatchObject({
        defaultCslStyle: "IEEE",
        defaultInTextMode: "narrative",
        viewDensity: "card",
        defaultExportFormat: "RIS",
        exportIncludeAbstract: false,
      });
    });

    test("GET /api/metrics/user calculates publication count and simulated h-index", async () => {
      const user = await registerTestUser("metrics.user@bogazici.edu.tr");
      await createTestCitation(user.token, { title: "Paper 1", year: 2022 });
      await createTestCitation(user.token, { title: "Paper 2", year: 2024 });
      await createTestCitation(user.token, { title: "Paper 3", year: 2025 });

      const res = await app.fetch(
        new Request("http://localhost/api/metrics/user", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics).toMatchObject({
        totalPublications: 3,
        totalCitations: expect.any(Number),
        hIndex: expect.any(Number),
        i10Index: expect.any(Number),
        yearHistogram: expect.arrayContaining([
          expect.objectContaining({ year: "2022", count: 1 }),
          expect.objectContaining({ year: "2024", count: 1 }),
          expect.objectContaining({ year: "2025", count: 1 }),
        ]),
      });
    });

    test("h-index math algorithm accuracy", () => {
      expect(calculateHIndex([10, 8, 5, 4, 3])).toBe(4);
      expect(calculateHIndex([25, 12, 3, 1, 0])).toBe(3);
      expect(calculateHIndex([1, 1, 1])).toBe(1);
      expect(calculateHIndex([0, 0, 0])).toBe(0);
      expect(calculateHIndex([])).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Admin Capabilities & Auditing
  // --------------------------------------------------------------------------
  describe("Admin Capabilities & Auditing", () => {
    test("GET /api/admin/metrics returns system-wide metrics", async () => {
      const admin = await loginAdmin();
      await registerTestUser("regular.user@bogazici.edu.tr");

      const res = await app.fetch(
        new Request("http://localhost/api/admin/metrics", {
          headers: { Authorization: `Bearer ${admin.token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics).toMatchObject({
        totalUsers: 2, // default admin + registered user
        totalCitations: 0,
        orphanCitations: 0,
        activeDomains: 3,
        apiStatus: "Operational (99.9% uptime)",
      });
    });

    test("GET /api/admin/users lists all users and PUT /api/admin/users/:id edits user details", async () => {
      const admin = await loginAdmin();
      const user = await registerTestUser("target.user@bogazici.edu.tr", "password123", "Target", "User");

      // GET users list
      const listRes = await app.fetch(
        new Request("http://localhost/api/admin/users", {
          headers: { Authorization: `Bearer ${admin.token}` },
        })
      );
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(listBody.users.length).toBe(2);

      // PUT edit user
      const editRes = await app.fetch(
        new Request(`http://localhost/api/admin/users/${user.user.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({
            email: "target.updated@bogazici.edu.tr",
            firstName: "TargetMaster",
            lastName: "UserEdited",
            role: "user",
          }),
        })
      );
      expect(editRes.status).toBe(200);
      expect(await editRes.json()).toEqual({ message: "User details updated successfully" });

      // Verify in DB
      const updated = db.prepare("SELECT email, first_name FROM users WHERE id = ?").get(user.user.id) as any;
      expect(updated.email).toBe("target.updated@bogazici.edu.tr");
      expect(updated.first_name).toBe("TargetMaster");
    });

    test("PUT /api/admin/users/:id/role modifies user role with validation", async () => {
      const admin = await loginAdmin();
      const user = await registerTestUser("role.target@bogazici.edu.tr");

      // Promote to admin
      const promoteRes = await app.fetch(
        new Request(`http://localhost/api/admin/users/${user.user.id}/role`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ role: "admin" }),
        })
      );
      expect(promoteRes.status).toBe(200);

      const promotedUser = db.prepare("SELECT role FROM users WHERE id = ?").get(user.user.id) as any;
      expect(promotedUser.role).toBe("admin");

      // Invalid role rejected
      const invalidRes = await app.fetch(
        new Request(`http://localhost/api/admin/users/${user.user.id}/role`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ role: "superadmin" }),
        })
      );
      expect(invalidRes.status).toBe(400);
      expect(await invalidRes.json()).toEqual({ error: "Invalid role specified" });
    });

    test("Admin Whitelisted Domain Policy CRUD & Audit Trail (GET, POST, PUT, DELETE /api/admin/domains)", async () => {
      const admin = await loginAdmin();

      // POST create domain policy
      const postRes = await app.fetch(
        new Request("http://localhost/api/admin/domains", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ domain: "stanford.edu", policyType: "EXACT" }),
        })
      );
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.domain).toMatchObject({
        domain: "stanford.edu",
        policyType: "EXACT",
      });
      const domainId = postBody.domain.id;

      // Duplicate domain policy rejected
      const dupRes = await app.fetch(
        new Request("http://localhost/api/admin/domains", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ domain: "stanford.edu" }),
        })
      );
      expect(dupRes.status).toBe(400);
      expect(await dupRes.json()).toEqual({ error: "Domain pattern is already in the whitelist" });

      // PUT edit domain policy
      const putRes = await app.fetch(
        new Request(`http://localhost/api/admin/domains/${domainId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ domain: "*.stanford.edu", policyType: "WILDCARD" }),
        })
      );
      expect(putRes.status).toBe(200);
      const putBody = await putRes.json();
      expect(putBody.domain.policyType).toBe("WILDCARD");

      // DELETE domain policy
      const delRes = await app.fetch(
        new Request(`http://localhost/api/admin/domains/${domainId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${admin.token}` },
        })
      );
      expect(delRes.status).toBe(200);
      expect(await delRes.json()).toEqual({ message: "Domain removed from whitelist" });

      // Verify Audit Trail (GET /api/admin/audit-logs)
      const auditRes = await app.fetch(
        new Request("http://localhost/api/admin/audit-logs", {
          headers: { Authorization: `Bearer ${admin.token}` },
        })
      );
      expect(auditRes.status).toBe(200);
      const auditBody = await auditRes.json();
      expect(auditBody.auditLogs.length).toBeGreaterThanOrEqual(3);
      const actions = auditBody.auditLogs.map((l: any) => l.action);
      expect(actions).toContain("DOMAIN_ADD");
      expect(actions).toContain("DOMAIN_EDIT");
      expect(actions).toContain("DOMAIN_REMOVE");
    });
  });

  // --------------------------------------------------------------------------
  // 9. Negative RBAC Enforcement Testing (Task 3)
  // --------------------------------------------------------------------------
  describe("Negative RBAC Enforcement (Non-Admins Receive 403 / Unauth 401)", () => {
    test("Non-admin user (role: 'user') is strictly forbidden (403) from all /api/admin/* endpoints", async () => {
      const nonAdmin = await registerTestUser("regular.rbac.user@bogazici.edu.tr");

      const testCases = [
        { method: "GET", path: "/api/admin/metrics" },
        { method: "GET", path: "/api/admin/users" },
        { method: "PUT", path: `/api/admin/users/${nonAdmin.user.id}`, body: { email: "test@bogazici.edu.tr" } },
        { method: "PUT", path: `/api/admin/users/${nonAdmin.user.id}/role`, body: { role: "admin" } },
        { method: "GET", path: "/api/admin/domains" },
        { method: "POST", path: "/api/admin/domains", body: { domain: "hacked.edu" } },
        { method: "PUT", path: "/api/admin/domains/domain-1", body: { domain: "hacked.edu" } },
        { method: "DELETE", path: "/api/admin/domains/domain-1" },
        { method: "GET", path: "/api/admin/duplicates" },
        { method: "POST", path: "/api/admin/merge-duplicates", body: { sourceId: "c1", targetId: "c2" } },
        { method: "GET", path: "/api/admin/audit-logs" },
      ];

      for (const tc of testCases) {
        const res = await app.fetch(
          new Request(`http://localhost${tc.path}`, {
            method: tc.method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${nonAdmin.token}`,
            },
            body: tc.body ? JSON.stringify(tc.body) : undefined,
          })
        );
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body).toEqual({ error: "Forbidden: Admin privileges required" });
      }
    });

    test("Unauthenticated requests receive 401 Unauthorized across protected endpoints", async () => {
      const endpoints = [
        { method: "GET", path: "/api/admin/metrics" },
        { method: "GET", path: "/api/admin/users" },
        { method: "POST", path: "/api/citations", body: { title: "Paper" } },
        { method: "PUT", path: "/api/citations/some-id", body: { title: "Paper" } },
        { method: "POST", path: "/api/citations/some-id/claim" },
        { method: "DELETE", path: "/api/citations/some-id/ownership" },
        { method: "GET", path: "/api/doi/lookup?doi=10.1145/3600001" },
        { method: "POST", path: "/api/invitations", body: { citationId: "c1", invitedEmail: "a@b.com" } },
        { method: "GET", path: "/api/invitations" },
        { method: "GET", path: "/api/preferences" },
        { method: "PUT", path: "/api/preferences", body: {} },
        { method: "GET", path: "/api/metrics/user" },
      ];

      for (const ep of endpoints) {
        const res = await app.fetch(
          new Request(`http://localhost${ep.path}`, {
            method: ep.method,
            headers: { "Content-Type": "application/json" },
            body: ep.body ? JSON.stringify(ep.body) : undefined,
          })
        );
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toContain("Unauthorized");
      }
    });
  });

  // --------------------------------------------------------------------------
  // 10. DOI Lookup Integration Tests (Task 4)
  // --------------------------------------------------------------------------
  describe("DOI Lookup Endpoint (GET /api/doi/lookup)", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("DOI lookup validates query parameter existence and DOI pattern format", async () => {
      const user = await registerTestUser("doi.validator@bogazici.edu.tr");

      // Missing query param
      const resMissing = await app.fetch(
        new Request("http://localhost/api/doi/lookup", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(resMissing.status).toBe(400);
      expect(await resMissing.json()).toEqual({ error: "DOI query parameter is required" });

      // Invalid DOI format
      const resInvalid = await app.fetch(
        new Request("http://localhost/api/doi/lookup?doi=invalid-not-a-doi", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(resInvalid.status).toBe(400);
      expect(await resInvalid.json()).toEqual({ error: "Invalid DOI identifier format" });
    });

    test("DOI lookup successfully parses metadata from Crossref REST API", async () => {
      const user = await registerTestUser("doi.crossref@bogazici.edu.tr");

      // Mock Crossref response
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("api.crossref.org")) {
          return new Response(
            JSON.stringify({
              message: {
                title: ["Quantum Key Distribution Protocols & Machine Learning"],
                author: [
                  { given: "Alice", family: "Smith" },
                  { given: "Bob", family: "Jones" },
                ],
                "published-print": { "date-parts": [[2025, 5]] },
                "container-title": ["ACM Transactions on Quantum Computing"],
                volume: "12",
                issue: "3",
                page: "101-118",
                DOI: "10.1145/3600001",
                URL: "https://doi.org/10.1145/3600001",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(input, init);
      };

      const res = await app.fetch(
        new Request("http://localhost/api/doi/lookup?doi=10.1145/3600001", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        metadata: {
          title: "Quantum Key Distribution Protocols & Machine Learning",
          authors: [
            { firstName: "Alice", lastName: "Smith" },
            { firstName: "Bob", lastName: "Jones" },
          ],
          year: 2025,
          journalOrPublisher: "ACM Transactions on Quantum Computing",
          volume: "12",
          issue: "3",
          pages: "101-118",
          doi: "10.1145/3600001",
          url: "https://doi.org/10.1145/3600001",
          pubType: "article",
        },
      });
    });

    test("DOI lookup falls back to doi.org CSL-JSON when Crossref returns 404", async () => {
      const user = await registerTestUser("doi.fallback@bogazici.edu.tr");

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("api.crossref.org")) {
          return new Response(JSON.stringify({ status: "not-found" }), { status: 404 });
        }
        if (url.includes("doi.org")) {
          return new Response(
            JSON.stringify({
              title: "Fallback Nature Photonics Paper",
              author: [{ given: "Carlos", family: "Mendoza" }],
              issued: { "date-parts": [[2024]] },
              "container-title": "Nature Photonics",
              volume: "18",
              issue: "2",
              page: "120-130",
              DOI: "10.1038/s41566-024-001",
              URL: "https://doi.org/10.1038/s41566-024-001",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(input, init);
      };

      const res = await app.fetch(
        new Request("http://localhost/api/doi/lookup?doi=10.1038/s41566-024-001", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metadata).toMatchObject({
        title: "Fallback Nature Photonics Paper",
        year: 2024,
        journalOrPublisher: "Nature Photonics",
        authors: [{ firstName: "Carlos", lastName: "Mendoza" }],
      });
    });

    test("DOI lookup returns 404 when DOI cannot be resolved by Crossref or doi.org", async () => {
      const user = await registerTestUser("doi.notfound@bogazici.edu.tr");

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      };

      const res = await app.fetch(
        new Request("http://localhost/api/doi/lookup?doi=10.9999/nonexistent.paper", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Failed to resolve DOI metadata for 10.9999/nonexistent.paper" });
    });
  });

  // --------------------------------------------------------------------------
  // 11. Co-Author Invitations & Lifecycle (Task 4)
  // --------------------------------------------------------------------------
  describe("Co-Author Invitations & Collaboration Lifecycle", () => {
    test("POST /api/invitations validates request parameters and citation existence", async () => {
      const user = await registerTestUser("invite.val@bogazici.edu.tr");

      // Missing params
      const resMissing = await app.fetch(
        new Request("http://localhost/api/invitations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ citationId: "some-id" }),
        })
      );
      expect(resMissing.status).toBe(400);
      expect(await resMissing.json()).toEqual({ error: "Citation ID and invited email are required" });

      // Non-existent citation
      const resNotFound = await app.fetch(
        new Request("http://localhost/api/invitations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ citationId: "nonexistent-citation-id", invitedEmail: "coauthor@bogazici.edu.tr" }),
        })
      );
      expect(resNotFound.status).toBe(404);
      expect(await resNotFound.json()).toEqual({ error: "Citation not found" });
    });

    test("Inviting an already-registered user immediately links citation to their profile as co-owner", async () => {
      const inviter = await registerTestUser("inviter@bogazici.edu.tr", "password123", "Inviter", "User");
      const coauthor = await registerTestUser("coauthor@bogazici.edu.tr", "password123", "Co", "Author");

      const { citationId } = await createTestCitation(inviter.token, { title: "Joint Collaborative Paper" });

      const inviteRes = await app.fetch(
        new Request("http://localhost/api/invitations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${inviter.token}`,
          },
          body: JSON.stringify({ citationId, invitedEmail: "coauthor@bogazici.edu.tr" }),
        })
      );
      expect(inviteRes.status).toBe(200);
      const inviteBody = await inviteRes.json();
      expect(inviteBody).toMatchObject({
        linkedDirectly: true,
        coOwner: {
          id: coauthor.user.id,
          email: "coauthor@bogazici.edu.tr",
          name: "Co Author",
        },
      });

      // Verify co-author is now an owner and can edit the citation
      const editRes = await app.fetch(
        new Request(`http://localhost/api/citations/${citationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${coauthor.token}`,
          },
          body: JSON.stringify({ title: "Joint Collaborative Paper (Co-Author Updated)" }),
        })
      );
      expect(editRes.status).toBe(200);
      expect(await editRes.json()).toEqual({ success: true });
    });

    test("Inviting an unregistered user creates a pending invite that is auto-claimed upon user registration", async () => {
      const inviter = await registerTestUser("primary.author@bogazici.edu.tr");
      const { citationId } = await createTestCitation(inviter.token, { title: "Future Co-Authored Paper" });

      const pendingEmail = "future.scientist@bogazici.edu.tr";

      // Send invite to unregistered email
      const inviteRes = await app.fetch(
        new Request("http://localhost/api/invitations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${inviter.token}`,
          },
          body: JSON.stringify({ citationId, invitedEmail: pendingEmail }),
        })
      );
      expect(inviteRes.status).toBe(200);
      const inviteBody = await inviteRes.json();
      expect(inviteBody).toMatchObject({
        invitation: {
          citationId,
          invitedEmail: pendingEmail,
          status: "pending",
        },
      });

      // Check GET /api/invitations lists the pending invitation
      const getInvitesRes = await app.fetch(
        new Request("http://localhost/api/invitations", {
          headers: { Authorization: `Bearer ${inviter.token}` },
        })
      );
      expect(getInvitesRes.status).toBe(200);
      const getInvitesBody = await getInvitesRes.json();
      expect(getInvitesBody.invitations.length).toBe(1);
      expect(getInvitesBody.invitations[0]).toMatchObject({
        citation_id: citationId,
        invited_email: pendingEmail,
        status: "pending",
        citation_title: "Future Co-Authored Paper",
      });

      // User now registers -> pending invitation is automatically claimed
      const registerRes = await app.fetch(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pendingEmail,
            password: "password123",
            firstName: "Future",
            lastName: "Scientist",
          }),
        })
      );
      expect(registerRes.status).toBe(200);
      const registerBody = await registerRes.json();
      expect(registerBody.autoClaimedCount).toBe(1);

      // Verify in DB: invitation status is accepted, and user is co-owner
      const inviteRow = db.prepare("SELECT status FROM invitations WHERE citation_id = ?").get(citationId) as any;
      expect(inviteRow.status).toBe("accepted");

      const coOwnerCheck = db
        .prepare("SELECT 1 FROM user_citations WHERE user_id = ? AND citation_id = ?")
        .get(registerBody.user.id, citationId);
      expect(coOwnerCheck).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 12. Duplicate Citation Detection & Merging (Task 4)
  // --------------------------------------------------------------------------
  describe("Duplicate Citation Detection & Merging", () => {
    test("GET /api/admin/duplicates identifies DOI and Title matching duplicate pairs", async () => {
      const admin = await loginAdmin();

      // Insert exact DOI duplicates
      const id1 = insertDirectCitation({
        id: "cit-dup-doi-1",
        title: "Deep Reinforcement Learning for Manipulation v1",
        authors: [{ firstName: "Carlos", lastName: "Mendoza" }],
        doi: "10.1109/TRO.2024.3350012",
        year: 2024,
      });
      const id2 = insertDirectCitation({
        id: "cit-dup-doi-2",
        title: "Deep Reinforcement Learning for Manipulation v2",
        authors: [{ firstName: "Carlos", lastName: "Mendoza" }],
        doi: "10.1109/TRO.2024.3350012",
        year: 2024,
      });

      // Insert exact Title duplicates
      const id3 = insertDirectCitation({
        id: "cit-dup-title-1",
        title: "Perovskite Solar Cells Degradation Optimization",
        authors: [{ firstName: "Kenji", lastName: "Takahashi" }],
        year: 2023,
      });
      const id4 = insertDirectCitation({
        id: "cit-dup-title-2",
        title: "perovskite solar cells degradation optimization",
        authors: [{ firstName: "Kenji", lastName: "Takahashi" }],
        year: 2024,
      });

      const res = await app.fetch(
        new Request("http://localhost/api/admin/duplicates", {
          headers: { Authorization: `Bearer ${admin.token}` },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.duplicates.length).toBeGreaterThanOrEqual(2);

      const doiDup = body.duplicates.find((d: any) => d.sourceId === id1 && d.targetId === id2);
      expect(doiDup).toMatchObject({
        sourceId: id1,
        targetId: id2,
        score: 1.0,
        matchReason: "Exact DOI Match (10.1109/TRO.2024.3350012)",
      });

      const titleDup = body.duplicates.find((d: any) => d.sourceId === id3 && d.targetId === id4);
      expect(titleDup).toMatchObject({
        sourceId: id3,
        targetId: id4,
        score: 0.95,
        matchReason: "Exact Title Match",
      });
    });

    test("POST /api/admin/merge-duplicates validates required body parameters", async () => {
      const admin = await loginAdmin();

      const res = await app.fetch(
        new Request("http://localhost/api/admin/merge-duplicates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ sourceId: "c1" }), // missing targetId
        })
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Source ID and target ID are required" });
    });

    test("POST /api/admin/merge-duplicates transfers ownership, removes target, and creates audit log", async () => {
      const admin = await loginAdmin();
      const user1 = await registerTestUser("merge.user1@bogazici.edu.tr");
      const user2 = await registerTestUser("merge.user2@bogazici.edu.tr");

      // User 1 owns source citation C1
      const { citationId: sourceId } = await createTestCitation(user1.token, { title: "Source Master Paper" });

      // User 2 owns target citation C2
      const { citationId: targetId } = await createTestCitation(user2.token, { title: "Target Duplicate Paper" });

      // Admin merges target into source
      const mergeRes = await app.fetch(
        new Request("http://localhost/api/admin/merge-duplicates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admin.token}`,
          },
          body: JSON.stringify({ sourceId, targetId }),
        })
      );
      expect(mergeRes.status).toBe(200);
      expect(await mergeRes.json()).toEqual({ message: "Duplicate citations merged successfully!" });

      // Verify Target Citation was deleted from citations table
      const targetCit = db.prepare("SELECT * FROM citations WHERE id = ?").get(targetId);
      expect(targetCit).toBeNull();

      // Verify User 2 was re-assigned ownership of source citation
      const user2Ownership = db
        .prepare("SELECT * FROM user_citations WHERE user_id = ? AND citation_id = ?")
        .get(user2.user.id, sourceId);
      expect(user2Ownership).not.toBeNull();

      // Verify User 1 retains ownership of source citation
      const user1Ownership = db
        .prepare("SELECT * FROM user_citations WHERE user_id = ? AND citation_id = ?")
        .get(user1.user.id, sourceId);
      expect(user1Ownership).not.toBeNull();

      // Verify Audit Log entry created
      const auditEntry = db
        .prepare("SELECT * FROM system_audit_logs WHERE action = 'CITATION_MERGE' AND admin_id = ?")
        .get(admin.user.id) as any;
      expect(auditEntry).not.toBeNull();
      expect(auditEntry.details).toContain(`Merged citation ${targetId} into ${sourceId}`);
    });
  });
});
