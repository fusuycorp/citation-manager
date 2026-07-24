# CiteSphere Developer Documentation

> Internal development documentation for the **CiteSphere** Academic Citation Manager.

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture, tech stack, and runtime model |
| [File Structure](./file-structure.md) | Complete project tree with file-by-file annotations |
| [Coding Standards](./coding-standards.md) | TypeScript, React, SQL, and CSS conventions |
| [Design System](./design-system.md) | Color palette, typography, component classes, themes |
| [API Reference](./api-reference.md) | Every REST endpoint with request/response contracts |
| [Database Schema](./database-schema.md) | All tables, columns, constraints, and relationships |
| [Development Workflow](./development-workflow.md) | Running, testing, seeding, and deploying the app |
| [Changelog](./changelog.md) | Chronological log of all features and bug fixes |

## Quick Start

```bash
# Install dependencies
bun install

# Seed the database with academic citations
bun run seed

# Start the API server (port 3000)
bun run dev:server

# Start the Vite dev client (port 5173, proxies /api → 3000)
bun run dev:client

# Run the full test suite
bun test
```
