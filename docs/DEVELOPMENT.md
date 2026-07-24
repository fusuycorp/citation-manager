# Developer Guide & Architecture Setup

This guide provides technical specifications, architectural diagrams, and step-by-step instructions for developers working on **CiteSphere**.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client Layer [Vite + React Frontend]
        UI[Navbar / CitationList / Modals]
        Style[Vanilla CSS Design System / HSL Theme]
    end

    subgraph API Layer [Bun + Hono Server]
        Auth[Auth & Domain Whitelist Middleware]
        Authz[Ownership Permission Guard]
        CitationEngine[Formatter Engine: APA 7, IEEE, MLA, BibTeX, RIS]
        UsersRoutes[User Search & Smart Surname Auto-Match]
    end

    subgraph Data Layer [bun:sqlite Database]
        UsersTable[(users)]
        DomainsTable[(whitelisted_domains)]
        CitationsTable[(citations)]
        UserCitationsTable[(user_citations - Many-to-Many)]
        InvitationsTable[(invitations)]
    end

    UI <--> API Layer
    API Layer <--> Data Layer
```

---

## 🛠️ Step-by-Step Developer Setup

### 1. Environment Setup
- Ensure **Bun v1.1.0+** is installed on your Linux / macOS / WSL machine.
- Verify Bun installation:
  ```bash
  bun -v
  ```

### 2. Workspace Initialization
Clone the repository and install dependencies:
```bash
bun install
```

### 3. Database Migration & Initial Seeding
The project uses SQLite native bindings via `bun:sqlite`. To initialize the tables and seed initial data:
```bash
bun run seed
```
This creates `citation_manager.sqlite` at project root with:
- Standard schema tables (`users`, `whitelisted_domains`, `citations`, `user_citations`, `invitations`).
- Default whitelisted domains (`bogazici.edu.tr`, `gmail.com`).
- 1900+ publications parsed from `outputs/faculty_directory_en.json`.

### 4. Running Development Servers
To run the full stack during local development:
```bash
# Start backend API (Port 3000)
bun dev:server
```
In a secondary terminal:
```bash
# Start frontend Vite dev server (Port 5173 with proxy to backend)
bun dev:client
```

### 5. Running Automated Tests
The test runner uses Bun's built-in fast test engine (`bun test`).

```bash
# Run all tests
bun test

# Run specific test suites
bun test server/tests/formatter.test.ts
bun test server/tests/api.test.ts
```

---

## 📁 Directory Structure Overview

```
citation-manager/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Modals, Navbar, Citation Cards & Previewer
│   │   ├── styles/             # HSL Theme System & Glassmorphism CSS
│   │   ├── App.tsx             # Root Application Container
│   │   └── main.tsx            # DOM Mount Point
│   ├── index.html
│   └── vite.config.ts
├── server/                     # Bun + Hono Backend
│   ├── routes/                 # Auth, Admin, Citations, Users, Invitations API
│   ├── tests/                  # Bun Unit & Integration Test Suites
│   ├── db.ts                   # bun:sqlite Database Connection & Schema
│   ├── formatter.ts            # Citation Formatting Engine
│   ├── index.ts                # Server Entrypoint
│   ├── middleware.ts           # JWT Auth & Admin Authorization Guards
│   └── seed.ts                 # Faculty Directory Importer & Seeder
├── docs/                       # Developer Documentation
│   ├── DEVELOPMENT.md          # Setup & Architecture Guide
│   ├── CODING_STANDARDS.md     # Code Quality & Style Rules
│   └── COMMIT_STANDARDS.md     # Git Commit Guidelines
├── outputs/                    # Raw Faculty Directory Source JSON/HTML Files
├── .env.example                # Environment Variable Template
├── package.json                # Project Dependencies & Scripts
└── README.md                   # Main Project Overview
```
