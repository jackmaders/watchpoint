# Implementation

Every pattern this project sets, in the order you meet them: the packages, the
layout, the layer boundaries, the routes, the database layer, the business
logic above it, and the client data flow that joins them.

**This describes a from-scratch setup, and it keeps no compatibility with the
Drizzle 0.x line.** Where a choice existed, it took the cleanest one available
on the 1.0 line rather than the one that also works on 0.x.

Each section ends with acceptance criteria. They are checkable, either by a
command or by reading one file, so a port can be verified rather than assumed.

Section 15 carries the quotes and sources behind the rules, so nothing here
rests on assertion alone.

---

## 1. The stack

### Runtime and framework

| Package                   | Version        | Role                                     |
| ------------------------- | -------------- | ---------------------------------------- |
| `@tanstack/react-start`   | `latest` (1.x) | SSR framework, server functions          |
| `@tanstack/react-router`  | `latest` (1.x) | file routes, loaders                     |
| `react`, `react-dom`      | `^19.2`        | UI                                       |
| `vite`                    | `^8`           | bundler and dev server                   |
| `@cloudflare/vite-plugin` | `^1.26`        | runs the app on workerd in dev and build |
| `wrangler`                | `^4.128`       | D1 commands, `wrangler types`, deploy    |

### Data

| Package                            | Version              | Role                                      |
| ---------------------------------- | -------------------- | ----------------------------------------- |
| `drizzle-orm`                      | `1.0.0-rc.4`, pinned | query builder, and `drizzle-orm/zod`      |
| `drizzle-kit`                      | `1.0.0-rc.4`, pinned | migration generation                      |
| `zod`                              | `^4.5`               | input validation, a peer of `drizzle-orm` |
| `@tanstack/react-query`            | `^5.102`             | client cache and invalidation             |
| `@tanstack/react-router-ssr-query` | `^1.167`             | hands the server cache to the client      |

### Architecture and tooling

| Package                                     | Version        | Role                              |
| ------------------------------------------- | -------------- | --------------------------------- |
| `steiger`, `@feature-sliced/steiger-plugin` | `^0.6`, `^0.7` | Feature-Sliced Design linter      |
| `@tanstack/router-cli`                      | `^1.132`       | `tsr generate` for the route tree |
| `typescript`                                | `^6`           | `tsc --noEmit` is the type gate   |
| `tailwindcss`, `@tailwindcss/vite`          | `^4.1`         | styling                           |

### How they fit together

Five joins do the real work, and each one is a decision:

1. **Cloudflare's Vite plugin owns the server environment.** `vite.config.ts`
   lists `cloudflare({ viteEnvironment: { name: "ssr" } })` before
   `tanstackStart()`, so the app runs on workerd in development, and `env.DB`
   exists in dev exactly as it does in production.
2. **Drizzle reads the D1 binding, never a connection string.** The client is
   built per request from `env.DB`, which is why `shared/db/client.ts` is a
   factory and not a module-level constant.
3. **drizzle-kit and wrangler split the migration job.** drizzle-kit writes the
   SQL from the schema. wrangler applies it, locally or remotely. Neither tool
   needs the other's credentials.
4. **`drizzle-orm/zod` keeps validation on the schema.** The 1.0 line ships the
   integration, so no companion package exists to drift from the ORM version.
5. **TanStack Query holds client state, and the router warms it.**
   `setupRouterSsrQueryIntegration` dehydrates the server cache into the
   document, so a page renders with data and does not refetch on hydration.

### Scripts

```
dev               vite dev --port 3000
build             vite build
preview           npm run build && vite preview
deploy            npm run build && wrangler deploy
generate-routes   tsr generate
cf-typegen        wrangler types
db:generate       drizzle-kit generate
db:migrate:local  wrangler d1 migrations apply tanstack-drizzle-db --local
db:migrate:prod   wrangler d1 migrations apply tanstack-drizzle-db --remote
db:status:local   wrangler d1 migrations list tanstack-drizzle-db --local
db:status:prod    wrangler d1 migrations list tanstack-drizzle-db --remote
lint:fsd          steiger ./src
```

Every `db:*` script names the **database**, not the binding. A binding can be
renamed, and then a script silently targets the wrong database.

### Which APIs require the 1.0 line

Five, and none exists on `0.45.2`. Both packages were checked:

| API                           | `0.45.2` | `1.0.0-rc.4`                         |
| ----------------------------- | -------- | ------------------------------------ |
| the `drizzle-orm/zod` subpath | absent   | present                              |
| `TableFilter`                 | absent   | present                              |
| `relationsFilterToSQL`        | absent   | present                              |
| `relationsOrderToSQL`         | absent   | present                              |
| `getColumns`                  | absent   | present, replacing `getTableColumns` |

