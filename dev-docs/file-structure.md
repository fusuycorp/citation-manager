# File Structure

Complete annotated project tree. Every file has a purpose — nothing is boilerplate.

```
citation-manager/
├── .env                          # Environment variables (PORT, JWT_SECRET, etc.)
├── .env.example                  # Template for .env — safe to commit
├── package.json                  # Scripts: dev:server, dev:client, build, seed, test
├── bun.lock                      # Bun lockfile (equivalent to package-lock.json)
├── citation_manager.sqlite       # SQLite database file (WAL mode)
│
├── server/                       # ── Backend (Bun + Hono) ──
│   ├── index.ts                  # App entry: Hono instance, CORS, route mounting, static serving
│   ├── db.ts                     # Database init: schema DDL, PRAGMA config, domain seeding
│   ├── middleware.ts             # Auth middleware: JWT sign/verify, authMiddleware, optionalAuth, adminMiddleware
│   ├── formatter.ts             # Citation formatting engine: APA7, IEEE, MLA9, Chicago17, BibTeX, RIS, CSL-JSON
│   ├── seed.ts                  # Database seeder: populates citations + users from academic data
│   ├── seed_unowned.ts          # Seeds orphan/unowned citations for testing
│   │
│   ├── routes/                   # ── API Route Modules ──
│   │   ├── auth.ts              # POST /register, /login, GET /me, PUT /profile, /change-password
│   │   ├── citations.ts         # GET / (search/filter/paginate), GET /:id, POST /, PUT /:id, POST /:id/claim, DELETE /:id/ownership
│   │   ├── admin.ts             # Admin dashboard: user mgmt, domain mgmt, audit logs, system stats
│   │   ├── profiles.ts          # Scholar profiles: GET /resolve/:identifier, GET /search
│   │   ├── doi.ts               # DOI → metadata lookup via Crossref API
│   │   ├── invitations.ts       # Co-author invitation system: POST /, GET /pending, POST /:id/accept
│   │   ├── metrics.ts           # Bibliometric calculations: h-index, publication stats
│   │   ├── preferences.ts       # User preferences CRUD: theme, citation style, export format
│   │   └── users.ts             # User search/listing for admin and invite autocomplete
│   │
│   └── tests/                    # ── Test Suite (bun test) ──
│       ├── api.test.ts           # Integration tests: auth, CRUD, ownership, admin, profiles (31 tests)
│       └── formatter.test.ts     # Unit tests: citation formatting engine (10 tests)
│
├── client/                       # ── Frontend (React + Vite) ──
│   ├── index.html                # HTML shell: Google Fonts (Inter, Lora, JetBrains Mono), Font Awesome CDN
│   ├── vite.config.ts            # Vite config: React plugin, dev proxy /api → localhost:3000
│   │
│   └── src/
│       ├── main.tsx              # React DOM entry point
│       ├── App.tsx               # Root component: routing, state management, data fetching, pagination
│       │
│       ├── styles/
│       │   └── theme.css         # Design system: CSS variables, button/badge/modal/form classes, dark mode
│       │
│       ├── components/           # ── Reusable UI Components ──
│       │   ├── Navbar.tsx                  # Top nav: logo, profile search, theme toggle, auth controls, page links
│       │   ├── UserDashboardSidebar.tsx    # Left panel: scope buttons, author/year/journal/pubType filters
│       │   ├── CitationList.tsx            # Citation stream: compact rows + card views with own/unown/claim actions
│       │   ├── CitationInspectorPane.tsx   # Right panel: citation details, formatted references, copy buttons
│       │   ├── CitationEditorModal.tsx     # Modal: create/edit citation form with all metadata fields
│       │   ├── CitationPreviewerModal.tsx  # Modal: full citation preview in all formats (APA, IEEE, BibTeX, etc.)
│       │   ├── CoAuthorInviteModal.tsx     # Modal: invite co-authors by email, manage pending invites
│       │   ├── AuthModal.tsx               # Modal: login/register form (legacy, replaced by AuthPage)
│       │   ├── WelcomeModal.tsx            # Modal: first-time user onboarding
│       │   ├── HeroBanner.tsx              # Hero section for unauthenticated landing
│       │   ├── BibliometricMetricsPanel.tsx # h-index, publication count, year breakdown charts
│       │   ├── AdminDashboardModal.tsx     # Legacy admin modal (superseded by AdminDashboardPage)
│       │   ├── AdminDomainManagerModal.tsx # Domain whitelist editor modal
│       │   └── UserPreferencesModal.tsx    # User preferences editor modal
│       │
│       └── pages/                # ── Full Page Views ──
│           ├── AdminDashboardPage.tsx      # Full admin panel: stats, user table, domain mgmt, audit logs
│           ├── ProfilePage.tsx             # Scholar profile: user or author, publications, co-author network
│           ├── UserSettingsPage.tsx         # User settings: preferences, theme, export defaults
│           ├── AuthPage.tsx                # Standalone auth page: login/register forms
│           └── HelpPage.tsx                # Help/FAQ documentation page
│
├── docs/                         # ── Legacy Documentation ──
│   └── (previous documentation files)
│
├── dev-docs/                     # ── Developer Documentation (you are here) ──
│
└── outputs/                      # ── Build Artifacts & Misc Outputs ──
```

## File Size Guideline

| File | Lines | Notes |
|------|-------|-------|
| `App.tsx` | ~885 | Root orchestrator — intentionally large, manages all state |
| `UserDashboardSidebar.tsx` | ~742 | Complex multi-facet filter UI with dual-range sliders |
| `AdminDashboardPage.tsx` | ~750+ | Full admin panel with tables, search, stats |
| `theme.css` | ~323 | Complete design system — should grow here, not inline |
| `citations.ts` (server) | ~380 | Core CRUD + complex SQL filtering |
| `formatter.ts` | ~400+ | Citation rendering engine for 7 formats |

> **Rule of thumb**: If a component exceeds ~500 lines, consider whether it has distinct logical sections that could become child components. But don't split just for the sake of splitting — co-located logic is easier to follow.
