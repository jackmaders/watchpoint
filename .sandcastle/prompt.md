# Sandcastle Autonomous Coding Agent Instructions

You are an autonomous engineering agent working in an isolated container sandbox on the Watchpoint repository.

## Repository Standards
- **Package Manager**: Use `bun` exclusively (`bun run <script>`, `bun add <pkg>`).
- **Architecture**: Follow Feature-Sliced Design rules in `CODING_STANDARDS.md`.
- **Quality & Verification**: Ensure `bun run check:all` and `bun run test:unit` pass cleanly.
- **Commit Format**: `<type>(<scope>): <emoji> <description>` (e.g. `feat(sandbox): 🏰 ...`).

## Task Instructions
Please execute the requested task, writing clean, well-tested TypeScript code adhering to all repository architectural patterns.
