# Knip dependency hygiene

This repository uses [Knip](https://knip.dev/) 6.37.0 to find unused files,
dependencies, exports, binaries, unresolved imports, and circular dependencies.
The configuration is in [`knip.config.ts`](../.config/knip.config.ts).

## Adopted checks

The policy is intentionally strict, but separates repository-wide hygiene from
the smaller set of checks that protect the deployed Worker:

| Command | Scope | Failure policy |
| --- | --- | --- |
| `bun run check:knip` | Full + strict | Runs both focused checks below. |
| `bun run check:knip:full` | Source, tests, mocks, CSS, tool configuration, and runtime cycles | Errors for files, dependencies, binaries, unresolved imports, exports, types, enum/namespace members, unlisted packages, and cycles; duplicate exports are warnings. |
| `bun run check:knip:strict` | Production graph only | Knip strict mode, which implies production mode and validates direct runtime dependencies rather than dev-only tooling. |

Knip’s default run is intentionally comprehensive: it includes test files and
tooling configuration. Strict mode is the deploy-safety check: it catches a
package imported by shipped code but incorrectly declared in `devDependencies`.
That distinction already found and corrected the TanStack React Devtools
packages, which are imported by the root route and therefore belong in
`dependencies`.

The single CI command runs both analysis modes through the aggregate script. New exceptions should be rare and should
be explained in `.config/knip.config.ts`; do not use `knip --fix` or broad ignore patterns
as a substitute for fixing the module graph.

## Configuration decisions

- The route files and browser tests are explicit entry boundaries. The Vite,
  Vitest, Playwright, Drizzle, Biome, Wrangler, and Lefthook plugins discover
  their configured files under `.config`.
- Generated `src/routeTree.gen.ts` and `src/cloudflare-env.d.ts` are excluded
  from the project set. They remain available to resolution through imports,
  but are not treated as hand-maintained source files.
- CSS is part of the project set so the `@import "tailwindcss"` reference is
  visible to the dependency graph.
- `cloudflare` is ignored only because `cloudflare:workers` is a Cloudflare
  Workers runtime module, not an npm package.
- Lefthook is handled as a lifecycle-managed dependency: local Knip runs ignore
  it, while CI lets Knip's Lefthook plugin validate the dependency.
- `ignoreExportsUsedInFile` is enabled for TanStack Start server functions that
  are exported for framework/bundler boundaries but consumed in their defining
  module. Truly orphaned exports still fail the normal export checks.

## Better Auth alignment

Better Auth is not installed yet. This repository currently has no auth routes,
auth tables, or required authentication behavior, so adding the package now
would create an unused runtime dependency. When authentication is introduced,
use this dependency and integration policy:

1. Put `better-auth` in `dependencies`, because the Worker creates the auth
   instance and serves its handler at runtime.
2. Choose one database boundary. This app already has Cloudflare D1 and
   Drizzle. Better Auth documents native D1 support, where the D1 binding is
   passed directly to `betterAuth`; that is the lowest-dependency path for this
   Worker. If auth tables must be owned through the existing Drizzle schema,
   add `@better-auth/drizzle-adapter` to `dependencies` and configure its
   SQLite provider. Do not install both adapters without a concrete need.
3. For TanStack Start, mount `auth.handler(request)` in
   `src/routes/api/auth/$.ts` for both GET and POST, following the official
   integration route shape.
4. Add `tanstackStartCookies()` as the last Better Auth plugin. This repository
   already has Wrangler’s `nodejs_compat` flag, which Better Auth’s Cloudflare
   guidance requires for its async context support.
5. If using the Drizzle adapter, generate the Better Auth schema and apply it
   through the existing Drizzle migration workflow. Better Auth’s `migrate`
   command is for its built-in Kysely adapter; other ORMs should use their ORM
   migration tools.
6. Keep `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in deployment secrets/local
   environment files. Do not add secrets to `.config/knip.config.ts` or committed config.

Knip will recognize direct imports of `better-auth` and
`@better-auth/drizzle-adapter`. If a future auth plugin is selected through a
dynamic configuration path, first make that path an explicit entry or plugin
configuration; only add a narrow `ignoreDependencies` exception when the
reference is genuinely runtime-implicit.

## Sources

- [Knip configuration](https://knip.dev/reference/configuration)
- [Knip configuring project files](https://knip.dev/guides/configuring-project-files)
- [Knip production and strict mode](https://knip.dev/features/production-mode)
- [Knip rules and filters](https://knip.dev/features/rules-and-filters)
- [Knip handling reported issues](https://knip.dev/guides/handling-issues)
- [Better Auth installation](https://better-auth.com/docs/installation)
- [Better Auth TanStack Start integration](https://better-auth.com/docs/integrations/tanstack)
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth Cloudflare D1 announcement](https://better-auth.com/blog/1-5)
- [Better Auth database guidance](https://better-auth.com/docs/concepts/database)
