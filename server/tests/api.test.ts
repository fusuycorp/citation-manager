import { afterAll, describe, expect, test } from "bun:test";
import app from "../index";
import { db } from "../db";
import { calculateHIndex } from "../routes/metrics";

describe("CiteSphere API & Industry Standards Integration Test Suite", () => {
  let tokenUser1: string;
  let tokenUser2: string;
  let tokenAdmin: string;
  let user1Id: string;
  let user2Id: string;
  let citation1Id: string;
  let citation2Id: string;
  let domainPolicyId: string;

  const testEmail1 = `author.one.${Date.now()}@bogazici.edu.tr`;
  const testEmail2 = `author.two.${Date.now()}@gmail.com`;
  const wildcardEmail = `researcher.${Date.now()}@oxford.ac.uk`;
  const forbiddenEmail = `unauthorized.${Date.now()}@untrusted-domain.org`;

  afterAll(() => {
    // Cleanup temporary test records created during test execution
    if (citation1Id) {
      db.prepare("DELETE FROM user_citations WHERE citation_id = ?").run(citation1Id);
      db.prepare("DELETE FROM citations WHERE id = ?").run(citation1Id);
    }
    if (citation2Id) {
      db.prepare("DELETE FROM user_citations WHERE citation_id = ?").run(citation2Id);
      db.prepare("DELETE FROM citations WHERE id = ?").run(citation2Id);
    }
    if (user1Id) {
      db.prepare("DELETE FROM user_preferences WHERE user_id = ?").run(user1Id);
      db.prepare("DELETE FROM users WHERE id = ?").run(user1Id);
    }
    if (user2Id) {
      db.prepare("DELETE FROM user_preferences WHERE user_id = ?").run(user2Id);
      db.prepare("DELETE FROM users WHERE id = ?").run(user2Id);
    }
    if (domainPolicyId) {
      db.prepare("DELETE FROM whitelisted_domains WHERE id = ?").run(domainPolicyId);
    }
  });

  test("GET /api/health returns operational status", async () => {
    const res = await app.fetch(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("Registration fails for non-whitelisted domain", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forbiddenEmail, password: "password123" }),
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("is not in the active whitelist");
  });

  test("Registration succeeds for Wildcard Domain policy (*.ac.uk)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: wildcardEmail,
          password: "password123",
          firstName: "Stephen",
          lastName: "Hawking",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
  });

  test("Registration succeeds for @bogazici.edu.tr (User 1)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail1,
          password: "password123",
          firstName: "Mehmet",
          lastName: "Aydin",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    tokenUser1 = body.token;
    user1Id = body.user.id;
  });

  test("Registration succeeds for @gmail.com (User 2)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail2,
          password: "password123",
          firstName: "Jane",
          lastName: "Doe",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    tokenUser2 = body.token;
    user2Id = body.user.id;
  });

  test("User Profile Update (PUT /api/auth/profile)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUser1}`,
        },
        body: JSON.stringify({
          firstName: "Mehmet Nuri",
          lastName: "Aydin",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.firstName).toBe("Mehmet Nuri");
  });

  test("User Password Change (PUT /api/auth/change-password)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUser1}`,
        },
        body: JSON.stringify({
          currentPassword: "password123",
          newPassword: "newsecurepassword456",
        }),
      })
    );
    expect(res.status).toBe(200);

    // Verify login with new password
    const loginRes = await app.fetch(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail1, password: "newsecurepassword456" }),
      })
    );
    expect(loginRes.status).toBe(200);
  });

  test("User 1 creates Citation 1", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/citations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUser1}`,
        },
        body: JSON.stringify({
          title: "AI-Driven Predictive Maintenance for Workforce Integration Test",
          authors: [
            { firstName: "Mehmet Nuri", lastName: "Aydin" },
            { firstName: "Jane", lastName: "Doe" },
          ],
          year: 2025,
          journalOrPublisher: "Applied Sciences",
          volume: "15",
          issue: "11",
          pages: "6282",
          doi: "10.3390/app15116282",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.citationId).toBeDefined();
    citation1Id = body.citationId;
  });

  test("User 1 creates Citation 2", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/citations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUser1}`,
        },
        body: JSON.stringify({
          title: "Takfir Discourse Analytics Integration Test",
          authors: [{ firstName: "Reza", lastName: "Dehkharghani" }],
          year: 2024,
          journalOrPublisher: "Journal of Information Systems",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    citation2Id = body.citationId;
  });

  test("Multi-Facet Filtering (author, year, journal, sortBy)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/citations?author=Aydin&year=2025&journal=Applied%20Sciences&sortBy=year&sortOrder=DESC", {
        headers: { Authorization: `Bearer ${tokenUser1}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.citations).toBeDefined();
  });

  test("Profile Resolution API (Registered User Profile)", async () => {
    const res = await app.fetch(
      new Request(`http://localhost/api/profiles/${user1Id}`, {
        headers: { Authorization: `Bearer ${tokenUser1}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("user");
    expect(body.profile.email).toBe(testEmail1);
    expect(body.citations.length).toBeGreaterThan(0);
  });

  test("Profile Resolution API (Directory Author Profile)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/profiles/Alice%20Smith", {
        headers: { Authorization: `Bearer ${tokenUser1}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("author");
    expect(body.profile.name).toBe("Alice Smith");
    expect(body.citations.length).toBeGreaterThan(0);
  });

  test("Profile Search API (GET /api/profiles/search?q=Aydin)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/profiles/search?q=Aydin", {
        headers: { Authorization: `Bearer ${tokenUser1}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
  });

  test("User 2 CANNOT edit User 1's citation without ownership", async () => {
    const res = await app.fetch(
      new Request(`http://localhost/api/citations/${citation1Id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUser2}`,
        },
        body: JSON.stringify({
          title: "Attempted Unauthorized Edit",
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  test("User 2 claims ownership of Citation 1 -> User 2 can now edit it", async () => {
    const claimRes = await app.fetch(
      new Request(`http://localhost/api/citations/${citation1Id}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUser2}` },
      })
    );
    expect(claimRes.status).toBe(200);

    const editRes = await app.fetch(
      new Request(`http://localhost/api/citations/${citation1Id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUser2}`,
        },
        body: JSON.stringify({
          title: "AI-Driven Predictive Maintenance for Workforce (Co-Owned Edition)",
        }),
      })
    );
    expect(editRes.status).toBe(200);
  });

  test("Unlinking citation by all owners transitions it to Unowned state", async () => {
    const unlink1 = await app.fetch(
      new Request(`http://localhost/api/citations/${citation1Id}/ownership`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenUser1}` },
      })
    );
    expect(unlink1.status).toBe(200);

    const unlink2 = await app.fetch(
      new Request(`http://localhost/api/citations/${citation1Id}/ownership`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenUser2}` },
      })
    );
    expect(unlink2.status).toBe(200);
    const body = await unlink2.json();
    expect(body.isNowUnowned).toBe(true);
  });

  test("Admin Master User Editing (PUT /api/admin/users/:id)", async () => {
    const loginRes = await app.fetch(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@bogazici.edu.tr", password: "password123" }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    tokenAdmin = loginBody.token;

    const editUserRes = await app.fetch(
      new Request(`http://localhost/api/admin/users/${user2Id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({
          email: testEmail2,
          firstName: "Jane Master",
          lastName: "Doe",
          role: "user",
        }),
      })
    );
    expect(editUserRes.status).toBe(200);
  });

  test("Admin Whitelisted Domain Policy Edit (PUT /api/admin/domains/:id)", async () => {
    const testDomain = `test-univ-${Date.now()}.edu`;
    // Add domain policy
    const addRes = await app.fetch(
      new Request("http://localhost/api/admin/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({ domain: testDomain, policyType: "EXACT" }),
      })
    );
    expect(addRes.status).toBe(200);
    const addBody = await addRes.json();
    domainPolicyId = addBody.domain.id;

    // Edit domain policy
    const editRes = await app.fetch(
      new Request(`http://localhost/api/admin/domains/${domainPolicyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`,
        },
        body: JSON.stringify({ domain: `*.${testDomain}`, policyType: "WILDCARD" }),
      })
    );
    expect(editRes.status).toBe(200);
    const editBody = await editRes.json();
    expect(editBody.domain.policyType).toBe("WILDCARD");
  });

  test("Admin Audit Trail Verification (GET /api/admin/audit-logs)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/admin/audit-logs", {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auditLogs.length).toBeGreaterThan(0);
  });

  test("User Preferences API default view_density = 'compact'", async () => {
    const getRes = await app.fetch(
      new Request("http://localhost/api/preferences", {
        headers: { Authorization: `Bearer ${tokenUser1}` },
      })
    );
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.preferences.viewDensity).toBe("compact");
  });

  test("h-index math algorithm accuracy", () => {
    expect(calculateHIndex([10, 8, 5, 4, 3])).toBe(4);
    expect(calculateHIndex([25, 12, 3, 1, 0])).toBe(3);
    expect(calculateHIndex([1, 1, 1])).toBe(1);
    expect(calculateHIndex([])).toBe(0);
  });
});