Upgrading an existing 0.x project means four things: delete `drizzle-zod`, add
`migrations_pattern` to the D1 binding, expect the object `where` clause from
the relational-query rewrite, and check every library that owns Drizzle tables.

### Acceptance criteria

- [ ] `drizzle-orm` and `drizzle-kit` are pinned to the same exact release
      candidate, with no caret.
- [ ] `drizzle-zod` is absent from `package.json`.
- [ ] `zod` is a direct dependency, and no other validation library is present.
- [ ] `npm run db:status:local` prints migration state rather than an error.
- [ ] `npm run cf-typegen` leaves `worker-configuration.d.ts` unchanged when
      the binding has not changed.
- [ ] `npx tsc -p tsconfig.json` exits 0.
- [ ] `npm run lint:fsd` reports no problems, with no rule disabled.

---

## 2. Layout

```
src/
  app/                      the top layer: wiring only
    router.tsx              QueryClient, router, SSR query integration
    routeTree.gen.ts        generated, never edited
    routes/                 one file per URL, each a wrapper
      __root.tsx
      index.tsx
      about.tsx
      posts.tsx
      users.tsx
    shells/                 the document shell and its head
      RootShell.tsx
      head.ts
      index.ts
    styles/styles.css       the global stylesheet
  pages/                    one slice per screen
    posts/
      api/                  server functions, query options, loader, hooks
      model/                the rules, and the schemas that type their input
      ui/                   the components
      index.ts              the slice's public API
    users/ …
    home/, about/           ui only
  widgets/                  reusable blocks
    header/, footer/
  shared/                   infrastructure, no business logic
    api/                    query keys
    db/                     the database layer
      client.ts
      query.ts
      schema/               one file per table
      queries/              one module per domain
      index.ts
drizzle/                    generated migrations, one folder each
docs/implementation.md      this file
```

Only tool config sits at the project root: `package.json`, `tsconfig.json`,
`vite.config.ts`, `tsr.config.json`, `drizzle.config.ts`, `wrangler.jsonc`,
`steiger.config.ts`, `worker-configuration.d.ts`, `AGENTS.md`.

### Acceptance criteria

- [ ] No application code sits outside `src/`.
- [ ] Every slice under `pages/` and `widgets/` has an `index.ts`.
- [ ] `shared/` has no slices. It is organised by segment, and each segment
      exposes its own `index.ts`.
- [ ] `src/app/routeTree.gen.ts` is generated, and no commit edits it by hand.

---

## 3. Layer boundaries

Feature-Sliced Design, linted by Steiger. Imports run one way only:

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
```

| Layer     | Holds                                          | Never holds                            |
| --------- | ---------------------------------------------- | -------------------------------------- |
| `app`     | router, routes, document shells, global styles | UI blocks, business rules, data access |
| `pages`   | a screen's UI, its rules, its data access      | anything a second page needs           |
| `widgets` | reusable blocks such as the header             | another widget's import                |
| `shared`  | infrastructure: the db layer, cache keys       | business rules of any kind             |

Three rules earn their own line, because each was learned from a failure:

1. **A widget never imports another widget.** Steiger's `fsd/forbidden-imports`
   rejects it. Put the composing module on a higher layer, which is why the
   document shell lives in `app/shells` and not in `widgets`.
2. **A page never imports another page.** So anything two pages need moves down,
   and cross-page cache keys live in `shared/api`.
3. **Business rules never enter `shared`.** They live in the `model/` segment of
   the page that uses them, and move to `entities/<name>/model/` when a second
   page needs them. Steiger rejects a slice with one consumer, so the linter
   enforces that order.

There is no `entities/` or `features/` layer yet. Neither is created until a
second consumer exists.

### Acceptance criteria

- [ ] `npm run lint:fsd` reports no problems.
- [ ] `grep -rn "@/pages" src/pages` returns nothing.
- [ ] `grep -rn "@/widgets" src/widgets` returns nothing.
- [ ] No file under `src/shared` imports from `@/pages`, `@/widgets`,
      `@/features` or `@/entities`.
- [ ] No empty layer folder exists.

---

## 4. Routes, and how they sit beside pages

Route files live in `src/app/routes`, which is **not** the TanStack default.
Two files point at it, and they change together:

```ts
// vite.config.ts
tanstackStart({
  router: {
    entry: './app/router.tsx',
    routesDirectory: '../routes',      // resolved from srcDirectory
    generatedRouteTree: 'app/routeTree.gen.ts',
  },
}),
```

```json
// tsr.config.json — the tsr generate CLI, resolved from the working directory
{
  "target": "react",
  "routesDirectory": "./src/app/routes",
  "generatedRouteTree": "./src/app/routeTree.gen.ts"
}
```

**A route file binds a URL to exports, and holds nothing else.** All four are
this thin:

```tsx
// src/app/routes/posts.tsx
import { createFileRoute } from "@tanstack/react-router";
import { PostsPage, loadPosts } from "@/pages/posts";

