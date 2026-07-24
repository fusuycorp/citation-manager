# API Reference

All endpoints are prefixed with `/api`. Authentication is via `Authorization: Bearer <token>` header.

---

## Health

### `GET /api/health`
**Auth**: None

**Response** `200`:
```json
{ "status": "ok", "timestamp": "2026-07-24T18:00:00.000Z", "runtime": "Bun" }
```

---

## Authentication (`/api/auth`)

### `POST /api/auth/register`
**Auth**: None

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | ✅ | Must match a whitelisted domain |
| `password` | string | ✅ | Min 6 characters |
| `firstName` | string | ✅ | |
| `lastName` | string | ✅ | |

**Response** `200`: `{ success: true, token, user: { id, email, firstName, lastName, role } }`
**Error** `400`: `{ error: "Email domain not whitelisted" }`

### `POST /api/auth/login`
**Auth**: None

| Field | Type |
|-------|------|
| `email` | string |
| `password` | string |

**Response** `200`: `{ success: true, token, user }`
**Error** `401`: `{ error: "Invalid credentials" }`

### `GET /api/auth/me`
**Auth**: Required

**Response** `200`: `{ user: { id, email, firstName, lastName, role } }`

### `PUT /api/auth/profile`
**Auth**: Required

| Field | Type |
|-------|------|
| `firstName` | string |
| `lastName` | string |

### `PUT /api/auth/change-password`
**Auth**: Required

| Field | Type |
|-------|------|
| `currentPassword` | string |
| `newPassword` | string |

---

## Citations (`/api/citations`)

### `GET /api/citations`
**Auth**: Optional (enriches response with ownership data)

**Query Parameters**:

| Param | Default | Options/Format |
|-------|---------|---------------|
| `scope` | `all` | `all`, `my`, `unowned` |
| `search` | `""` | Free text keyword |
| `pubType` | `all` | `article`, `book`, `conference`, `thesis`, `webpage` |
| `author` | `""` | Pipe-separated: `Smith\|\|Jones` |
| `year` | `""` | Range: `2018..2025` or list: `2024,2025` |
| `journal` | `""` | Journal/publisher name |
| `sortBy` | `created_at` | `created_at`, `year`, `title`, `journal` |
| `sortOrder` | `DESC` | `ASC`, `DESC` |
| `page` | `1` | 1-indexed |
| `limit` | `12` | Items per page (12, 24, 48, 96) |

**Response** `200`:
```json
{
  "citations": [
    {
      "id": "uuid",
      "title": "...",
      "authors": [{ "lastName": "Smith", "firstName": "John" }],
      "year": 2024,
      "journalOrPublisher": "...",
      "volume": "12", "issue": "3", "pages": "1-15",
      "doi": "10.xxxx/...", "url": "https://...",
      "pubType": "article",
      "abstract": "...",
      "createdAt": "2026-07-24T...",
      "isOwner": true,
      "formats": {
        "APA7": { "reference": "...", "parenthetical": "(Smith, 2024)", "narrative": "Smith (2024)" },
        "IEEE": { "reference": "...", "inText": "[1]" },
        "BibTeX": "...",
        "RIS": "...",
        "CSL-JSON": { ... }
      }
    }
  ],
  "pagination": { "total": 800, "page": 1, "limit": 12, "totalPages": 67 },
  "scopeCounts": { "my": 2, "unowned": 10, "all": 800 },
  "filterOptions": {
    "availableYears": [2025, 2024, 2023, ...],
    "availableJournals": ["Nature", ...],
    "availableAuthors": ["Smith, John", ...]
  }
}
```

> **Note on scopeCounts**: These counts reflect the currently active search/facet filters but are independent of the `scope` parameter. This allows the sidebar to show "how many citations match my filters within each scope" so the user can see at a glance where results live.

### `GET /api/citations/:id`
**Auth**: Optional

**Response** `200`: `{ citation: { ...allFields, isOwner, owners: [{ id, email, first_name, last_name }], formats } }`

### `POST /api/citations`
**Auth**: Required

Creates a citation and assigns ownership to the current user.

| Field | Type | Required |
|-------|------|----------|
| `title` | string | ✅ |
| `authors` | array | ❌ |
| `year` | number | ❌ |
| `journalOrPublisher` | string | ❌ |
| `volume` | string | ❌ |
| `issue` | string | ❌ |
| `pages` | string | ❌ |
| `doi` | string | ❌ |
| `url` | string | ❌ |
| `pubType` | string | ❌ (default: `article`) |
| `abstract` | string | ❌ |

### `PUT /api/citations/:id`
**Auth**: Required (must be owner or admin)

Same body as POST.

### `POST /api/citations/:id/claim`
**Auth**: Required

Claims ownership of an existing citation. Returns `400` if already owned by this user.

### `DELETE /api/citations/:id/ownership`
**Auth**: Required

Un-owns a citation. Returns `{ success: true, isNowUnowned: bool }`.

---

## DOI Lookup (`/api/doi`)

### `GET /api/doi/lookup?doi=10.xxxx/...`
**Auth**: None

Fetches metadata from the Crossref API and returns parsed citation data.

---

## Profiles (`/api/profiles`)

### `GET /api/profiles/resolve/:identifier`
**Auth**: None

Resolves a name to either a registered user profile or a directory author profile.

**Response** `200`:
```json
{
  "type": "user" | "author",
  "profile": { ... },
  "citations": [...],
  "coAuthors": ["Name1", "Name2"]
}
```

### `GET /api/profiles/search?q=...`
**Auth**: None

Searches users and citation authors by name. Returns `{ results: [...] }`.

---

## Admin (`/api/admin`)

All admin endpoints require `authMiddleware` + `adminMiddleware`.

### `GET /api/admin/stats`
System-wide statistics (total users, citations, unowned count, domain count).

### `GET /api/admin/users`
Full user list with citation counts.

### `PUT /api/admin/users/:id`
Edit user details (name, email, role).

### `GET /api/admin/domains`
List all whitelisted domains.

### `POST /api/admin/domains`
Add a new domain.

### `PUT /api/admin/domains/:id`
Edit domain (domain string, policy type).

### `DELETE /api/admin/domains/:id`
Remove a whitelisted domain.

### `GET /api/admin/audit-logs`
Paginated audit trail of admin actions.

---

## Invitations (`/api/invitations`)

### `POST /api/invitations`
**Auth**: Required

Invite a co-author by email to co-own a citation.

### `GET /api/invitations/pending`
**Auth**: Required

List pending invitations for the current user.

### `POST /api/invitations/:id/accept`
**Auth**: Required

Accept an invitation and gain co-ownership.

---

## Metrics (`/api/metrics`)

### `GET /api/metrics/:userId`
**Auth**: Optional

Returns bibliometric stats: h-index, publication count, year breakdown.

---

## Preferences (`/api/preferences`)

### `GET /api/preferences`
**Auth**: Required

Get current user's preferences.

### `PUT /api/preferences`
**Auth**: Required

| Field | Type | Default |
|-------|------|---------|
| `default_csl_style` | string | `APA7` |
| `default_in_text_mode` | string | `parenthetical` |
| `theme_mode` | string | `light` |
| `view_density` | string | `card` |
| `default_export_format` | string | `BibTeX` |
| `export_include_abstract` | boolean | `true` |
