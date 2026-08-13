# Issue Tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for interactive agent operations, and [`scripts/agents/wiring.ts`](file:///home/jackmaders/projects/watchpoint/scripts/agents/wiring.ts) for deterministic workflow post-processing.

---

## 1. Matt Pocock Upstream Originals (Canonical Contract)

### CLI Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone. Remote: `jackmaders/watchpoint`.

### Standard Phrase Mappings

- **When a skill says "publish to the issue tracker"**: Create a GitHub issue.
- **When a skill says "fetch the relevant ticket"**: Run `gh issue view <number> --comments`.

### Pull Requests as a Triage Surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

### Wayfinding Operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as decision tickets.

- **Map**: A single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: Linked to the map as a GitHub sub-issue (`POST repos/<owner>/<repo>/issues/<parent>/sub_issues`). Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`).
- **Blocking Dependencies**: GitHub **native issue dependencies**. Added via `POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`), **never** the `#number` or `node_id`.
- **Frontier Query**: List map's open child sub-issues, drop any with open blockers (`issue_dependencies_summary.blocked_by > 0`) or an assignee. First unblocked ticket in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.

---

## 2. Watchpoint Built-on-Top Extensions

These deterministic additions address known upstream LLM failure modes (`mattpocock/skills#554`, `#513`), extending the standard skills without altering their contracts.

### Deterministic Post-Processor Wiring ([`scripts/agents/wiring.ts`](file:///home/jackmaders/projects/watchpoint/scripts/agents/wiring.ts))

- **Topological Sorting**: Performs a Kahn-style DFS topological sort over model-proposed ticket breakdown arrays (`topologicalSortTickets`) so parent dependencies are created/resolved before dependents.
- **Milestone Management**: Creates/updates a single GitHub Milestone per spec (`[Spec #<parentNumber>] <title>`) to logically group sub-issues.
- **Idempotent Marker System**: Embeds HTML comment markers (`<!-- spec-ticket-key: <id> -->`, `<!-- wayfinder-ticket-key: <id> -->`, `<!-- wayfinder-map: <mapNumber> -->`) into child issue bodies. This ensures that re-running `/to-tickets` or `/wayfinder` updates existing GitHub sub-issues rather than creating duplicate tickets.
- **Typed REST Endpoint Wiring**: Executes sub-issue linking (`addSubIssue`) and native dependency creation (`addBlockedByDependency`) via Octokit REST calls passing numeric database IDs, isolating the model from raw API graph mutation details.