export const Route = createFileRoute("/posts")({
  loader: loadPosts,
  component: PostsPage,
});
```

The root route is the same shape, and it declares the router context that
TanStack Query needs:

```tsx
// src/app/routes/__root.tsx
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: rootShellHead,
    shellComponent: RootShell,
  },
);
```

Naming: a nested URL uses a dotted filename, `api.comments.ts` for
`/api/comments`, not a folder. A folder called `api` inside a segment trips
Steiger's `fsd/no-reserved-folder-names`, and the dotted name gives the same
URL with no rule disabled.

### Acceptance criteria

- [ ] Every file in `src/app/routes` contains only `createFileRoute` (or
      `createRootRouteWithContext`) with `loader`, `component` and `head`.
- [ ] No route file imports from `@/shared/db`.
- [ ] No route file declares a loader body. It passes a function from the page.
- [ ] `vite.config.ts` and `tsr.config.json` name the same routes directory and
      the same generated tree.
- [ ] `npm run generate-routes` leaves `routeTree.gen.ts` unchanged when no
      route file has changed.

---

## 5. `shared/db`: the database layer

### The client is built per request

```ts
// client.ts
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export function createDbClient() {
  return drizzle(env.DB);
}
```

Never cache it. Cloudflare states the rule: "you must be careful when
'polluting' global scope with derivatives of your bindings… The correct
approach would be to create a new client instance for each request." A
`globalThis` singleton keeps a stale binding after a secret rotates, and D1 has
no connection pool, so caching buys nothing.

### One file per table

```ts
// schema/comment.ts
export const commentsTable = sqliteTable("comments_table", {
  id: int().primaryKey({ autoIncrement: true }),
  postId: int()
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: int().notNull(),
  body: text().notNull(),
  createdAt: int().notNull(),
});
```

`drizzle.config.ts` reads `./src/shared/db/schema/*`, so that folder holds
nothing that re-exports a table. A duplicate definition makes drizzle-kit warn
about duplicate columns.

### The shared clause builders

`query.ts` holds only what every read needs:

```ts
export const DEFAULT_LIMIT = 100;

export type QueryOptions<T extends Table> = {
  filter?: TableFilter<T>;
  order?: Partial<Record<keyof InferSelectModel<T>, "asc" | "desc">>;
  limit?: number;
};

/** Turns a table's filter options into a WHERE clause. */
export function filterToSQL<T extends Table>(
  table: T,
  filter: TableFilter<T> = {},
) {
  // the cast is unavoidable: AnyTableFilter is index-signed and invariant
  return relationsFilterToSQL(table, filter as AnyTableFilter);
}

/** Turns a table's order options into an ORDER BY clause. */
export function orderToSQL<T extends Table>(
  table: T,
  order: QueryOptions<T>["order"],
  tiebreak: keyof InferSelectModel<T> & string,
) {
  // the tiebreak always adds an entry, so the result is never undefined
  return relationsOrderToSQL(table, {
    ...order,
    [tiebreak]: order?.[tiebreak] ?? "asc",
  })!;
}
```

Four rules shaped that file:

1. **The filter type is derived, not declared.** `TableFilter<typeof table>`
   gives 19 operators plus `AND`, `OR`, `NOT` and `RAW`, typed against the real
   column types, and a second table needs no extra declaration.
2. **The empty default is load-bearing.** `relationsFilterToSQL` reads
   `Object.entries(filter)` with no guard, so an absent filter would throw.
3. **The order option keys off the row type, not the table.** `keyof T` admits
   `_` and `$inferSelect`, which compile and then reach SQLite as columns that
   do not exist.
4. **Neither helper touches the builder.** In dynamic mode `.where()` and
   `.orderBy()` replace rather than merge, and the builder mutates in place, so
   a second call silently discards the first. A helper returns `SQL`, or it
   handles a clause nobody else owns. Measured on `1.0.0-rc.4`:

   ```
   q.where(gt(users.age, 18)); q.where(eq(users.name, 'ada'));
   q.orderBy(asc(users.name)); q.orderBy(desc(users.id));
   q.toSQL()
   -> select … where "users_table"."name" = ? order by "users_table"."id" desc
      params: [ 'ada' ]     // age > 18 and order by name are both gone
   q2.limit(5) === q2       // -> true, the builder mutates in place
   ```

### One module per domain

```ts
type Post = InferSelectModel<typeof postsTable>;
type PostValues = InferInsertModel<typeof postsTable>;

