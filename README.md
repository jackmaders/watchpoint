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
| `bun run test:unit` | Run Vitest unit tests |
| `bun run test:coverage` | Run Vitest unit tests with 100% coverage check |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run validate` | Run complete quality gate (`types`, `all`, `architecture`, `coverage`, `build`) |

---

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
