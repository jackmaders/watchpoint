# AI Agent System Guidance & Architecture Rules

This repository enforces strict technical, architectural, and quality standards for all AI pair-programming and automated code generation tasks.

---

## Core System Rules

### 1. Runtime & Package Scripts
- **Package Manager**: Use `bun` exclusively for package management and task execution (`bun run <script>`, `bun add <pkg>`). Do not use `npm`, `pnpm`, or `yarn`.
- **Scripts First**: Prefer defined `package.json` scripts (`bun run test:unit`, `bun run check:all`, `bun run validate`) over raw tool invocations.

### 2. Conventional Commits & Branches
- **Branch from Latest Main**: Always sync `main` (`git checkout main && git pull origin main`) and branch from latest `main` before starting new work. Never branch off unmerged feature branches unless managing a stacked PR.
- **Branch Names**: Format branch names strictly as `<type>/<kebab-case-description>` (e.g. `feat/user-profiles`, `fix/manifest-decoding`, `refactor/video-player-component`).
- **Commit Messages**: Format commit messages as `<type>(#<issue-number>): <emoji> <description>` when an issue number is provided, using the issue number as the only scope (e.g. `feat(#123): ✨ add amazing features`). When no issue number is provided, omit the scope entirely (e.g. `chore: 🧹 update documentation`). Commits in this repo are not signed; do not attempt GPG/SSH signing.
- **Pull Request Titles**: Use the same format as commit messages: `<type>(#<issue-number>): <emoji> <description>` when an issue number is provided, or `<type>: <emoji> <description>` when no issue number is provided. Do not use any scope other than the issue number (e.g. `feat(#123): ✨ add amazing features`).

### 3. Dedicated Tooling, Not Ad-Hoc Scripts
- For services with dedicated tooling, use that CLI/MCP server (e.g. `gh` for GitHub, `sentry-cli` for error tracking) — never raw HTTP scripts or ad-hoc curls.
- For local filesystem operations, prefer built-in agent file tools (`view_file`, `replace_file_content`, `write_to_file`, `grep_search`, `list_dir`) over shell commands (`cat`, `sed`, `grep`, `find`).

### 4. Immutable Auto-Generated Database Migrations
- Auto-generated database migration scripts inside `drizzle/` MUST NOT be manually edited. Generate new migrations via `bun run db:generate`.

---

## Disclosed Documentation & Pointers

- **Coding Standards**: Architecture (Feature-Sliced Design, `app/` barrels, feature naming), testing (AAA structure, <50ms speed, 100% coverage), and mock isolation rules live in `CODING_STANDARDS.md`.
- **Domain Modeling & ADRs**: Domain glossary and ADR sync discipline live in `CONTEXT.md` and `docs/agents/domain.md`.
- **Issue Tracker & Wayfinding**: Conventions for `gh` CLI issue management and Wayfinder maps live in `docs/agents/issue-tracker.md`.
- **Triage & State Labels**: Canonical 5-role triage vocabulary and GHA automation triggers live in `docs/agents/triage-labels.md`.
- **Workflows & Playbooks**: Step sequences and stage transitions for Milestones, Features, and Bugs live in `docs/agents/workflows.md`.
