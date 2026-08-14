# AI Agent System Guidance & Architecture Rules

This repository enforces strict technical, architectural, and quality standards for all AI pair-programming and automated code generation tasks.

---

## Core System Rules

### 1. Conventional Commits & Branches
- **Commit Messages**: Format commit messages strictly as:
  `<type>(<scope>): <emoji> <description>`
  (e.g. `feat(auth): 🔑 setup authentication`, `fix(player): 🐛 resolve timestamp precision in timeline`).
  Commits in this repo are not signed. Do not attempt GPG/SSH commit signing, and do not treat an unsigned commit as something to fix.
- **Branch Names**: Format branch names strictly as:
  `<type>/<kebab-case-description>`
  (e.g. `feat/user-profiles`, `fix/manifest-decoding`, `refactor/video-player-component`, `docs/architecture-overview`).

### 2. Dedicated Tooling, Not Ad-Hoc Scripts
- For any service with an MCP server or a dedicated CLI available, use that MCP server or CLI — never a hand-rolled bash/curl or Python script against the raw API.
  - Examples: `github-mcp-server` or the `gh` CLI for GitHub; the `sentry` MCP server or `sentry-cli` for error tracking.
- For GitHub issue and PR operations, always use the dedicated `gh` CLI tool rather than raw API scripts.
- For local filesystem actions — reading, editing, creating, removing, or moving files — prefer the coding agent's own built-in file tools (e.g. Read/Edit/Write/Glob/Grep) over an equivalent terminal command or script (`cat`, `sed`, `rm`, `mv`, `find`, etc.). Fall back to a terminal command only when no built-in tool covers the action.

### 3. Immutable Auto-Generated Database Migrations
- Auto-generated database migration scripts inside `drizzle/` (or `prisma/migrations/`) MUST NOT be edited, altered, or manually modified under any circumstances.
- Need a schema change reflected? Run the database migration CLI to generate a new migration instead of hand-editing an existing one.

---

## Coding Standards

Before writing or reviewing code — architecture (Feature-Sliced Design, `app/` barrels, feature naming), testing (structure, speed, coverage), and mocking rules all live in one place. See `CODING_STANDARDS.md`.

---

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### Workflows & Playbooks

Planning flows for Milestones, Features, Bugs, and Architecture reviews. See `docs/agents/workflows.md`.
