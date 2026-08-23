# Architecture Decisions (ADRs)

<!--
Record format - one `## ` heading per decision, newest appended last:

## [YYYY-MM-DD] ADR-Title
- **Context**: Why was this decision necessary?
- **Decision**: What was chosen?
- **Consequences**: What trade-offs or constraints follow?
- **Superseded by**: optional. Name the ADR that replaced this one. Superseded
  entries stay in the file for history but are never expanded in `agent-ctx
  dump` - they are listed by title only, so the file can grow without the
  snapshot growing with it.

This block is an HTML comment on purpose: a `## ` heading here would be parsed
as an ADR and render as a phantom entry in every dump.
-->

## [2026-08-23] Frontend State Architecture
- **Context**: App.tsx had extreme prop drilling and 25+ states.
- **Decision**: Introduced AuthContext via Context API.
- **Consequences**: Removes prop drilling, components use useAuth().
