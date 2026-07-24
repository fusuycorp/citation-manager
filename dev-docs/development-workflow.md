# Development Workflow

---

## Prerequisites

- **Bun** ≥ 1.3.x — [https://bun.sh](https://bun.sh)
- No other dependencies (no Node, Docker, or external DB required)

## Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install all dependencies |
| `bun run dev:server` | Start the Hono API server on `:3000` |
| `bun run dev:client` | Start Vite dev server on `:5173` with HMR |
| `bun run build` | Build the React client to `client/dist/` |
| `bun run seed` | Seed the SQLite database with academic data |
| `bun test` | Run the full test suite (31 tests) |

## Development Setup

1. Clone the repository
2. `bun install`
3. Copy `.env.example` to `.env` (defaults are fine for local dev)
4. `bun run seed` (optional — populates the database)
5. In one terminal: `bun run dev:server`
6. In another: `bun run dev:client`
7. Open `http://localhost:5173`

The Vite dev server proxies all `/api/*` requests to `localhost:3000` automatically.

## Production Deployment

1. `bun run build` — compiles React to `client/dist/`
2. `bun run dev:server` — serves both API and static files from `dist/` on port 3000
3. No reverse proxy required for simple deployments

The server auto-detects the `dist/` directory and serves it as static files with a fallback to `index.html` for SPA routing.

## Database Management

### Location
The database file lives at the project root: `citation_manager.sqlite`

### Backup
```bash
cp citation_manager.sqlite citation_manager.sqlite.backup
```

### Reset
```bash
rm citation_manager.sqlite
bun run dev:server    # Recreates schema via initDB()
bun run seed          # Re-populates data
```

### Inspect
```bash
# Using Bun's built-in SQLite
bun -e 'import { db } from "./server/db"; console.log(db.prepare("SELECT COUNT(*) FROM citations").get());'

# Or any SQLite client
sqlite3 citation_manager.sqlite ".tables"
sqlite3 citation_manager.sqlite "SELECT COUNT(*) FROM citations;"
```

## Testing

### Running Tests
```bash
bun test                          # All tests
bun test server/tests/api.test.ts # API integration tests only
bun test server/tests/formatter.test.ts  # Formatter unit tests only
bun test --watch                  # Watch mode
```

### Test Architecture
- Tests call `app.fetch(new Request(...))` directly — no running server needed.
- `api.test.ts` creates test users/data within the live database (timestamps in emails prevent collisions).
- Tests are sequential — later tests depend on data created by earlier tests.
- No mocking — all tests hit the real SQLite database.

### Writing New Tests
```typescript
import { describe, test, expect } from "bun:test";
import app from "../index";

describe("My Feature", () => {
  test("should do something", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ field: "value" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
```

## Adding a New Feature

### New API Endpoint

1. Create or edit a route file in `server/routes/`.
2. Export the Hono router as default.
3. Mount it in `server/index.ts`: `app.route("/api/newroute", newRouteModule)`.
4. Add middleware: `authMiddleware` for authenticated endpoints, `adminMiddleware` for admin-only.
5. Add tests in `server/tests/api.test.ts`.

### New React Page

1. Create `client/src/pages/NewPage.tsx`.
2. Add the page to the route switch in `App.tsx`:
   ```typescript
   // In parseHashRoute():
   if ([..., "newpage"].includes(raw)) { ... }

   // In the render:
   {currentPage === "newpage" && <NewPage />}
   ```
3. Add a navigation link in `Navbar.tsx`.

### New React Component

1. Create `client/src/components/NewComponent.tsx`.
2. Define props interface at the top of the file.
3. Use CSS classes from `theme.css` for styling. Add new classes to `theme.css` if they're reusable.
4. Import and use in the parent page/component.

### New CSS Classes

1. Add to `client/src/styles/theme.css`.
2. Use CSS variables for all theme-sensitive values.
3. Include both light and dark theme variants if the class uses color.

## Debugging

### Server Logs
The Bun server prints to stdout. Check the terminal running `bun run dev:server`.

### Database Queries
Add temporary `console.log` to SQL queries:
```typescript
console.log("SQL:", countSql, "Params:", params);
```

### Client State
React DevTools or `console.log` in `fetchCitations` to inspect API responses:
```typescript
console.log("API response:", data);
console.log("scopeCounts:", data.scopeCounts);
```

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| "table X has no column Y" | Schema mismatch | Delete `.sqlite` file, restart server |
| FOREIGN KEY constraint failed | Referencing non-existent row | Check the FK target exists first |
| Stale counts in sidebar | Initial state not updated from API | Ensure `setScopeCounts(data.scopeCounts)` runs |
| Vite proxy errors | Server not running on :3000 | Start `bun run dev:server` first |
