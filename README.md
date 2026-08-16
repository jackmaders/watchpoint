# Watchpoint Interactive Decision Engine

An interactive Overwatch 2 VOD decision training platform built with **TanStack Start**, **TanStack Query**, **Cloudflare Workers**, **Bun**, **Feature-Sliced Design (FSD)**, **Biome**, **Steiger**, **Vitest**, **Drizzle ORM**, **Better Auth**, **Tailwind CSS v4**, **TanStack React Form**, **Zod**, and **Playwright**.

---

## Technical Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Framework & Edge Deployment**: [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev) deployed natively to [Cloudflare Workers](https://workers.cloudflare.com) via Vite & Nitro
- **Data Fetching & State**: [TanStack Query](https://tanstack.com/query) with `createServerFn` server functions
- **Architecture**: [Feature-Sliced Design (FSD v2.1)](https://feature-sliced.design) verified via [Steiger](https://github.com/feature-sliced/steiger)
- **Linting & Formatting**: [Biome](https://biomejs.dev) with custom GritQL automocking and AAA plugins
- **Database, Storage & Auth**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) + [Drizzle ORM](https://orm.drizzle.team), [Cloudflare R2](https://developers.cloudflare.com/r2/) & [Better Auth](https://better-auth.com)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com) & [Radix UI](https://www.radix-ui.com)
- **Form Handling & Validation**: [TanStack React Form](https://tanstack.com/form) & [Zod](https://zod.dev)
- **Testing**: [Vitest](https://vitest.dev) (100% coverage threshold, <50ms tests) & [Playwright](https://playwright.dev) (E2E)
- **Automated AI SDLC**: [Sandcastle Autonomous Agent Runner](docs/adr/0005-sandcastle-agent-orchestration.md)

---

## Directory Structure (Feature-Sliced Design)

```text
app/            → TanStack Router route tree, SSR/client entrypoints & lightweight adapters
src/
├── app/        → Global styles and application-level configuration
├── pages/      → Route-level composition and page-owned logic
├── widgets/    → Large composite UI blocks reused across pages
├── features/   → Reusable user interactions (e.g. user-form)
└── shared/     → Infrastructure, UI kit, db client, utils, auth, media player
```

---

## Available Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start Vite development server (`http://localhost:3000`) |
| `bun run build` | Build TanStack Start client and worker server bundle |
| `bun run preview` | Preview production build locally |
| `bun run deploy` | Deploy application to Cloudflare Workers |
| `bun run cf-typegen` | Generate TypeScript types for Cloudflare bindings (`CloudflareEnv`) |
| `bun run check:types` | Run TypeScript type checking (`tsc --noEmit`) |
| `bun run check:lint` | Run Biome lint checks |
| `bun run check:format` | Run Biome formatting checks |
| `bun run check:all` | Run all Biome checks |
| `bun run check:architecture` | Run Steiger FSD architecture linter |
| `bun run fix:all` | Auto-fix Biome formatting and lint issues |
| `bun run sandcastle` | Run autonomous coding agents in isolated Docker sandboxes |
| `bun run test:unit` | Run Vitest unit tests |
| `bun run test:coverage` | Run Vitest unit tests with 100% coverage check |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run validate` | Run complete quality gate (`types`, `all`, `architecture`, `coverage`, `build`) |

---

## Autonomous Agent Orchestration (Sandcastle)

Run autonomous coding agents (`agy`, `gemini`, `codex`, `claude`) in container-isolated Docker sandboxes with host credential forwarding and self-healing verification:

```bash
# Run a task from a GitHub issue
bun run sandcastle --issue 152

# Run an ad-hoc task with iterative verification
bun run sandcastle --prompt "Refactor timeline seeking logic"

# Local-only dry-run without creating PRs
bun run sandcastle --prompt "Fix button alignment" --dry-run
```

The issue picker (`bun run sandcastle:pick`) and watcher (`bun run sandcastle:watch`) use the same runtime selection as ad-hoc runs. Codex is the default provider and uses the OpenRouter `openrouter/free` router; set `OPENROUTER_API_KEY` for queue execution. The free router can change the selected model, has variable availability and rate limits, and is not a reproducible production route. Pass `--model provider/model` to pin a route, or pass `--agent agy` to use the Antigravity escape hatch with its separate credentials.

`OPENROUTER_API_KEY` is forwarded only at runtime into the Sandcastle container. It is not written to the Codex configuration or baked into the image. When a provider reports the routed model, queue output records it; missing provider metadata is ignored.

---

## Setup & Getting Started

```bash
# 1. Install dependencies
bun install

# 2. Run local D1 migrations and seed database
bun run db:migrate:local
bun run db:seed

# 3. Validate complete pipeline
bun run validate

# 4. Start dev server
bun run dev
```