export function queryPosts(
  options: QueryOptions<typeof postsTable> = {},
  db = createDbClient(),
) {
  const { filter, order, limit = DEFAULT_LIMIT } = options;

  return db
    .select()
    .from(postsTable)
    .where(filterToSQL(postsTable, filter))
    .orderBy(orderToSQL(postsTable, order, "id"))
    .limit(limit)
    .all();
}

export function createPost(values: PostValues, db = createDbClient()) {
  return db.insert(postsTable).values(values).returning().get();
}

export function getPostById(id: Post["id"], db = createDbClient()) {
  return db.select().from(postsTable).where(eq(postsTable.id, id)).get();
}

export function updatePost(
  id: Post["id"],
  values: Partial<PostValues>,
  db = createDbClient(),
) {
  return db
    .update(postsTable)
    .set(values)
    .where(eq(postsTable.id, id))
    .returning()
    .get();
}

export function deletePost(id: Post["id"], db = createDbClient()) {
  return db.delete(postsTable).where(eq(postsTable.id, id)).returning().get();
}
```

Six conventions hold across every module:

1. **The client is the last parameter, and it defaults.** Callers pass nothing.
   A caller passes one to read another binding, or to share a client across a
   `db.batch([...])`.
2. **Every mutation returns the affected row** through `RETURNING`, so a create
   hands back its generated id and a delete hands back what it removed.
3. **A key lookup uses `eq`**, not the filter object. It needs no cast.
4. **A read always has a limit**, defaulted, because an unbounded select on D1
   can hit the response-size limit rather than fail loudly.
5. **A bulk operation is a named function**, such as `deletePostsByAuthor`, and
   returns every affected row so a caller can count them.
6. **A join selects explicit fields**, with the related table nested:

```ts
.select({
  id: postsTable.id,
  title: postsTable.title,
  author: { id: usersTable.id, name: usersTable.name },
})
.from(postsTable)
.innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
```

`filterToSQL` and `orderToSQL` still apply, because the filter type is scoped to
one table. Filtering by a joined column is what this option type cannot express.

### Acceptance criteria

- [ ] `grep -rn "globalThis" src/shared/db` returns nothing, and `client.ts`
      exports a function rather than a client.
- [ ] `import { env }` appears in `src/shared/db/client.ts` and nowhere else in
      the layer.
- [ ] Each file in `schema/` defines exactly one table and re-exports nothing.
- [ ] `npm run db:generate` reports no schema changes on a clean tree, and
      prints no duplicate-column warning.
- [ ] Every exported query function takes its client as an optional last
      parameter.
- [ ] Every mutation ends in `.returning().get()` or `.returning().all()`.
- [ ] No function in `shared/db` contains a conditional that encodes a rule
      about the domain, such as a limit on a value or a rate.
- [ ] `filterToSQL` and `orderToSQL` are the only place the `AnyTableFilter`
      cast and the non-null assertion appear.

---

## 6. `shared/api`: cache keys

```ts
export const queryKeys = {
  posts: ["posts"],
  users: ["users"],
} as const;
```

A page may not import another page's query options, so a cross-domain
invalidation would otherwise repeat a string, and a rename would stop
refreshing the other list with nothing to catch it.

### Acceptance criteria

- [ ] `grep -rn '\["posts"\]\|\["users"\]' src | grep -v query-keys` returns
      nothing.
- [ ] Every `queryOptions` and every `invalidateQueries` call reads a key from
      `queryKeys`.

---

## 7. The boundary between `shared/db` and a page's `api` and `model`

This is the boundary that decides whether the layer stays reusable. Three
concerns, three homes:

| Concern                                                  | Home          | Example                                                         |
| -------------------------------------------------------- | ------------- | --------------------------------------------------------------- |
| How to reach the data                                    | `shared/db`   | `queryComments`, `createComment`, `deletePostsByAuthor`         |
| What the data means, and which rules govern a change     | page `model/` | "an author may not comment twice inside 30 seconds"             |
| How this screen reaches it, and how the client caches it | page `api/`   | `fetchPosts`, `postsQueryOptions`, `loadPosts`, `useAddComment` |

Read it as three questions:

- **Would another screen want this exact function, unchanged?** Then it belongs
  in `shared/db`. `queryComments({ filter: { postId } })` is reusable.
  `addComment` is not, because it carries this product's rules.
- **Does it decide something?** A limit, a rate, a policy, an ordering of
  writes. Then it belongs in `model/`. `shared/db` never decides.
- **Does it exist because of React, the router, or the cache?** Then it belongs
  in `api/`. A server function, query options, a loader, a mutation hook.

Concretely, the comment flow crosses all three:

```
shared/db/queries/comment.ts   createComment, queryComments      how
pages/posts/model/add-comment  the six rules, and the rejections  what it means
pages/posts/api/add-comment    the server function and the hook   how this screen calls it
pages/posts/ui/PostsPage       the form, and the outcome text      what the user sees
```

Two mistakes to watch for, both of which I made first:

- **Putting the rules in `shared/db`.** Then every consumer inherits this
  product's policy, and the layer stops being infrastructure.
- **Putting the data access in the page.** Then a second screen either
  duplicates the query or imports another page, which the linter rejects.

### Acceptance criteria

- [ ] `shared/db` contains no message, no rejection reason, and no threshold.
- [ ] Each `model/` file imports from `@/shared/db` and never builds SQL.
- [ ] Each `model/` function is callable from a test with a client argument, and
      needs no React and no router.
- [ ] Each `api/` file contains only framework glue: `createServerFn`,
      `queryOptions`, a loader, a mutation hook.
- [ ] No `ui/` file imports from `@/shared/db`.

---

## 8. A page's `model/`: the business rules

```ts
export const addCommentSchema = createInsertSchema(commentsTable).pick({
  postId: true,
  authorId: true,
  body: true,
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export type AddCommentResult =
  | { status: "created"; comment: Comment }
  | { status: "rejected"; reason: AddCommentRejection };
```

Five conventions:

1. **A broken rule returns, it does not throw.** The result is a union, so the
   caller must handle it. No try/catch anywhere in the layer.
2. **Encode a rule in the type when you can.** A policy union removed two
   runtime checks from `banAuthor`:

   ```ts
   export type BanAuthorContentPolicy =
     | { removeContent: true }
     | { removeContent: false; reassignToAuthorId: User["id"] };
   ```

3. **The input schema lives beside the function**, and the TypeScript type
   derives from it, so the chain runs table → schema → type with no shape
   declared twice.
4. **Cheap checks first.** Length and pattern tests need no database. Only then
   does the function read.
5. **Every check runs before the first write.** D1 offers no interactive
   transaction, so a failure part way through cannot roll back. `db.batch()` is
   the atomic alternative, and it takes unexecuted builders, which functions
   ending in `.all()` or `.get()` cannot supply.

Server-side values come from the server. `addComment` sets `createdAt` from
`Date.now()`, so a caller cannot backdate a comment past the rate limit.

### Acceptance criteria

- [ ] Every exported rule function returns a discriminated union, and throws
      nothing.
- [ ] `grep -rn "try {" src/pages` returns nothing.
- [ ] Each input type is `z.infer<typeof …Schema>`, not a hand-written shape.
- [ ] Every validation precedes every write, in reading order.
- [ ] A comment names each place where a race is possible, and what would
      close it.

---

## 9. A page's `api/`: server functions, cache, actions

```ts
export const fetchPosts = createServerFn().handler(async () => {
  return queryPostsWithAuthor({ order: { createdAt: "desc" } });
});

export const postsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.posts,
    queryFn: () => fetchPosts(),
  });

