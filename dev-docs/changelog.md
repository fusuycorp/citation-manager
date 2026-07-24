# Changelog

Chronological log of all features, bug fixes, and improvements.

---

## 2026-07-24

### Features Implemented

#### Core Citation Management System
- **Full-stack academic citation manager** built with Bun + Hono (server) and React + Vite (client)
- **SQLite database** with WAL mode, foreign keys, and 7 tables
- **JWT authentication** with domain-whitelisted registration (exact + wildcard patterns)
- **Role-based access control** (user / admin roles)
- **Citation CRUD** — create, read, update, delete with DOI auto-lookup via Crossref API
- **Multi-format citation rendering engine** — APA 7, IEEE, MLA 9, Chicago 17, BibTeX, RIS, CSL-JSON
- **Parenthetical & narrative in-text citation** generation for APA7/MLA9/Chicago17
- **Copy to clipboard** for all citation formats (reference, parenthetical, narrative)

#### Ownership & Collaboration
- **Many-to-many ownership model** — shared co-ownership of citations via `user_citations` junction table
- **Claim unowned citations** — `POST /api/citations/:id/claim`
- **Un-own citations** — explicit "Un-own" button on compact rows, cards, and details pane; `DELETE /api/citations/:id/ownership`
- **Orphan lifecycle** — un-owning by all co-owners transitions to "Unowned" state (not deleted)
- **Co-author invitations** — invite by email, accept/reject pending invites

#### Search, Filtering & Pagination
- **Multi-facet filtering** — scope (My/All/Unowned), keyword search, author fuzzy filter, year range/slider, journal, publication type
- **Dual-thumb year range slider** with slider buttons that never overlap
- **Multi-author fuzzy search** with autocomplete dropdown, checkbox toggles, and individual removal
- **Interactive pagination** — items per page selector (12/24/48/96), page jump dropdown
- **Dynamic scope counts** — sidebar counts reflect active search/facet filters (not just absolute totals)
- **Sorting** — by date, year, title, journal (ASC/DESC)

#### Admin Dashboard
- **System statistics** — total users, citations, unowned count, domain count
- **Master user table** — searchable, filterable list of all users with role editing
- **Domain whitelist management** — add/edit/delete domains with EXACT/WILDCARD policies
- **Audit trail** — paginated log of all admin actions

#### Scholar Profiles
- **Profile resolution** — resolves names to user profiles or author directory profiles
- **Smart author matching** — `isAuthorMatch` algorithm handles "Sencer, Asli", "Asli Sencer", "A. Sencer" variations
- **Profile search** — autocomplete search across users and citation authors
- **Profile pages** — publication list, co-author network, bibliometric stats
- **No dead-end "Not Found"** — always renders a template profile page with matching publications

#### User Experience
- **Scholarly Press design system** — warm parchment palette, Lora/Inter/JetBrains Mono typography
- **Light & dark theme** — auto-detects OS preference, persists to localStorage
- **Glassmorphism panels** — backdrop-blur, subtle shadows
- **Hash-based routing** — `#dashboard`, `#admin`, `#settings`, `#profile/Name`
- **Browser history sync** — back/forward buttons work across all pages via `popstate`/`hashchange`
- **"Citations Stream" home button** — 1-click return to main view from any page
- **User preferences** — default citation style, theme, view density, export format

#### Testing
- **31 integration + unit tests** with 75 assertions, 100% pass rate
- Coverage: auth, CRUD, ownership, filtering, profiles, admin, preferences, h-index

---

### Bug Fixes

#### Scope Count Calculation (2026-07-24 ~21:00)
**Problem**: Left sidebar showed `0` for "My Citations" (user had 2) and `789` for "Global Directory" (should be 800).

**Root Cause** (two bugs):
1. **Server**: Scope counts were computed as absolute queries ignoring active search/facet filters. The `myCount` used `COUNT(DISTINCT citation_id)` which had subtle differences, and `allCount` was a raw `SELECT COUNT(*) FROM citations` that always returned the global total.
2. **Client**: `App.tsx` had hardcoded stale initial state `{ my: 0, unowned: 10, all: 789 }` that flashed before the API response.

**Fix**:
- Refactored `server/routes/citations.ts` to separate common filter conditions from scope conditions. Each scope count now applies common filters + its own scope clause.
- Changed `App.tsx` initial state to `{ my: 0, unowned: 0, all: 0 }`.

**Files**: `server/routes/citations.ts`, `client/src/App.tsx`

#### Orphan Citation Deduplication (2026-07-24 ~19:30)
**Problem**: Unowned filter showed 10 orphan citations but they were all the same citation repeated.

**Root Cause**: Seed script was inserting duplicates.

**Fix**: Corrected seeding logic and ensured unique citation entries.

#### JSX Syntax Error in ProfilePage (2026-07-24 ~21:00)
**Problem**: Vite build error — "Missing semicolon" at ProfilePage.tsx line 290.

**Root Cause**: Malformed JSX closing brace in `.map()` callback.

**Fix**: Corrected the JSX syntax.

**File**: `client/src/pages/ProfilePage.tsx`

#### Year Range Slider (2026-07-24 ~20:00)
**Problem**: Slider only let you select the end year, not the start year. Slider thumbs could overlap.

**Fix**: Implemented proper dual-thumb range slider with active thumb tracking and minimum separation constraint. Default positions set to leftmost (min year) and rightmost (max year).

**File**: `client/src/components/UserDashboardSidebar.tsx`

#### Navigation History (2026-07-24 ~20:45)
**Problem**: Could not go back from any page to any page using browser back button.

**Fix**: Implemented hash routing with `window.history.pushState`, `popstate` and `hashchange` event listeners. Added "Citations Stream" home button in Navbar.

**Files**: `client/src/App.tsx`, `client/src/components/Navbar.tsx`
