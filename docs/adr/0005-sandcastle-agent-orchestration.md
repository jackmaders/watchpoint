# ADR-005: Autonomous Coding Agent Orchestration with Sandcastle & Container Isolation

**Status**: Accepted  
**Date**: 2026-08-15  
**Deciders**: Engineering / Architecture Team  

---

## Context

Autonomous AI coding agents (such as Antigravity `agy`, Google Gemini CLI, and Codex) require terminal execution, file system modifications, and validation runs to implement features and fix bugs. Running unconstrained agents directly on host developer environments introduces risks of dirtying working trees, stomping work-in-progress files, and leaking unintended side effects.

Furthermore, developers need a reliable way to dispatch tasks from GitHub issues or ad-hoc prompts, mount host authentication seamlessly (including Antigravity CLI OAuth credentials from active Google subscriptions), run quality verification checks (`bun run check:all` and `bun run test:unit`) with automated self-healing retry loops, and propose clean, conventional pull requests.

---

## Decision

We adopt `@ai-hero/sandcastle` orchestration with Docker container isolation and git worktree sandboxing for autonomous agent execution.

Key architectural choices include:
1. **Container Isolation & Sandboxing**: All agent runs execute inside Docker containers (`sandcastle:local` or `catthehacker/ubuntu:act-latest`) bind-mounted to dedicated Git worktrees on the host.
2. **Seamless Host Auth Sharing**: Mount `$HOME/.gemini` into `/home/agent/.gemini` (and `/root/.gemini`) alongside host `agy` binaries and credentials, enabling Antigravity to utilize host Google subscription quota non-interactively (`agy -p "..." --dangerously-skip-permissions`) without manual re-authentication.
3. **Multi-Agent Provider Matrix**: Support Antigravity CLI (`agy`), Gemini CLI (`gemini`), OpenAI Codex (`codex`), and Claude Code (`claude`) selectable via `--agent <name>`.
4. **Self-Healing Quality Loop**: Run repository checks (`bun run check:all` and `bun run test:unit`) inside the container. If failures occur, error logs are aggregated and re-injected as a feedback prompt up to `maxRetries` (default: 3).
5. **Git & PR Automation**: Automatic branch generation (`<type>/<description>`), conventional commit formatting (`<type>(<scope>): <emoji> <description>`), and automated draft PR creation via `gh pr create --draft` linking the originating issue (with `--local-only` override).
6. **Package Script Integration**: Unified CLI access via `bun run sandcastle`.

---

## Consequences

### Positive
* **Host Isolation & Safety**: All modifications and command executions occur in isolated containers and isolated worktrees without affecting the developer's active workspace.
* **Frictionless Google Subscription Auth**: Zero credential setup needed for developers with active `agy` / Google Gemini subscriptions.
* **Autonomous Self-Correction**: Minor syntax, type, or lint errors are corrected automatically by the agent before proposing PRs.
* **Consistent Quality & Standards**: Enforces FSD architecture, 100% test coverage, and conventional commits on all automated contributions.

### Negative / Trade-Offs
* **Docker Daemon Dependency**: Requires Docker daemon running on the host machine for sandboxed container execution.
* **Execution Overhead**: Spawning container sandboxes and running full verification loops takes slightly longer than direct unisolated execution on the host.
