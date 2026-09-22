# Source architecture decisions

This document records the project’s adopted source-structure decisions. It
adapts Feature-Sliced Design (FSD) to the project’s preference for deep
modules, explicit user interactions, and good locality for related code.

The goal is not to maximize the number of folders. A folder or module earns its
place when it gives callers a useful interface, protects an invariant, or keeps
a change local.

## Decision summary

- Use the FSD layer order: `app`, `pages`, `widgets`, `features`, `entities`,
  `shared`.
- Name feature slices as a strict user interaction: `{noun}-{verb}`.
- Name entity slices with a noun: `{noun}`.
- Keep read-oriented data access and display logic out of features.
- Keep relational Drizzle tables and relations in one shared persistence schema.
- Keep entity domain schemas, operations, queries, and reusable UI in the entity
  slice.
- Keep server transport functions at the layer that owns the use case.
- Keep route files as route adapters; keep screen composition in pages.
- Use Steiger to enforce layer direction and public interfaces, while treating
  its insignificant-slice rule as a design signal rather than a substitute for
  judgment.
- Keep end-to-end tests in the root `e2e` directory for now.

## Why this variant of FSD

FSD gives the project a useful dependency direction and vocabulary, but the
project does not use a pages-first design. A page is a screen composition, not
the first place where reusable behavior is allowed to appear. Reusable entity
logic and user interactions may be created before a second page needs them when
their interface is already meaningful.

The project also uses deep-module design:

- A module should expose a small interface and hide implementation detail.
- The interface is the test surface for callers.
- The deletion test is useful: if deleting a module merely moves the same code
  into its only caller, the module may be a premature seam.
- An abstraction should earn its place through leverage or locality, not by
  having a conventional name such as `service` or `repository`.

## Layers

The dependency direction is downward:

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

A layer may use lower layers. A slice must not import another slice from the
same layer, and lower layers must not import higher layers. Cross-slice
composition belongs in a higher layer.

### `app`

`app` contains framework setup and application-wide composition:

- router setup and generated route metadata;
- root layout and global styles;
- route adapters under `src/app/routes`.

Route files should stay small. They make the `createFileRoute` call, retain
route-specific configuration such as loaders, and point at the page component.
They must not become screen components or general-purpose business modules.

A route loader may prefetch an entity query. This is route orchestration, not a
reason to move the query into the route.

### `pages`

`pages/<page>` contains screen-level composition. It decides which widgets and
features appear together on a screen, but should not own the implementation of
those modules.

For example, `pages/home` composes `PostCreateForm` and `PostFeed`.

### `widgets`

`widgets/<noun>-<purpose>` contains read-oriented or composite UI that forms a
meaningful part of a screen. A widget may query entities and render their data.

Widgets are not user interactions. A widget can contain display behavior,
loading states, and composition, but a user action such as creating a post
belongs in a feature.

### `features`

`features/<noun>-<verb>` contains one user interaction. The name must describe
the interaction using `{noun}-{verb}`:

```text
post-create
comment-delete
session-sign-in
```

The feature may contain:

- the interaction UI;
- client mutation state;
- optimistic updates or cache invalidation caused by the interaction;
- the server-function transport entrypoint for the interaction;
- interaction-specific validation and error presentation.

The feature must not become the home for a read query or reusable entity
display logic merely because that query is needed after the interaction.

`post-create` is therefore responsible for submitting the create interaction
and invalidating the post list. It is not responsible for defining the post
table or the reusable meaning of a post.

### `entities`

`entities/<noun>` contains reusable business logic for one entity:

- domain schemas and types;
- entity operations such as `postCreateOperation` and `postListOperation`;
- reusable entity UI such as `PostCard`;
- server-only implementations behind those interfaces.

Entity server operations use noun–verb order and the `Operation` suffix. The
suffix distinguishes them from TanStack Start server functions and TanStack
Query modules without exposing a storage representation. Use
`postCreateOperation` and `postListOperation`; do not use names such as
`createPostRecord`, `listPostsRecord`, or `postCreateDatabase`.

An entity operation should be kept when it expresses behavior that could be
used by another interaction, an import, an administrator workflow, or a server
job. If it is purely an accidental wrapper for one caller and has no useful
interface, apply the deletion test before introducing it.

Entities may depend on `shared`, but may not depend on features, widgets,
pages, or app code. Entity slices should not import one another by default.

If a cross-entity read model is needed, compose it in a widget, page, or other
higher-level module. An explicit cross-entity interface is an escape hatch for
cases where the relationship is intrinsic and cannot be composed higher up;
that exception should be documented at the seam.

### `shared`

`shared` contains business-agnostic and entity-agnostic infrastructure:

- database connection setup;
- relational persistence schema and relations;
- generic UI primitives and styling utilities;
- framework-independent helpers.

Shared code must not acquire knowledge of a particular user interaction or
screen.

## Features versus entities

The distinction is based on intent:

| Question | Feature | Entity |
| --- | --- | --- |
| Is this a user action? | Yes | No; it is a domain operation or read |
| Does the name describe an interaction? | `{noun}-{verb}` | `{noun}` |
| Does it own cache invalidation caused by the action? | Yes | No |
| Does it describe reusable entity invariants? | No | Yes |
| Does it render reusable entity data? | No | Yes |
| Can another interaction reasonably use it? | Usually no | Usually yes |

The same noun–verb operation can appear at different seams without being
duplication:

