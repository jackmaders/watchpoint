# Permissions and authorization model

Checked 2026-09-24. This research covers the current Watchpoint stack: Better Auth
1.7.5, TanStack Start server functions, and a D1/SQLite database. Sources are
official Better Auth, TanStack, and OWASP documentation.

## Recommendation

Use role-backed permissions: keep a small persisted role on `user` for the first
release, but make server checks speak in terms of named permissions such as
`vod:create` and `question:update`. The current `admin` role can grant the initial
Admin permission set through a single predicate (`hasAdminPermission`). Do not add
per-user permission rows yet.

This gives Watchpoint a simple bootstrap path while preserving a seam for narrower
roles later. Directly assigning permissions to users would add tables, provisioning
workflows, revocation behavior, and audit requirements before the product has a
second distinct operator persona.

## Evidence

Better Auth's Admin plugin models a user's role as a string, defaults new users to
`user`, supports configuring which roles count as admin roles, and supports custom
access-control roles with explicitly granted permissions. It also documents that
custom roles receive exactly the permissions assigned to them. See the [Better Auth
Admin plugin documentation](https://better-auth.com/docs/plugins/admin).

Better Auth's Organization plugin uses an access-control resource/action map for
custom permissions and dynamic roles. That model is appropriate if Watchpoint later
needs multiple authoring teams or organization-scoped administration, but it is more
machinery than the current single-admin boundary requires. See the [Better Auth
Organization documentation](https://better-auth.com/docs/plugins/organization).

TanStack Start documents server middleware as the place to execute server-side logic
before a nested server function and to pass validated context to it. It also states
that global function middleware runs for every server function. Watchpoint should use
the global error middleware for status conversion/logging and attach an authorization
middleware to each protected server function. See the [TanStack Start middleware
documentation](https://tanstack.com/start/latest/docs/framework/react/guide/middleware).

OWASP recommends deny-by-default, least privilege, and tests that verify function-
level, data-specific, and field-level authorization criteria. These principles mean
the UI route redirect is only navigation UX; each Admin server function must enforce
its permission independently. See the [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
and the [OWASP access-control checklist](https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/).

## Application design

1. Persist a constrained role (`user` or `admin`) with a safe default. Keep role
   changes operator-only until an Admin-management workflow exists.
2. Define permission names near the authorization policy, not in UI components.
   Examples: `admin:workspace`, `vod:create`, `vod:update`, `question:create`, and
   `question:update`.
3. Expose server-side guards as the authorization seam. A route may call a guard for
   navigation, while every mutation calls the corresponding permission middleware.
4. Return `401` for an absent/invalid session and `403` for an authenticated User
   without the required permission. Preserve framework redirect and not-found
   control-flow errors.
5. Add integration coverage for anonymous, regular User, and Admin access to every
   protected seam. Keep pure predicate tests for policy edge cases, but do not treat
   them as a substitute for server-boundary tests.

## Why route navigation remains local

The global `functionMiddleware` is the right place for concerns shared by every
server function: preserving redirect/not-found control flow, converting
`ServerFunctionError` values into HTTP status codes, and reporting unexpected
failures. It should not redirect every unauthorized server function. A mutation such
as post creation needs to return its authorization failure to the current page so
the UI can show its own message, while the Admin route needs to turn the same class
of failure into navigation away from `/admin`.

Therefore, Admin server functions keep authorization middleware at their server seam,
and the Admin route owns its navigation response in `beforeLoad`. This is a
presentation/navigation concern, not duplicated authorization policy.

## Future expansion trigger

Introduce explicit permission sets or Better Auth access control when a second role
needs only part of Admin access, when multiple organizations need different grants,
or when role changes must be managed in the product. At that point, define a stable
resource/action vocabulary, migration/backfill rules, revocation semantics, and an
audit trail before exposing self-service role management.
