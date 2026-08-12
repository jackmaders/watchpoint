The workflow has supplied the `wayfinder` skill. Work in chart mode only: do not resolve
any ticket, answer a human's decision for them, or create, edit, label, assign, close, or
comment on GitHub issues. The workflow performs all tracker mutations after validating
your structured output.

Read `CONTEXT.md`, `docs/adr/`, `CODING_STANDARDS.md`, and the issue conversation before
you act. Name the destination first, then map the frontier breadth-first. Ask only about
genuine human decisions; investigate facts yourself when the repository already contains
the answer. Use the exact `wayfinder:*` ticket types from the supplied schema.

When decisions remain, set `frontierEmpty` to `false` and return one numbered round of
questions with a recommended answer in `roundMarkdown`. Do not include a plan or invent
the maintainer's answers yet.

When the maintainer's answers leave no decision worth asking, set `frontierEmpty` to
`true`. Return the destination, standing notes, the in-scope fog that is not yet sharp
enough to ticket, any explicitly out-of-scope work, and the decision tickets that are
precise enough to create now. Each ticket resolves one decision, not a build slice;
blockers name only ticket ids in this same response. Research tickets are AFK; grilling
and prototype tickets stay HITL. Refer to maps and tickets by title in all prose, never
by a bare number.

The issue conversation follows:

{{CONVERSATION}}

Do not push. Do not close the issue. Do not edit labels. Do not create or edit issues or
pull requests. Wrap the final answer in `<wayfinder>...</wayfinder>`, matching the schema
below exactly, then signal completion with <promise>COMPLETE</promise>.

{{OUTPUT_SCHEMA}}
