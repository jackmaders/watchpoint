# Architecture

Applies when designing modules or their public interfaces, integrating vendor SDKs,
adding routes, placing UI or form primitives, or changing route authentication,
loader data fetching, or server functions.

## Project structure

Representative layout following Feature-Sliced Design (FSD) and repository conventions:

```text
src/
├── app/
│   ├── layouts/                  # Shared layouts (header, footer, theme-toggle)
│   ├── routes/                   # File-based routes (thin wrappers over pages)
│   │   ├── _authenticated/       # Authenticated route group
│   │   │   └── <entity>.tsx      # Thin route delegating to page
│   │   ├── __root.tsx            # Root route with layout and error boundary
│   │   └── index.tsx             # Public landing route
│   ├── router.tsx                # TanStack Router instance & route tree binding
│   └── routeTree.gen.ts          # Auto-generated route tree
├── pages/                        # Page slices composed of views and features
│   └── <entity>/
│       ├── api/                  # Server functions, operation schemas, queries, and mutations
│       │   ├── <entity>.functions.ts
│       │   ├── <operation>-schema.ts
│       │   ├── <entity>-query-options.ts
│       │   └── use-<action>-<entity>.ts
│       ├── model/                # Domain types and client-safe domain logic
│       ├── ui/                   # Entity page view and decomposed form/dialog components
│       │   └── <entity>-page.tsx
│       └── index.ts              # Public API barrel exporting page component
└── shared/                       # Shared reusable infrastructure and primitives
    ├── auth/                     # Better Auth client, server, and session middleware
    ├── db/                       # Drizzle client, connection runtime, and table schemas
    │   └── schema/               # Table definitions and inferred row types (<entity>.ts, auth.ts)
    ├── errors/                   # ApplicationError, transport serialization, and logging
    ├── lib/                      # Pure utilities and constants
    └── ui/                       # Reusable UI component libraries
        ├── form/                 # TanStack Form wrappers and validation components
        └── shadcn/               # Headless shadcn/ui primitives

tests/
├── browser/                     # Playwright browser tests and page objects
│   ├── page-objects/             # Page Object Models for routes and views
│   │   └── components/           # Sub-component objects for dialogs and forms
│   └── <entity>-<scenario>.test.ts
└── vitest/                       # Shared Vitest setup and global fixtures
    └── fixtures/                 # Reusable test fixtures and mock factories
```

## Module design

- Group operations that serve the same purpose. When behaviors change for
  independent reasons, separate them into modules with distinct responsibilities.
- When user groups have different requirements, isolate their behavior
  so changes for one group leave the others unaffected.
- When behavior repeatedly uses several fields owned by another module,
  move that behavior to the owning module.
- When parts of a long function share mutable state, group related state
  and operations into focused modules.
- Separate workflow sequencing from the implementation of individual
  steps so they can change independently.
- When a stated requirement needs an abstraction, introduce it.
  Otherwise, keep the design simple.
- When exposing helpers would couple callers to changing implementation
  details, keep those helpers private. Expose the operations callers need.
- Import directly from concrete module files within a slice. Export public slice
  contracts exclusively from the slice root (`index.ts` or `index.{client,server}.ts`).
  Ban internal segment barrel re-exports entirely.

## Schema ownership

- Keep `shared/db/schema/` limited to Drizzle table definitions and types
  inferred directly from those tables. This layer describes persisted shape.
- Put validation schemas for operation inputs and outputs in the owning slice's
  `api/*-schema.ts` modules. These schemas describe caller-facing contracts and
  may derive, narrow, or extend fields from the database table.
- Keep domain types and logic in `model/` when they are not operation-specific
  validation contracts.

## Dependency boundaries

- Isolate vendor SDK calls behind application-owned adapters.
  Keep vendor API changes inside those adapters.
- When concrete dependencies would couple consumers to unrelated
  implementation details, introduce dependency interfaces.
  Define those interfaces around the operations consumers need.
