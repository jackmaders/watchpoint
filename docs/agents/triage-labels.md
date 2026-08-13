# Triage & Pipeline Labels

The skills speak in terms of canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker, clearly delineating between the **Matt Pocock Upstream Contract** and **Watchpoint Built-on-Top Extensions**.

## 1. Matt Pocock Upstream Originals (Canonical Contract)

We deliberately use the plugin's literal label strings — no repo-specific override. This is an intentional exception to Watchpoint's `{role}:{status}` label convention (see `docs/ai-agent-pipeline-design.md` §3.4): matching their hardcoded vocabulary exactly ensures zero drift as upstream skills evolve.

### Canonical Triage State & Category Roles

| Label in mattpocock/skills | Label in our tracker | Role / Purpose |
| :--- | :--- | :--- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |
| `bug` | `bug` | Category: defect |
| `enhancement` | `enhancement` | Category: new capability |

### Wayfinder Decision Ticket Roles

Used by `/wayfinder` map issues and child decision tickets:

| Label String | Role / Purpose |
| :--- | :--- |
| `wayfinder:map` | Applied to the master parent map issue holding Notes, Decisions, and Fog |
| `wayfinder:research` | Child decision ticket: primary source / investigation |
| `wayfinder:prototype` | Child decision ticket: throwaway spike / state model validation |
| `wayfinder:grilling` | Child decision ticket: interactive requirements extraction |
| `wayfinder:task` | Child decision ticket: concrete implementation task |

---

## 2. Watchpoint Built-on-Top Extensions

These labels are added by Watchpoint's automated headless pipeline (`.github/workflows/agent-*.yml` and `scripts/agents/`) to orchestrate skill execution asynchronously.

### Action Trigger & State Labels

| Label String | Purpose in Watchpoint Automation |
| :--- | :--- |
| `wayfinder:needed` | Triggers `agent-wayfinder.yml` to chart or advance a `/wayfinder` map |
| `grill:needed` | Triggers `agent-grill.yml` to post a round of `/grilling` questions |
| `spec:needed` | Triggers `agent-spec.yml` to generate a technical specification via `/to-spec` |
| `tickets:needed` | Triggers `agent-tickets.yml` to propose a tracer-bullet breakdown via `/to-tickets` |
| `tickets:proposed` | Indicates a ticket breakdown quiz is awaiting maintainer `/approve` |
| `dev:needed` | Triggers `agent-implement.yml` to execute an unblocked ticket via `/implement` + `/tdd` |
| `review:needed` | Triggers `agent-review.yml` to perform an automated code review via `/code-review` |

### Retry Escalation Label

| Label String | Purpose |
| :--- | :--- |
| `review:escalated` | Applied when an automated agent completes 2 review/fix rounds on a PR without resolution. Has no upstream counterpart; distinct from `ready-for-human` (escalated = agent attempted twice and stalled; `ready-for-human` = never delegable to an agent in the first place). |

