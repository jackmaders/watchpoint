# Triage Labels

The skills speak in terms of canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                   |
| --------------------------- | --------------------- | ------------------------------------------ |
| `needs-triage`               | `triage:needed`       | Maintainer needs to evaluate this issue    |
| `needs-info`                 | `grill:waiting`        | Waiting on reporter for more information   |
| `ready-for-agent`            | `agent:ready`          | Fully specified, ready for an AFK agent    |
| `ready-for-human`            | `agent:needs-human`    | Requires human implementation              |
| `wontfix`                    | `triage:wontfix`       | Will not be actioned                       |
| `bug`                        | `triage:bug`           | Category: defect                           |
| `enhancement`                | `triage:enhancement`   | Category: new capability                   |

When a skill mentions a canonical role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table — never the plugin's literal default string.

`review:escalated` has no canonical counterpart; it's Watchpoint-specific (an agent tried twice and gave up on a diff), distinct from `agent:needs-human` (this work was never delegable to an agent in the first place).
