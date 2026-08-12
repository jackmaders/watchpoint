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

Review threads, including their comment ids for replies:

{{REVIEW_THREADS}}

Only address findings that are still relevant. Keep unrelated changes out of this fix
round. For every finding you resolve, include one reply in the structured output using
the finding's exact comment id. Do not invent comment ids.

Do not close the issue. Do not edit labels. Do not create or edit PRs.

Wrap your final answer in `<implement-pr>...</implement-pr>`, matching the schema below
exactly, then signal completion with `<promise>COMPLETE</promise>`.

{{OUTPUT_SCHEMA}}
