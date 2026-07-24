# Project Coding Standards

All code contributed to **CiteSphere** must adhere to the following coding standards and conventions to maintain high readability, performance, type safety, and security.

---

## 🟢 1. TypeScript & Type Safety

- **Strict Types**: Always explicitly type function signatures, API request/response payloads, and component props. Avoid using `any` unless absolutely necessary.
- **Interfaces vs Types**: Use `interface` for data models and object structures (`CitationData`, `Author`, `UserSession`) and `type` for unions and primitives (`CitationStyle`, `InTextMode`).
- **Null & Undefined Guards**: Handle missing fields explicitly (e.g. optional journal, volume, doi fields) with fallback defaults (`year ? year : "n.d."`).

---

## 🔵 2. Backend & API Design (Bun + Hono)

- **Parameterized Database Queries**: NEVER concatenate variables into SQL strings. Always use parameterized queries with `bun:sqlite`:
  ```ts
  // CORRECT
  db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  
  // INCORRECT (SQL Injection Risk)
  db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
  ```
- **Standardized API Error Envelope**:
  - Success responses return `{ message?: string, ...data }` with HTTP `200` or `201`.
  - Failure responses return `{ error: "Descriptive error message" }` with appropriate status code (`400`, `401`, `403`, `404`, `500`).
- **Authorization Guards**: Endpoints modifying data must explicitly check `user_citations` ownership or `admin` role before executing updates or deletes.

---

## 🟣 3. Frontend Architecture (React + Vanilla CSS)

- **Pure Design System**: Utilize predefined CSS variables from `theme.css` (`var(--primary)`, `var(--bg-main)`, `var(--radius-md)`) rather than hardcoding static pixel or color values.
- **Component Isolation**: Keep components focused on a single responsibility (`CitationList`, `CitationEditorModal`, `CitationPreviewerModal`, `CoAuthorInviteModal`).
- **State Management**: Lift state up to `App.tsx` when shared across modals or navbar tabs, and pass callbacks down cleanly.

---

## 🟡 4. Citation Formatter Engine Rules

- **Pure Function Contract**: The `formatCitation` function must be pure, deterministic, and free of side effects. Given the same `CitationData` and `CitationStyle`, it must produce identical formatted text.
- **Unit Test Requirement**: Every new citation style or format enhancement must be accompanied by comprehensive tests in `server/tests/formatter.test.ts`.

---

## 🔴 5. Code Quality & Formatting Checklist

Before submitting code or pushing a branch:
1. Run `bun test` to ensure all unit and integration tests pass cleanly.
2. Run `bun --bun vite build client` to verify zero TypeScript or bundle warnings.
3. Remove temporary debug `console.log` statements.
