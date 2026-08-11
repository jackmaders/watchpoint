Activate the `implement` skill, using `tdd` at the ticket's agreed seams — do not
improvise new ones. Before touching implementation files, explicitly establish the dedicated
branch `{{BRANCH_NAME}}`: verify it with `git branch --show-current` and
`git status --short --branch`. The runner normally creates it fresh from `origin/main`; if it is
not already present, fetch `origin/main` and create it with
`git switch -c {{BRANCH_NAME}} origin/main`. Never work on `main` or another branch.

Build the ticket on this branch and commit incrementally whenever a vertical slice reaches
GREEN, following AGENTS.md's conventional commit format exactly:
`<type>(<scope>): <emoji> <description>`.

After every commit, immediately push it to the remote. Use
`git push --set-upstream origin HEAD` for the first commit and `git push origin HEAD` for each
later commit. Treat a failed push as a hard stop and do not continue with local-only commits.

Read `CONTEXT.md`, `docs/adr/`, and `CODING_STANDARDS.md` in this repo first, so the
implementation uses this project's domain vocabulary, respects any ADR in the area it
touches, and follows this repo's testing and architecture standards.

Ticket #{{ISSUE_NUMBER}} (the issue body, then every human reply in order):

{{TICKET}}

Do not report whether validation passed or how many commits you made — the workflow
measures both itself, by running `bun run validate` and counting commits with
`git rev-list`, never by asking you.

Do not close the issue. Do not edit labels. Do not create or edit PRs.

Choose the file under `.github/PULL_REQUEST_TEMPLATE/` that best matches this change, and
the conventional-commit type, scope, and emoji for the PR title. The workflow composes
the final title itself from those three plus your `description` — give just the
`<description>` part, not the whole `<type>(<scope>): <emoji> <description>` line. Wrap
your final answer in `<implement>...</implement>`, matching the schema below exactly, then
signal completion with <promise>COMPLETE</promise>.

{{OUTPUT_SCHEMA}}
