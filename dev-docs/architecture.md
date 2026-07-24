# Architecture

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | [Bun](https://bun.sh) | 1.3.x | JavaScript runtime, bundler, test runner, package manager |
| **Server Framework** | [Hono](https://hono.dev) | 4.7.x | Lightweight web framework (Express-like, edge-native) |
| **Database** | SQLite | built-in via `bun:sqlite` | Embedded relational database, zero config |
| **Frontend Framework** | React | 18.3.x | Component-based UI |
| **Build Tool** | Vite | 6.1.x | Frontend dev server & bundler |
| **Language** | TypeScript | 5.7.x | End-to-end type safety |

### Why These Choices

- **Bun over Node**: Native SQLite driver (`bun:sqlite`), built-in test runner (`bun test`), faster startup. No need for `better-sqlite3` or `jest`.
- **Hono over Express**: Modern, TypeScript-first, lighter. Same middleware pattern, better types.
- **SQLite over Postgres**: Zero-ops for a single-server academic tool. The entire DB is one file (`citation_manager.sqlite`). WAL mode enables concurrent reads.
- **No ORM**: Raw SQL via `db.prepare()` for full control and zero abstraction overhead. Parameterized queries prevent SQL injection.

## Runtime Model

```
┌─────────────────┐     proxy /api/*     ┌─────────────────┐
│  Vite Dev Server │ ──────────────────► │   Bun + Hono    │
│  localhost:5173  │                      │  localhost:3000  │
│  (React HMR)    │                      │  (API + Static) │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                          ┌───────▼───────┐
                                          │    SQLite      │
                                          │  (WAL mode)    │
                                          │  FK enforced   │
                                          └───────────────┘
```

### Development Mode
- **Client**: Vite dev server on `:5173` with React HMR. Proxies `/api/*` requests to `:3000`.
- **Server**: Bun runs `server/index.ts` on `:3000`. Serves API routes and (if built) static files from `dist/`.

### Production Mode
- `bun run build` compiles the React app to `client/dist/`.
- The Bun server serves both the API and the built static files from `dist/` on a single port.
- No reverse proxy required for simple deployments.

## Authentication Model

- **Stateless JWT**: Tokens are HMAC-SHA256 signed, 7-day expiry.
- **No external auth provider**: Self-contained registration + login with bcrypt password hashing.
- **Domain Whitelist**: Registration restricted to approved email domains (exact or wildcard patterns like `*.ac.uk`).
- **Role-Based Access**: Two roles — `user` and `admin`. Enforced by `authMiddleware` and `adminMiddleware`.
- **Optional Auth**: The `GET /api/citations` endpoint uses `optionalAuthMiddleware` — works for unauthenticated visitors but enriches the response (ownership badges) when a token is present.

## Ownership Model

- **Many-to-Many**: One citation can have multiple owners (co-authors). One user can own many citations.
- **Junction Table**: `user_citations(user_id, citation_id)` — composite primary key.
- **Orphan State**: When all owners un-own a citation, it becomes "unowned" but remains in the database for the global directory. It is NOT deleted.
- **Claim Workflow**: Any authenticated user can claim an unowned citation via `POST /api/citations/:id/claim`.
