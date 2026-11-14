# Agent Workflow

## Acceptance and Handover

- Read the originating issue and its comments before implementation or review. Identify the latest accepted specification. Resolve conflicting requirements against explicit user decisions; ask when precedence is unclear.
- Utilize focused validation during development: run `vp staged` or `vp check <paths>` to verify changed files quickly.
- Review the complete diff against the specification and repository standards before reporting completion. Map every accepted requirement to its implementation file and observable validation evidence. State missing behavior, untested requirements, and blocked checks explicitly rather than assuming passing tests prove full acceptance.
- Align every behavior change to accepted scope during review. Template imports preserve source behavior except for requested adaptations; test repairs preserve accepted behavior. Create GitHub tickets for out-of-scope improvements, citing evidence and proposed outcomes, and reference them in the PR instead of adding opportunistic changes.
- Apply [coding standards](../engineering/CODING_STANDARDS.md) and [architecture](../engineering/ARCHITECTURE.md) during review. Enforce mechanical conventions through deterministic checks; reserve written review rules for judgment calls.
- Audit linter and compiler suppressions: enforce **Zero Unreviewed Linter Suppressions**. Treat any `oxlint-disable`, `eslint-disable`, `@ts-ignore`, or suppression comment in a diff as an active review concern. Verify that no clean utility, theme class, or component prop exists to satisfy the rule cleanly, confirm the comment provides clear architectural rationale rather than a mechanical restatement, and explicitly note every newly introduced suppression and its justification in the PR review summary.
- Format handover reports to include: requirement mapping, accepted specification source, branch name and commit SHA, outstanding feedback, and checks already executed. Distinguish completed work from pending tasks so the next agent resumes immediately without parsing conversation logs.
- Enforce the 3-turn / 50k-token debugging circuit breaker: when an agent encounters repetitive TypeScript generic errors, lint violations, or test failures spanning more than 3 turns or accumulating over 50k tokens, halt the loop, generate a concise handover report, and spawn a clean replacement subagent with fresh context.

---

## Validation Commands

- **Targeted test execution**: Run focused tests with `vp test <path>` during active TDD cycles. Do NOT pass `--coverage` on single test paths (Vitest enforces 100% per-file coverage across the full suite).
- **Full suite coverage**: Run the complete test suite with coverage using `vp test --coverage`.
- **Browser tests**: Run browser tests using `vpr test:browser` when UI, routes, or pages are touched.
- **Repository health**: Run full repository validation using `vpr check:full`, and full CI parity using `vpr check:ci`.

---

## UI Implementation Hierarchy (Ponytail)

When implementing or reviewing UI features, controls, or components, apply the Ponytail anti-over-engineering preference hierarchy. Stop at the first tier that satisfies the requirement:

1. **Browser-native**: Built-in HTML platform capabilities and native elements (e.g. `<input type="date">`, `<dialog>`, `<details>`, `<button>`, native validation) before third-party wrappers.
2. **Existing shadcn primitives**: Primitives and components already present in `src/shared/ui/shadcn/` (or added via the shadcn registry). Compose existing primitives (`Field`, `Card`, `ToggleGroup`, `Dialog`, `Sheet`) rather than authoring bespoke layouts.
3. **Dedicated package**: Established, lightweight external package (e.g. `cmdk`, `react-day-picker`, `embla-carousel-react`) when native and shadcn primitives cannot meet the specification.
4. **Custom build**: Bespoke custom UI components or state machines only as a last resort when simpler tiers cannot satisfy requirements.

---

## Publishing and Pull Requests

- Verify tests and repository health before publishing:
  - Run `vp test --coverage`
  - Run `vpr check:full` (or `vpr check:ci` for full CI parity)
  - Run `vpr test:browser` when UI, routes, or pages are touched
- Compare the PR head and base against the target trunk and current branch before updating an existing PR. Verify the upstream remote branch matches the target. Push explicitly to `origin HEAD:<head-branch>`, or use the stack commands below, then confirm both the remote branch and the PR head SHA match local HEAD.
- **GitHub CLI Classic Projects Workaround**: `gh pr edit` and bare `gh pr view` fail on repositories affected by GitHub's Classic Projects GraphQL deprecation (`Projects (classic) is being deprecated` / `Field 'projectCards' doesn't exist on type 'PullRequest'`). Agents must use:
  - `gh api -X PATCH repos/{owner}/{repo}/pulls/<number> -F body=@<file>` to update PR bodies.
  - `gh pr view <number> --json url,title,body,state` to inspect PRs.
- Publish new PRs with explicit head and base configurations, setting the upstream tracking branch cleanly.

---

## Stacked Pull Requests

Use `gh stack` only for multi-PR feature stacks; use `gh pr create` for single atomic PRs.

- Plan PR boundaries prior to implementation: each PR delivers one coherent change with relevant tests and documentation, explainable and reviewable independently.
- Aim for at most 200 changed lines per PR. Isolate database migrations; explain indivisible schema migrations or generated code in the PR description.
- Initialize the stack with `gh stack init`.
- Append each successive layer using `gh stack add <branch>`.
- Publish branches with `gh stack push` and create/update linked PRs with `gh stack submit`.
- Verify the stack topology with `gh stack view`: the root PR targets trunk, and each subsequent PR targets the branch immediately preceding it.
- Ensure every PR is independently reviewable and verifiable against its base branch. Apply fixes to the earliest PR requiring them, then propagate changes downstream.
- Validate every branch in an isolated checkout prior to marking a stack complete. Run the full validation suite:
  - `vp test --coverage`
  - `vpr check:full` (or `vpr check:ci` for full CI parity)
  - `vpr test:browser` when UI, routes, or pages are touched
- Record each PR's base, branch, commit SHA, and check results in the handover summary.