/** Warms the cache the page reads, so the server renders real data. */
export async function loadPosts({
  context,
}: {
  context: { queryClient: QueryClient };
}) {
  await context.queryClient.query({
    ...postsQueryOptions(),
    staleTime: "static",
  });
}
```

Three things travel together in one file: the server function, its query
options, and the loader that warms them. Change the key, and all three are in
front of you.

The loader types its argument structurally, rather than importing the router's
loader context, so the page knows nothing about the route. `staleTime: "static"`
takes what is cached and fetches only when it is absent, which is what a loader
wants. It replaces `ensureQueryData`, which is deprecated.

An action is a server function plus a hook that owns the invalidation:

```ts
export const addCommentAction = createServerFn({ method: "POST" })
  .validator(addCommentSchema)
  .handler(({ data }) => addComment(data));

/** Adds a comment, then refreshes the list it belongs to. */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addCommentAction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.posts }),
  });
}
```

`.validator()` accepts a plain function returning the typed input, or any
Standard Schema validator, which a zod v4 schema is. Use `.validator()`, not
`.inputValidator()`: the latter is deprecated, though Cloudflare's framework
guide still shows it.

A mutation that touches another domain invalidates that key too. `useBanAuthor`
invalidates `queryKeys.users` and `queryKeys.posts`, because a ban removes posts
and comments. An invalidated key refetches only while a mounted component
observes it. Otherwise it is marked stale, and refetches when a page next reads
it.

### Acceptance criteria

- [ ] Each read has a server function, `queryOptions`, and a loader, in one
      file.
- [ ] No component calls a server function directly. It calls a hook.
- [ ] No component holds a `queryClient`.
- [ ] Every action declares `.validator(schema)`.
- [ ] `grep -rn "ensureQueryData\|inputValidator" src` returns nothing.
- [ ] Every mutation hook invalidates every key its writes can affect.

---

## 10. A page's `ui/`

```tsx
export function PostsPage() {
  const posts = useSuspenseQuery(postsQueryOptions());
  const addComment = useAddComment();

  type PostRow = (typeof posts.data)[number];

  const submitComment =
    (post: PostRow) => (event: SubmitEvent<HTMLFormElement>) => { … };

  return … <form onSubmit={submitComment(post)}> …
}
```

Three conventions:

1. **The component holds no data state.** It reads the query, and derives the
   outcome text from `mutation.data`. No `useState` mirrors a server result.
2. **Handlers are named functions, not inline arrows in JSX.**
3. **Row types derive from the query data**, `(typeof posts.data)[number]`, so
   the component cannot drift from the row shape and needs no import for it.

Event types come from React and must avoid the deprecated aliases: `SubmitEvent`
for a form submit, since `onSubmit` is declared as `SubmitEventHandler`.
`FormEvent` is deprecated, and the types say it "doesn't actually exist".

### Acceptance criteria

- [ ] No `ui/` file calls `useQueryClient`, `useMutation` or a server function.
- [ ] No `useState` holds a copy of server data.
- [ ] `grep -rn "FormEvent" src` returns nothing.
- [ ] Every JSX event prop receives a named function.

---

## 11. Migrations

```bash
npm run db:generate        # drizzle-kit writes drizzle/<timestamp>_<name>/migration.sql
npm run db:migrate:local   # wrangler applies it to the local D1
npm run db:migrate:prod    # then to the remote one
npm run db:status:local    # what is applied
```

The D1 binding needs `migrations_pattern`, because drizzle-kit 1.0 writes a
folder per migration:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "tanstack-drizzle-db",
    "database_id": "<uuid from wrangler d1 create>",
    "migrations_dir": "drizzle",
    "migrations_pattern": "drizzle/*/migration.sql"
  }
]
```