```text
features/post-create/api/post-create.functions.ts  # postCreateServerFn
entities/post/api/posts.server.ts                  # postCreateOperation
```

The feature says, “the user is creating a post.” The entity operation says,
“perform the post creation operation with these valid entity rules.” Those
interfaces have different callers and different responsibilities.

## Database schemas, queries, and relational data

All Drizzle table definitions and relations live under:

```text
src/shared/db/schema/
```

The Drizzle configuration points at `src/shared/db/schema/index.ts`, which
exports the complete relational schema. This keeps foreign keys and relations
in one place and avoids making one entity import another entity’s persistence
table merely to define a relation.

The database connection is also shared infrastructure:

```text
src/shared/db/db.server.ts
src/shared/db/index.server.ts
```

Entity modules use the shared database public interface, but expose domain
schemas and domain-oriented operations to their callers. Callers should not
need to know whether an operation uses Drizzle, D1, or another persistence
adapter.

The split is therefore:

```text
shared/db/schema       relational persistence shape
entities/post/model    post domain shape and validation
entities/post/api      post server operations and query options
features/post-create   create interaction and cache behavior
```

When a query spans multiple entities, prefer a higher-level read model in a
widget or page. Do not solve every relationship by adding imports between
entity slices.

## Server functions and server-only code

File names communicate runtime responsibility:

- `*.functions.ts` contains a TanStack Start server-function transport
  entrypoint. It validates the incoming interface and delegates to a lower-level
  operation. Its exported name ends in `ServerFn`, such as
  `postCreateServerFn` or `postListServerFn`.
- `*.server.ts` contains server-only implementation or a server-only public
  interface. `posts.server.ts` contains the entity’s database-backed
  operations. It must not be imported into client code.
- `index.server.ts` is the entity’s server-only public interface when a higher
  layer needs to call an entity operation.
- `@tanstack/react-start/server-only` is used as an explicit import-protection
  marker on server-only public interfaces and persistence modules.

Read transport may live with the entity because it exposes reusable entity
data. A mutation transport belongs to the feature when it represents a user
interaction. Both delegate to entity operations rather than containing
database details themselves.

## Naming by seam

The project reserves `Query` and `Mutation` terminology for TanStack-facing
modules. Entity server operations use `Operation` instead, so database-backed
writes are not confused with React Query mutations or read queries.

```text
entities/post/api/posts.server.ts
  postListOperation
  postCreateOperation

entities/post/api/posts.functions.ts
  postListServerFn

entities/post/api/posts-query-options.ts
  postListQueryOptions

features/post-create/api/post-create.functions.ts
  postCreateServerFn

features/post-create/api/use-post-create-mutation.ts
  usePostCreateMutation
```

`postListQueryOptions` and `usePostCreateMutation` intentionally use TanStack
terminology because they are TanStack Query interfaces. The database-backed
operations do not.

## Public interfaces and segments

Each slice has a public index. Callers should import from the slice public
interface rather than reaching into another slice’s segments.

Segments describe implementation role rather than creating new architectural
layers:

```text
api/       queries, operations, server functions, and transport adapters
model/     domain schemas and types
ui/        UI modules
__tests__/ tests for the slice
```

The `api` segment name is retained for compatibility with the existing source
layout. The deeper design term is the module interface, not a requirement that
every module expose a network API.

## Testing placement

- Unit and component tests may be colocated with the slice they exercise.
- Tests should cross the same module interface that production callers use.
- Feature tests should test user interaction behavior and may mock the
  feature’s client transport adapter.
- Entity tests should test domain operations and queries through their public
  interfaces.
- End-to-end tests remain in the root `e2e` directory for now. They exercise
  deployed-style behavior across layers and are intentionally not colocated.

## Steiger policy

The architecture check is:

```bash
bun run check:architecture
```

The configuration is in `.config/steiger.config.ts`.

Current exceptions are intentionally narrow:

- generated route metadata is ignored;
- mocks are ignored;
- the insignificant-slice rule is disabled for features and widgets because a
  meaningful interaction or composition can initially have one consumer.

An insignificant entity slice is a stronger warning. It may be valid when the
entity has a meaningful reusable interface or owns an important invariant, but
it should not be silenced automatically. Re-evaluate whether the entity is
actually earning its seam.

Steiger enforces structure; it does not decide whether a module has enough
depth. That remains a design review decision.

## Adding a new relational entity

Use this sequence:

1. Add its Drizzle table to `src/shared/db/schema/<noun>.ts`.
2. Export it from `src/shared/db/schema/index.ts`.
3. Add domain schemas and types under `src/entities/<noun>/model`.
4. Add reusable server operations and query options under
   `src/entities/<noun>/api`.
5. Add reusable entity UI under `src/entities/<noun>/ui` when needed.
6. Add a `{noun}-{verb}` feature for each user interaction.
7. Compose read-oriented UI in a widget and screen composition in a page.
8. Run Steiger, Knip, type checks, tests, and the Drizzle migration guard.

For a relationship between entities, first model the relational constraint in
the shared schema and compose the read at a higher layer. Introduce a direct
cross-entity interface only when the relationship is intrinsic to an entity
operation and the exception is documented.

## References

- [FSD layers](https://feature-sliced.design/docs/reference/layers)
- [FSD slices and segments](https://feature-sliced.design/docs/reference/slices-segments)
- [Steiger](https://github.com/feature-sliced/steiger)
