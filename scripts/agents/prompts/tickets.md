The workflow has supplied the `to-tickets` skill. The spec below is already published and settled — do
**not** interview the maintainer. Break it into tracer-bullet tickets: vertical slices,
each cutting a complete path through schema, logic, UI and tests, each demoable on its
own.

Read `CONTEXT.md`, `docs/adr/`, and `CODING_STANDARDS.md` in this repo first, so ticket
titles and descriptions use this project's domain vocabulary and respect any ADR in the
area they touch. Look for prefactoring opportunities before slicing — "make the change
easy, then make the easy change" — and sequence a wide, mechanical refactor as
expand-migrate-contract rather than forcing it into a vertical slice.

Give each ticket its **blocking edges** — the other tickets in this same breakdown that
must land first. A ticket with no blockers can start immediately. Wire blockers only
within this breakdown: never invent a reference to a ticket outside it. `id` is a key you
make up for this run only, used solely to wire `blockers` — it carries no meaning once
this run ends, so do not try to keep it stable with a previous breakdown.

Avoid specific file paths or code snippets in `whatToBuild` — they go stale fast.
Exception: a snippet that encodes a decision more precisely than prose can (a state
machine, a reducer, a schema shape) may be inlined, trimmed to the decision-rich part.

The published spec and its conversation (the issue body, then every human reply in
order):

{{CONVERSATION}}

This is a proposal only — the workflow itself posts it as a numbered comment and waits
for the maintainer's `/approve` before creating anything. Do not push. Do not close the
issue. Do not edit labels. Do not create or edit issues or PRs.

Wrap your final answer in `<tickets>...</tickets>`, matching the schema below exactly,
then signal completion with <promise>COMPLETE</promise>.

{{OUTPUT_SCHEMA}}