- Auth and database integration uses Drizzle v1 implementation and Better Auth
  with SQL builders. Better Auth runs against the base Drizzle adapter
  (`better-auth/adapters/drizzle`) without relational joins. Enabling Better Auth
  joins requires aligning Drizzle RC relations (`defineRelations`) and adopting the matching
  relations-v2 adapter (`@better-auth/drizzle-adapter/relations-v2`), declared directly
  at a compatible Better Auth version rather than imported through transitive dependencies.

## Routes

- Follow the [route and page naming rules](CODING_STANDARDS.md#route-and-page-components).

- Place TanStack Router file routes in `src/app/routes` as thin wrappers
  that delegate to `src/pages`.
- When a route requires authentication, place it under
  `src/app/routes/_authenticated`.
- When a route uses TanStack Query for data required on initial render,
  populate the query cache in its loader before rendering.
- Return promises directly from data loaders; omit redundant `async () => await`
  wrappers around dynamic imports.

## Server functions

- When client code invokes a server operation, expose it through
  `createServerFn`.
- Use `GET` for reads and `POST` for writes.
- Keep server functions responsible for validation and middleware wiring.
  Handlers forward validated input and context to extracted server operations.
- When a server function accepts input, validate it with `.validator(schema)`.
- When a server function requires authentication, attach authentication
  middleware.
- When an operation accesses user-owned data, pass the authenticated user
  from middleware context to database operations and derive ownership
  fields from that user.

## Components

- For every UI addition, reuse existing application components and shadcn
  primitives with their default styles and supported variants before adding
  custom styling. Use the active theme's semantic tokens so switching themes
  updates every page automatically.
- Add custom styling only when required behavior or layout cannot be expressed
  through those components and variants. Keep it minimal and theme-aware;
  avoid hardcoded colors or page-specific overrides of shared component
  appearance. Put reusable visual changes in the owning shared component.
- Place shadcn UI primitives in `src/shared/ui/shadcn`.
- Place reusable TanStack Form components in `src/shared/ui/form`.
- Co-locate single-page forms, dialogs, and views inside `src/pages/<entity>/ui/`
  to comply with Steiger architecture rules (`fsd/insignificant-slice`). Extract
  logic into `src/features/` strictly when reused across 2 or more distinct pages.
- Keep JSX presentation strictly in `ui/` segments; place pure utilities and domain
  helpers in `lib/` or `model/`.
- Structure clickable cards by rendering interactive buttons as sibling elements
  or CSS overlay elements (`after:absolute after:inset-0`) relative to title links,
  ensuring valid non-nested interactive HTML (`<button>` beside `<a>`).

## TanStack integration

- Follow repository conventions when managed skill examples conflict.
- Verify version-sensitive APIs against the lockfile, installed source, and
  [first-party migration guidance](https://tanstack.com/start/latest/docs/framework/react/migrate-from-release-candidate).

### Setup

- Configure Start and Cloudflare through their Vite plugins. Start owns route
  generation. Use the separate Router plugin for standalone Router apps.
  See the [Cloudflare Start guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
- Create a `QueryClient` inside `getRouter()` for each SSR request. The browser
  retains its router's cache during navigation.
- Use `setupRouterSsrQueryIntegration` for the Query provider, dehydration,
  hydration, and streaming.
- Use `createFileRoute` with `server.handlers` for external HTTP endpoints.
  See the [server routes guide](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).

### Authenticated reads and writes

- Keep page logic, query options, mutations, schemas, and database operations
  in the owning page slice.
- Await `context.queryClient.query(options)` in the loader. Read the same
  options with `useSuspenseQuery` in the page.
- Keep privileged operations in server functions. Loaders also run in the browser.
- Handle navigation and initial loader errors through Router. Use Query for
  cached data, refetching, and mutation state.
- Await critical data. Return promises for secondary data rendered with
  Suspense and Await.
- Call mutations through `useServerFn`. Return the query invalidation promise
  from `onSuccess` to keep the mutation pending until refetching finishes.
- Await `mutateAsync` in form submission handlers to propagate failures.
- Set `Cache-Control: private, no-store` on personalized HTML. This controls HTTP
  caching, separately from Query caching and server-function responses.
- On sign-out or account switching, cancel and remove private queries and
  reload authentication context.
- See the [Start and Query guide](https://tanstack.com/start/latest/docs/framework/react/guide/tanstack-query)
  for integration and cache lifecycle details.

Example server functions:

```ts
const getRecordsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => await getRecords({ userId: context.session.user.id }));

const createRecordFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createRecordInputSchema)
  .handler(
    async ({ context, data }) => await createRecord(data, { userId: context.session.user.id }),
  );
```

Example shared query options:

```ts
function recordsQueryOptions() {
  return queryOptions({
    queryFn: () => getRecordsFn(),
    queryKey: ["records"],
  });
}
```

Example route:

```tsx
const Route = createFileRoute("/_authenticated/records")({
  loader: async ({ context }) => {
    await context.queryClient.query(recordsQueryOptions());
  },
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: RecordsPage,
});

export { Route };
```

Example page, in a separate module:

```tsx
function RecordsPage() {
  const { data: records } = useSuspenseQuery(recordsQueryOptions());
  return <RecordList records={records} />;
}

export { RecordsPage };
```

Example mutation hook:

```ts
function useCreateRecord() {
  const queryClient = useQueryClient();
  const createRecord = useServerFn(createRecordFn);

  return useMutation({
    mutationFn: (data: CreateRecordInput) => createRecord({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recordsQueryOptions().queryKey }),
  });
}
```

### Validation and errors

- Register application error serialization in Start's `serializationAdapters` so
  server-function failures reject with `ApplicationError` on the client. Transport
  only the stable code, configured public message, name, and status metadata.
  Custom message overrides, details, causes, and server stacks remain server-side.
  Status metadata does not set the server-function response's HTTP status.
- Keep queries and mutations rejecting on failures. Preserve Router redirects
  and not-found signals through error middleware.
- Follow the [server-operation and Query conventions](CODING_STANDARDS.md#error-handling):
  return domain data on success and propagate failures. A resolved error envelope
  is successful Query data, so it does not activate Query's failure handling.
- Create Query clients through `src/app/query-client.ts`. Cache callbacks show
  one browser toast per failed mutation or refetch of previously successful data.
  Initial query failures remain owned by Router. Redirects, not-found signals,
  cancellation, and server rendering do not produce notifications.
- Keep mutation callbacks and awaited invalidation intact when displaying
  failures in the owning UI.
- Show `error.message` from server-function failures in toasts. Keep route
  boundary messaging generic so loader diagnostics do not reach the page.
- Keep failed confirmation dialogs open with inline mutation feedback so users
  can retry.
- Pass Zod schemas directly to `useAppForm` validators through Standard Schema.
- Subscribe to form state using `useSelector` (replace deprecated `useStore`).
- Parameterize form field components with explicit field generics (replace `AnyFieldApi`).
- Use `z.input<typeof schema>` for form values. Form passes original input to
  `onSubmit`; call `schema.parse(value)` when transformed output is needed.
- Start's `.validator(schema)` passes validated and transformed output to its
  handler.
- Render `<form.FormError />` inside `<form.AppForm>` and `<form.Form>` to show
  submit validation messages and `error.message` from failed submissions.
- Store submission failures in `errorMap.onSubmit` while preserving draft values.
  Editing a field reruns validation, clears submission feedback, and enables
  valid forms to retry. Keep submit readiness based on `canSubmit`.
- See the [Form submission guide](https://tanstack.com/form/latest/docs/framework/react/guides/submission-handling)
  for validation and transformation behavior.

## Authentication and rate limiting

- Consistency and atomicity: Rate limiting in D1 relies on SQLite single-writer
  semantics per database. Cloudflare D1 provides read-replication with primary writes;
  counter increments execute against the database. Under concurrent distributed
  requests across global edges, rate limiting offers per-database serialization
  without requiring a distributed global lock or promising unsupported strict cross-region
  linearizability.
