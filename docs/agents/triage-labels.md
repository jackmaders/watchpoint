# Triage Labels

The skills speak in terms of canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                   |
| --------------------------- | --------------------- | ------------------------------------------ |
| `needs-triage`               | `needs-triage`         | Maintainer needs to evaluate this issue    |
| `needs-info`                 | `needs-info`           | Waiting on reporter for more information   |
| `ready-for-agent`            | `ready-for-agent`      | Fully specified, ready for an AFK agent    |
| `ready-for-human`            | `ready-for-human`      | Requires human implementation              |
| `wontfix`                    | `wontfix`              | Will not be actioned                       |
| `bug`                        | `bug`                  | Category: defect                           |
| `enhancement`                | `enhancement`          | Category: new capability                   |

We deliberately use the plugin's literal label strings — no repo-specific override. This
is an intentional exception to Watchpoint's own `{role}:{status}` label convention (see
`docs/ai-agent-pipeline-design.md` §3.4): these seven roles are a contract with the
`triage`, `to-spec`, and `to-tickets` skills, and matching their hardcoded vocabulary
exactly means one less translation to keep in sync as the skills evolve upstream.

`review:escalated` has no canonical counterpart; it's Watchpoint-specific (an agent tried twice and gave up on a diff), distinct from `ready-for-human` (this work was never delegable to an agent in the first place).
