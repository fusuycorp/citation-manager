# Git Commit & Versioning Standards

To maintain a clean, readable, and searchable project history, **CiteSphere** adheres to the [Conventional Commits](https://www.conventionalcommits.org/) specification.

---

## 📌 Commit Message Format

Each commit message consists of a **type**, an optional **scope**, and a concise **description**:

```
<type>(<scope>): <short summary in imperative mood>

[optional body describing why and what changed]

[optional issue reference e.g., Closes #12]
```

---

## 🏷️ Allowed Commit Types

| Type | Description | Example |
|---|---|---|
| `feat` | A new feature for the user or system | `feat(auth): add domain whitelisting check during registration` |
| `fix` | A bug fix | `fix(formatter): correct IEEE in-text citation index rendering` |
| `docs` | Documentation changes only | `docs(readme): add boot up instructions and env setup` |
| `refactor` | Code refactoring without feature or fix changes | `refactor(db): optimize user_citations join query` |
| `test` | Adding or updating unit/integration tests | `test(api): add tests for unowned citation state transitions` |
| `style` | Formatting, CSS design system, whitespace adjustments | `style(ui): update glassmorphism tokens and button hover animation` |
| `chore` | Build tasks, package dependencies, tool configs | `chore(deps): upgrade Vite to v6` |

---

## 📐 Commit Message Rules

1. **Use Imperative Mood**: Write commit descriptions as a command ("add feature", NOT "added feature" or "adding feature").
2. **Keep the First Line Under 72 Characters**: Be direct and concise.
3. **Do Not End Subject Line With a Period**.
4. **Capitalize Scopes Cleanly**: Use lowercase hyphenated scopes e.g. `feat(citation-editor)`, `fix(ownership-guard)`.

---

## 🌿 Branch Naming Convention

- Feature branches: `feat/short-description` (e.g. `feat/bibtex-exporter`)
- Bug fix branches: `fix/short-description` (e.g. `fix/surname-matcher`)
- Refactor branches: `refactor/short-description` (e.g. `refactor/db-schema`)
- Documentation: `docs/short-description` (e.g. `docs/setup-guide`)
