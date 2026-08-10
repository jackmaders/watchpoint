Activate the `to-spec` skill. The grilling for this issue has already finished — do
**not** interview the maintainer. Synthesise the settled conversation below into a
specification.

Read `CONTEXT.md`, `docs/adr/`, and `CODING_STANDARDS.md` in this repo first, so the spec
uses this project's domain vocabulary and respects any ADR in the area it touches.

Write `specMarkdown` using the skill's template — Problem Statement, Solution, User
Stories, Implementation Decisions, Testing Decisions, Further Notes — but leave out the
template's own "Out of Scope" heading: put explicitly-excluded work in the `outOfScope`
field instead, one item per array entry. It is rendered as its own section by the
workflow, not by you, so a maintainer can trust it is always present and consistently
formatted rather than depending on a markdown heading landing correctly every time.

Sketch the seams you will test this feature at — existing seams over new ones, the
highest point over the lowest, the fewest across the codebase the better. Put each named
seam and its rationale in the `seams` field, not in `specMarkdown`'s prose: `tdd` writes
tests only at the seams named here, and `code-review`'s Spec axis flags any seam nobody
agreed to, so this field is what implementation and review both work against.

The settled conversation (the issue body, then every human reply in order):

{{CONVERSATION}}

Do not push. Do not close the issue. Do not edit labels. Do not create or edit PRs.

Wrap your final answer in `<spec>...</spec>`, matching the schema below exactly, then
signal completion with <promise>COMPLETE</promise>.

{{OUTPUT_SCHEMA}}
