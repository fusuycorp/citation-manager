# Coding Standards

Conventions, patterns, and rules followed throughout the CiteSphere codebase.

---

## 1. TypeScript

### General
- **Strict mode** is implied. Always provide types — avoid `any` unless interfacing with untyped SQLite results.
- Use `interface` for object shapes, `type` for unions/intersections.
- Prefer `const` over `let`. Never use `var`.
- Use template literals over string concatenation.

### Naming Conventions
| Entity | Convention | Example |
|--------|-----------|---------|
| Files (server) | `snake_case.ts` or `camelCase.ts` | `seed_unowned.ts`, `formatter.ts` |
| Files (client) | `PascalCase.tsx` for components/pages | `CitationList.tsx`, `ProfilePage.tsx` |
| Variables, functions | `camelCase` | `fetchCitations`, `parseAuthors` |
| React components | `PascalCase` | `UserDashboardSidebar` |
| CSS classes | `kebab-case` | `glass-panel`, `btn-primary` |
| Database columns | `snake_case` | `journal_or_publisher`, `created_at` |
| API query params | `camelCase` | `sortBy`, `pubType`, `sortOrder` |
| Constants | `UPPER_SNAKE_CASE` | `JWT_SECRET`, `PORT` |

### Function Patterns
```typescript
// ✅ Named exports for route modules
export default citations;

// ✅ Synchronous Hono handlers where possible (SQLite is sync in Bun)
citations.get("/", optionalAuthMiddleware, (c) => {
  // ...sync DB calls...
  return c.json({ data });
});

// ✅ Async only when needed (request body parsing, external API calls)
citations.post("/", authMiddleware, async (c) => {
  const body = await c.req.json();
  // ...
});
```

### Error Handling
```typescript
// ✅ Return appropriate HTTP status codes with descriptive messages
return c.json({ error: "Paper title is required" }, 400);
return c.json({ error: "Unauthorized: Missing token" }, 401);
return c.json({ error: "Forbidden: Admin privileges required" }, 403);
return c.json({ error: "Citation not found" }, 404);

// ✅ Try-catch for parsing/external calls, silent fallbacks
try {
  const parsed = JSON.parse(authorsJson);
  if (Array.isArray(parsed)) return parsed;
} catch (_) {
  return [];
}
```

---

## 2. SQL & Database

### Query Style
- **Always use parameterized queries** — never interpolate user input into SQL strings.
- Use `db.prepare(sql).get(...params)` for single rows, `.all(...params)` for multiple.
- Use `db.prepare(sql).run(...params)` for mutations (INSERT/UPDATE/DELETE).

```typescript
// ✅ Parameterized
db.prepare("SELECT * FROM users WHERE email = ?").get(email);

// ❌ NEVER do this
db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
```

### Naming
- Tables: plural `snake_case` — `citations`, `user_citations`, `whitelisted_domains`
- Columns: `snake_case` — `first_name`, `journal_or_publisher`, `created_at`
- Junction tables: `{entity1}_{entity2}` — `user_citations`

### Schema Evolution
- No migration framework. Use `CREATE TABLE IF NOT EXISTS` for idempotency.
- Use `ALTER TABLE ADD COLUMN` wrapped in try-catch for adding columns to existing tables.
- Always add new columns as nullable or with DEFAULT values.

```typescript
try {
  db.run("ALTER TABLE citations ADD COLUMN abstract TEXT;");
} catch (_) {
  // Column already exists — safe to ignore
}
```

### Dynamic WHERE Clause Construction
When building filtered queries with optional facets:

```typescript
const conditions: string[] = [];
const params: any[] = [];

if (search) {
  conditions.push("(LOWER(c.title) LIKE ?)");
  params.push(`%${search}%`);
}
if (yearMin) {
  conditions.push("c.year >= ?");
  params.push(yearMin);
}

const whereClause = conditions.length > 0
  ? `WHERE ${conditions.join(" AND ")}`
  : "";

db.prepare(`SELECT * FROM citations c ${whereClause}`).all(...params);
```

---

## 3. React & Frontend

### Component Architecture
- **Pages** (`src/pages/`) — full-screen views corresponding to routes. Receive minimal props, manage their own data fetching.
- **Components** (`src/components/`) — reusable building blocks. Receive data + callbacks via props. No direct API calls.
- **App.tsx** — root orchestrator. Owns global state (auth, citations, filters, pagination, scope counts). Passes data and handlers down.

### State Management
- **No Redux/Zustand** — all state lives in `App.tsx` via `useState` hooks.
- State is passed down as props. Events bubble up via callback props (`onScopeChange`, `onSearch`, etc.).
- API responses update multiple state atoms at once (citations, pagination, scopeCounts, filterOptions).

