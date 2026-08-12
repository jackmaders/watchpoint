Activate the `implement` skill and address the review findings on this PR's existing
branch, replying to each thread you resolve. Use TDD at the agreed seams from the
originating ticket. Read `CONTEXT.md`, `docs/adr/`, and `CODING_STANDARDS.md` before
editing code.

The workflow has checked out branch `{{BRANCH_NAME}}`; work on that branch and do not
create a new branch. The workflow measures the commit and push itself after this run.

Ticket #{{ISSUE_NUMBER}}:

{{TICKET}}

PR diff:

```diff
{{DIFF}}
```

Complete PR feedback context (top-level PR comments, PR review bodies, inline PR review
comments, including bot comments, fetched with pagination):

{{REVIEW_THREADS}}

The structured output must contain exactly one outcome for every source. Classify every
source in that context exactly once. Use the
source-aware id exactly as supplied (`comment:<id>`, `review:<id>`, or `inline:<id>`),
and choose `fixed`, `invalid`, or `transiently-not-actionable`. Include a useful reason
and response for every outcome; an invalid finding must explain why it does not apply.
Address every valid finding even when another finding is invalid or transiently not
actionable. Do not omit a source, duplicate a source, or invent source ids.

Only address findings that are still relevant. Keep unrelated changes out of this fix
round.

Do not close the issue. Do not edit labels. Do not create PRs. Do not edit PRs.

Wrap your final answer in `<implement-pr>...</implement-pr>`, matching the schema below
exactly, then signal completion with `<promise>COMPLETE</promise>`.

{{OUTPUT_SCHEMA}}
