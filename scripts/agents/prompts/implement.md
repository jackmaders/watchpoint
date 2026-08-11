Activate the `implement` skill, using `tdd` at the ticket's agreed seams — do not
improvise new ones. You are already on the branch `{{BRANCH_NAME}}`, created fresh from
`main`. Build the ticket below on this branch and commit your work as you go, following
AGENTS.md's conventional commit format exactly: `<type>(<scope>): <emoji> <description>`.

Read `CONTEXT.md`, `docs/adr/`, and `CODING_STANDARDS.md` in this repo first, so the
implementation uses this project's domain vocabulary, respects any ADR in the area it
touches, and follows this repo's testing and architecture standards.

Ticket #{{ISSUE_NUMBER}} (the issue body, then every human reply in order):

{{TICKET}}

Do not report whether validation passed or how many commits you made — the workflow
measures both itself, by running `bun run validate` and counting commits with
`git rev-list`, never by asking you.

Do not push. Do not close the issue. Do not edit labels. Do not create or edit PRs.

Choose the file under `.github/PULL_REQUEST_TEMPLATE/` that best matches this change, and
the conventional-commit type, scope, and emoji for the PR title. Wrap your final answer
in `<implement>...</implement>`, matching the schema below exactly, then signal completion
with <promise>COMPLETE</promise>.

{{OUTPUT_SCHEMA}}