### Routing
- **Hash-based routing** — no React Router dependency.
- Routes: `#dashboard`, `#admin`, `#settings`, `#help`, `#auth`, `#profile/{identifier}`
- `window.history.pushState` + `popstate`/`hashchange` listeners for browser back/forward.

```typescript
// Navigate programmatically
function navigateToPage(pg: string, target?: string) {
  setCurrentPage(pg);
  window.location.hash = pg === "profile"
    ? `profile/${encodeURIComponent(target)}`
    : pg;
}
```

### Styling Approach
- **No CSS-in-JS, no Tailwind** — all styles use vanilla CSS classes from `theme.css` or inline `style={{}}` for layout.
- Reusable classes: `.btn`, `.btn-primary`, `.btn-sm`, `.badge`, `.glass-panel`, `.form-input`, `.modal-overlay`, etc.
- Layout-specific styles (flex gap, padding, width) are inline — they don't belong in reusable classes.
- Theme-sensitive values always use CSS variables: `var(--text-main)`, `var(--bg-card)`, etc.

```tsx
// ✅ Correct: reusable class + inline layout
<button className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
  Save
</button>

// ❌ Wrong: hardcoded colors
<button style={{ background: "#1e3a8a", color: "white" }}>Save</button>
```

### JSX Conventions
- Always use `React.Fragment` (or `<>`) to avoid wrapper div soup.
- Conditional rendering with `&&` or ternary, not `if` blocks.
- Event handlers: inline arrow functions for simple cases, named functions for complex logic.
- Lists always have `key` props — prefer stable IDs over array indices.

---

## 4. API Design

### REST Conventions
| Verb | Pattern | Purpose |
|------|---------|---------|
| `GET` | `/api/citations` | List/search with query params |
| `GET` | `/api/citations/:id` | Get single resource |
| `POST` | `/api/citations` | Create resource |
| `PUT` | `/api/citations/:id` | Update resource |
| `DELETE` | `/api/citations/:id/ownership` | Remove ownership link |
| `POST` | `/api/citations/:id/claim` | Action on resource |

### Response Shape
```typescript
// List endpoint
{
  citations: [...],
  pagination: { total, page, limit, totalPages },
  scopeCounts: { my, unowned, all },
  filterOptions: { availableYears, availableJournals, availableAuthors }
}

// Single resource
{ citation: { ...fields, isOwner, owners, formats } }

// Mutation success
{ success: true, citationId: "..." }

// Error
{ error: "Descriptive message" }
```

### Query Parameters
- Filtering: `scope`, `search`, `pubType`, `author`, `year`, `journal`
- Sorting: `sortBy` (created_at|year|title|journal), `sortOrder` (ASC|DESC)
- Pagination: `page` (1-indexed), `limit` (default 12)
- Multi-value: Authors pipe-separated (`author=Smith||Jones`), years as range (`year=2018..2025`) or comma-list (`year=2024,2025`)

---

## 5. Testing

### Framework
- **Bun's built-in test runner** — `bun test server/tests`
- Tests use `describe` / `test` / `expect` (Jest-compatible API).
- Integration tests call `app.fetch(new Request(...))` directly — no running server needed.

### Test Organization
- `formatter.test.ts` — pure unit tests for the citation formatting engine.
- `api.test.ts` — full integration tests: auth → CRUD → ownership → admin → profiles.
- Tests run sequentially within a file (order matters for stateful integration tests).

### Running
```bash
bun test                    # Run all tests
bun test server/tests       # Run server tests only
bun test --watch            # Watch mode
```

### Current Coverage
- **31 tests, 75 assertions**, 100% pass rate.
- Tests cover: health check, registration (whitelisted/blocked domains), login, profile updates, password changes, citation CRUD, multi-facet filtering, profile resolution, ownership claim/unlink, admin user editing, domain policy editing, audit logs, user preferences, h-index calculation.

---

## 6. Git & Environment

### .env
- Never commit `.env` — it contains `JWT_SECRET`.
- `.env.example` is the template with placeholder values.
- The SQLite file (`citation_manager.sqlite`) should be in `.gitignore` for shared repos.

### Commit Messages
- Use imperative mood: "Add profile search", "Fix scope count calculation"
- Prefix with category when helpful: "fix:", "feat:", "refactor:", "docs:", "test:"

---

## 7. Important Operational Rule

> **The server and client are running on another machine and are running constantly. Never run `bun run dev:server`, `bun run dev:client`, or any long-running server process during development. Write code changes directly to disk — they will be picked up by the running processes (Vite HMR for client, server restart watcher for backend). Running `bun test` for verification is permitted.**
