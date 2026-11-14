<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes, switching worktrees, or if project-local vite-plus is missing.
- [ ] Run `vp run check:full` and `vp test` before pushing to run full CI-parity checks. Note that warnings are denied in CI (`denyWarnings: true` under `FULL_CHECK=1`) and must be treated as blocking.
- [ ] If tests fail or need detailed traces, rerun with explicit reporter: `vp test <filter> --reporter=default`.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Universal Operating Directives

### Configuration Gate

- Change project configuration strictly with explicit user approval for the proposed change. This applies to `package.json`, dependencies, build scripts, linter rules, test configurations, deployment definitions, and CI pipelines. Implement features and repairs within existing settings, or request user authorization with a clear explanation of why a configuration modification is required.

### Command Hygiene & Sandbox Auto-Approval

- Standalone prefix-matchable binaries only (`rg`, `vp`, `vpr`, `git`).
- Zero shell chaining: Never use pipes (`|`), `xargs`, `&&`, `;`, `||`, subshells `$()`, or backticks.
- For file inspection and edits: Use native tools (`read_file`, `edit_file`, `write_file`) with absolute workspace paths instead of shell commands (`cat`, `head`, `tail`, `ls`).
- For code search: Use `rg "<pattern>" <path>` directly instead of `find | grep` or `find | xargs`.
- Do not read or write `/tmp/` files; subagents return all findings, summaries, and status reports directly via `send_message`.
- Use workspace-relative paths (`src/...`, `tests/...`, `docs/...`, `AGENTS.md`) for all command arguments passed to `run_command` binaries (`git`, `vp`, `vpr`, `rg`).
- Validate full repository health with `vpr check:full`, full CI parity with `vpr check:ci`, and complete test coverage with `vp test --coverage` (do not pass `--coverage` on single test paths).
- Maintain standard sandbox enforcement (`BypassSandbox: false`) at all times.
- Preserve Herdr worktree integrity: worktrees contain `.git` pointer files; execute git status or inspection commands directly within the active workspace root without traversing parent directories.

---

## Sharp Context Pointers

- Consult only the specific pointer matching the active task. When identifying applicable guidelines or answering routing requests, cite only the positively applicable documents matching the branch; omit unselected or unrelated skills.
- When managing development workflow or pull requests, read [workflow](docs/agents/workflow.md).
- When updating architecture decisions, read [domain](docs/agents/domain.md).
- When defining domain terminology, read [glossary](GLOSSARY.md).
- When reviewing coding conventions or error structures, read [coding standards](docs/engineering/CODING_STANDARDS.md).
- When designing routes, FSD slices, or server functions, read [architecture](docs/engineering/ARCHITECTURE.md).
- When working with TanStack Start, Router, Query, or Form, first read [architecture](docs/engineering/ARCHITECTURE.md). Follow its integration guidance when managed skills conflict.
- When writing unit tests or coverage assertions, read [testing](docs/engineering/TESTING.md).
- When managing GitHub issues or specifications, read [issue tracker](docs/agents/issue-tracker.md).
- When assigning triage roles, read [triage labels](docs/agents/triage-labels.md).