**Foreign keys.** D1 enforces them by default, "identical to the behaviour you
would observe when setting `PRAGMA foreign_keys = on`", so `ON DELETE CASCADE`
fires. SQLite cannot add a constraint in place, so drizzle-kit recreates the
table and wraps the copy in `PRAGMA foreign_keys`, which D1 ignores inside a
migration. If a remote apply reports `FOREIGN KEY constraint failed`, swap that
first statement for `PRAGMA defer_foreign_keys = on`.

### Acceptance criteria

- [ ] `npm run db:generate` on a clean tree reports no schema changes.
- [ ] `npm run db:status:local` lists every migration as applied.
- [ ] A generated migration is committed with the schema change that caused it.
- [ ] `migrations_dir` and `migrations_pattern` both appear in the binding.

---

## 12. Gotchas, each measured

| Trap                                                | What happens                                                                                                                                                                                                             | What to do                                               | Source                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `relationsFilterToSQL(table, undefined)`            | throws `TypeError: Cannot convert undefined or null to object`, because it opens with `Object.entries(filter)`                                                                                                           | default the filter to `{}`                               | `node_modules/drizzle-orm/relations.js`                                                                                                               |
| `filter as AnyTableFilter`                          | no assignment works. `AnyTableFilter` adds a string index signature, and a spread past that fails on `Property 'id' is incompatible with index signature`, because `RelationsFieldFilter` is invariant in its value type | keep the cast in one helper                              | measured on `1.0.0-rc.4`                                                                                                                              |
| Two `.where()` calls in dynamic mode                | the first clause vanishes, and the builder mutates in place. A maintainer confirms it is intended, and the merge request is closed                                                                                       | never call `.where()` in a helper                        | [dynamic query building](https://orm.drizzle.team/docs/dynamic-query-building), [issue 2321](https://github.com/drizzle-team/drizzle-orm/issues/2321) |
| `inArray` over a caller's list                      | D1 caps a query at 100 bound parameters, and `limit` and `offset` each cost one                                                                                                                                          | cap the list                                             | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)                                                                                    |
| `like(col, '%term%')`                               | a leading `%` defeats any index                                                                                                                                                                                          | expect a scan, or index differently                      | [use indexes](https://developers.cloudflare.com/d1/best-practices/use-indexes/)                                                                       |
| Sorting by a non-key column                         | an `INTEGER PRIMARY KEY` needs no index, and every other column does                                                                                                                                                     | add an index, or narrow the option with `Exclude`        | [use indexes](https://developers.cloudflare.com/d1/best-practices/use-indexes/)                                                                       |
| Offset paging without a unique trailing column      | rows repeat or vanish between pages, silently                                                                                                                                                                            | append the primary key to every order                    | [limit/offset](https://orm.drizzle.team/docs/guides/limit-offset-pagination)                                                                          |
| A cursor comparing a different column from the sort | pages overlap or skip. Verified locally: ordering by title while comparing `id` lost a row entirely                                                                                                                      | keep the `where` and the `orderBy` in lockstep           | [cursor pagination](https://orm.drizzle.team/docs/guides/cursor-based-pagination)                                                                     |
| A re-export inside `schema/`                        | drizzle-kit sees the table twice and warns about duplicate columns                                                                                                                                                       | keep any aggregate outside the glob                      | measured with `db:generate`                                                                                                                           |
| `AUTOINCREMENT` ids                                 | keep climbing past deleted rows                                                                                                                                                                                          | never infer order or count from an id                    | measured locally                                                                                                                                      |
| `getTableColumns`                                   | deprecated on the 1.0 line                                                                                                                                                                                               | use `getColumns`                                         | [v0 to v1 changes](https://orm.drizzle.team/docs/v0-v1-changes)                                                                                       |
| `ensureQueryData`                                   | deprecated                                                                                                                                                                                                               | `queryClient.query({ ...options, staleTime: 'static' })` | the deprecation text in `@tanstack/query-core`                                                                                                        |
| `inputValidator`                                    | deprecated, though Cloudflare's framework guide still shows it                                                                                                                                                           | `.validator()`                                           | the deprecation text in `@tanstack/start-client-core`                                                                                                 |
| `FormEvent`                                         | deprecated: "FormEvent doesn't actually exist"                                                                                                                                                                           | `SubmitEvent`, `ChangeEvent` or `SyntheticEvent`         | `@types/react`                                                                                                                                        |
| The `drizzle-zod` package                           | its `latest` peers `drizzle-orm >=0.36.0`, which a `1.0.0-rc` build does not satisfy                                                                                                                                     | import from `drizzle-orm/zod`                            | `npm view drizzle-zod peerDependencies`                                                                                                               |
| A folder named `api` inside a segment               | trips `fsd/no-reserved-folder-names`                                                                                                                                                                                     | name the file, `api.comments.ts`                         | Steiger                                                                                                                                               |
| Editing a server-function file while dev serves     | React SSR crash, `Cannot read properties of null (reading 'useContext')`                                                                                                                                                 | restart the dev server                                   | measured locally                                                                                                                                      |

---

---

## 13. What is deliberately absent

- **Pagination options.** A list query takes `filter`, `order` and `limit`.
  Cursor and offset paging belong in a dedicated function, because a generic
  keyset generator has to keep the `where` clause and the `orderBy` in lockstep
  per sort column, which is where such helpers go wrong.
- **A filter language of our own.** Drizzle 1.0's `TableFilter` is already
  derived and typed. Wrapping a query builder in generated options
  re-implements it worse.
- **A repository or service object.** The client is request-scoped, so an object
  holding one cannot exist, and a per-request factory is a closure in costume.
- **An `entities/` or `features/` layer**, until a second consumer earns it.
- **HTTP endpoints.** A page owns its actions as server functions.
- **A test framework.** The `model/` functions are the natural first tests, and
  nothing here runs them yet.

---

## 14. Porting checklist

1. Create the database, and keep the id: `npx wrangler d1 create <name>`.
2. Install: `npm i drizzle-orm@1.0.0-rc.4 zod @tanstack/react-query
@tanstack/react-router-ssr-query`, then `npm i -D drizzle-kit@1.0.0-rc.4`.
3. Bind D1 in `wrangler.jsonc`, with `migrations_dir` and
   `migrations_pattern`.
4. Point `drizzle.config.ts` at `./src/shared/db/schema/*`.
5. Add the `db:*` scripts, naming the database.
6. Map the `@/` alias in `tsconfig.json`, and make the bundler agree.
7. Copy `shared/db/client.ts` and `shared/db/query.ts` unchanged.
8. Copy one `schema/` file and one `queries/` module, then adapt the columns.
9. Wire the router: `QueryClient`, router context,
   `setupRouterSsrQueryIntegration`, and `createRootRouteWithContext`.
10. Add `shared/api/query-keys.ts`.
11. Build one page slice with `api/`, `model/` and `ui/`, and one thin route.
12. Run the gates: `tsc`, `lint:fsd`, `db:generate`, `db:status:local`.

---

## 15. Evidence

The load-bearing quotes, so a rule can be checked without leaving this file.

**The client is built per request.** Cloudflare, on deriving anything from a
binding at module scope: "you must be careful when 'polluting' global scope
with derivatives of your bindings. Anything you create there might continue to
exist despite making changes to any underlying bindings… The correct approach
would be to create a new client instance for each request." The same page adds
the second wall: "Workers do not allow I/O from outside a request context."
([Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/))

**Drizzle builds its client inside the handler.** The D1 page shows
`const db = drizzle(env.<BINDING_NAME>)` inside `fetch`, never at module scope.
([Drizzle × Cloudflare D1](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1))

**Optional filters need no branching.** `and()` and `or()` accept `undefined`
entries and drop them, which is the whole mechanism behind `filterToSQL`, and
an all-`undefined` filter emits no `WHERE` clause at all.
([Conditional filters](https://orm.drizzle.team/docs/guides/conditional-filters-in-query))

**`$dynamic()` exists for shared helpers.** A builder method may be called once,
which "becomes a problem when you want to build a query dynamically, i.e. if
you have a shared function that takes a query builder and enhances it." The
same page gives the SQLite generic, `SQLiteSelect`, not the `PgSelect` of its
example. ([Dynamic query building](https://orm.drizzle.team/docs/dynamic-query-building))

**Ordering must be total.** "For consistent pagination, ensure ordering by a
unique column… If you need to order by a non-unique column, you should also
append a unique column to the ordering."
([Limit/offset pagination](https://orm.drizzle.team/docs/guides/limit-offset-pagination))

**A keyset cursor couples `where` to `orderBy`.** Over a non-unique column it
becomes `or(gt(a, x), and(eq(a, x), gt(b, y)))`, and as you add sort columns
"you'll need to add more filters to the `where` clause for the cursor
comparison to ensure consistent pagination." That coupling is why paging
belongs in a dedicated function, never in a generic option.
([Cursor pagination](https://orm.drizzle.team/docs/guides/cursor-based-pagination))

**The filter option type is first-party.** Relational queries v2 changed `where`
from a callback to an object, which is what makes `TableFilter` derivable, and
`relationsFilterToSQL` turns that object into `SQL` for a plain `db.select()`.
([Relations v1 to v2](https://orm.drizzle.team/docs/relations-v1-v2),
[v0 to v1 changes](https://orm.drizzle.team/docs/v0-v1-changes))

**There is no interactive transaction on D1.** The atomic unit is
`db.batch([...])`, and a failed statement aborts or rolls back the whole
sequence. Batch takes built, unexecuted queries, which is why a multi-write
rule cannot compose from functions that end in `.all()` or `.get()`.
([Batch API](https://orm.drizzle.team/docs/sqlite/batch-api))

**D1 enforces foreign keys.** "By default, D1 enforces that foreign key
constraints are valid within all queries and migrations. This is identical to
the behaviour you would observe when setting `PRAGMA foreign_keys = on`." A
migration that must violate them temporarily needs
`PRAGMA defer_foreign_keys = on`.
([Foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/),
[Migrations](https://developers.cloudflare.com/d1/reference/migrations/))

**Wrangler reads nested migrations only with a pattern.** "If you use an ORM
such as Drizzle that writes each migration as its own subdirectory… set
`migrations_pattern` to the glob that matches your layout."
([Migrations](https://developers.cloudflare.com/d1/reference/migrations/))

**Business logic stays out of `shared`.** Feature-Sliced Design puts CRUD in the
shared layer and rules above it, and its linter rejects a slice with a single
consumer, which is why a rule starts in the page that uses it.
([Steiger](https://github.com/feature-sliced/steiger))

**A query builder is not a repository.** Builders of this kind are "a freeform
typed canvas to build queries from", so wrapping them in repository methods for
filtering and pagination means "you're probably just reinventing a worse version
of the syntax your ORM provides you." That is why the option layer stops at
`filter`, `order` and `limit`.
([You might not need the repository pattern](https://www.jayfreestone.com/writing/you-might-not-need-the-repository-pattern/))

**The Query integration is the official one.** The router creates the
`QueryClient`, passes it as context, and calls `setupRouterSsrQueryIntegration`,
with `createRootRouteWithContext` on the root route.
([start-basic-react-query](https://github.com/TanStack/router/tree/main/examples/react/start-basic-react-query))
