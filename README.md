# Next.js App Router Production Project Template

A production-ready Next.js App Router project template scaffolded using **Bun**, **Feature-Sliced Design (FSD)**, **Biome**, **Steiger**, **Vitest**, **Prisma v7**, **Better Auth**, **Tailwind CSS v4**, **Shadcn UI**, **TanStack React Form**, **Zod**, and **Playwright**.

---

## Technical Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Framework & Edge Deployment**: [Next.js (App Router)](https://nextjs.org) + [React 19](https://react.dev) deployed to [Cloudflare Workers](https://workers.cloudflare.com) via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare)
- **Architecture**: [Feature-Sliced Design (FSD v2.1)](https://feature-sliced.design) verified via [Steiger](https://github.com/feature-sliced/steiger)
- **Linting & Formatting**: [Biome](https://biomejs.dev) with custom GritQL automocking plugin
- **Database, Storage & Auth**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) + [Prisma v7](https://prisma.io) (`@prisma/adapter-d1`), [Cloudflare R2](https://developers.cloudflare.com/r2/) & [Better Auth](https://better-auth.com)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com) & [Shadcn UI](https://ui.shadcn.com)
- **Form Handling & Validation**: [TanStack React Form](https://tanstack.com/form) & [Zod](https://zod.dev)
- **Testing**: [Vitest](https://vitest.dev) (100% coverage threshold) & [Playwright](https://playwright.dev) (E2E)
- **Automated AI SDLC**: [Multi-Agent AI Refinement, Development, and Review Lifecycle](docs/ai-sdlc-lifecycle.md)

---

## Directory Structure (Feature-Sliced Design)

```text
src/
├── app/        → App initialization, global styles, root layout & routes
├── pages/      → Route-level composition and page-owned logic
├── widgets/    → Large composite UI blocks reused across pages
├── features/   → Reusable user interactions (e.g. user-form)
├── entities/   → Reusable business domain models
└── shared/     → Infrastructure, UI kit (button), utils, auth, API client
```

---

## Available Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start Next.js development server |
| `bun run preview` | Build and preview application locally in Cloudflare `workerd` runtime |
| `bun run deploy` | Build and deploy application to Cloudflare Workers |
| `bun run cf-typegen` | Generate TypeScript types for Cloudflare bindings (`CloudflareEnv`) |
| `bun run build` | Build Next.js application |
| `bun run check:types` | Run TypeScript type checking (`tsc --noEmit`) |
| `bun run check:lint` | Run Biome lint checks |
| `bun run check:format` | Run Biome formatting checks |
| `bun run check:all` | Run all Biome checks |
| `bun run check:architecture` | Run Steiger FSD architecture linter |
| `bun run fix:all` | Auto-fix Biome formatting and lint issues |
| `bun run test:unit` | Run Vitest unit tests |
| `bun run test:coverage` | Run Vitest unit tests with 100% coverage check |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run prisma:validate` | Validate Prisma schema |
| `bun run validate` | Run complete pipeline (`types`, `all`, `architecture`, `coverage`) |

---

## Setup & Getting Started

```bash
# 1. Install dependencies
bun install

# 2. Generate Prisma Client
bun run prisma generate

# 3. Validate complete pipeline
bun run validate

# 4. Start dev server
bun run dev
```
