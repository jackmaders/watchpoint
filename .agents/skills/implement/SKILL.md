---
name: implement
description: "Implement work from specs or tickets with TDD on an isolated conventional branch, checkpointing every GREEN state in a pushed commit. Use when an implementation agent must preserve progress reliably in an ephemeral environment."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

## Git safety and branch setup

Before editing any implementation file, establish and verify a dedicated branch. For this
repository's issue-driven runner, use `agent/issue-<number>-<slug>`; for standalone work,
use `<type>/<short-kebab-description>` such as `feat/...`, `fix/...`, or `refactor/...`.

Fetch the base branch and create the branch from it with `git switch -c <branch> origin/main`.
If the runner already created the expected branch, verify it with `git branch --show-current`
and `git status --short --branch` before doing any work. Never edit or commit on `main` or on
an unrelated pre-existing branch.

## GREEN-state checkpoint protocol

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Work in small vertical slices. After each slice reaches GREEN (the new test and its relevant
checks pass), immediately stage that slice and create an incremental commit using the repo's
conventional format: `<type>(<scope>): <emoji> <description>`.

Immediately after every commit, push it to the remote. Use
`git push --set-upstream origin HEAD` for the first push and `git push origin HEAD` thereafter.
Do not start another slice, make another commit, or finish the run with a committed change that
has not been pushed. A push failure is a hard stop: preserve the commit, retry or report the
failure, and do not continue accumulating local-only work.

Once done, use /code-review to review the work.

If the review requires changes, repeat the same RED -> GREEN -> commit -> push cycle for each
fix. Leave the final branch clean apart from any deliberately uncommitted work that the user
explicitly requested.
