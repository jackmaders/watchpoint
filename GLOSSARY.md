# Vite+ Starter Application

This context is the starter application and its conventions for organizing,
validating, persisting, and testing application behavior.

## Language

### Architecture

**Module**:
A JavaScript or TypeScript source file with its own import and export boundary.
A slice can contain multiple modules.

**Domain entity**:
A business concept represented in the application’s data model. In architecture
examples and fixture names, `<entity>` is a placeholder for that concept.

**Entities layer**:
The optional Feature-Sliced Design layer for reusable business domain models.
This repository does not currently have an `entities/` layer.

**Feature**:
A reusable, distinct user action in the Feature-Sliced Design features layer.
Name each feature `<entity>-<action>` (for example, `user-sign-in`) to make its
user action explicit. Page-specific actions and entity domain logic stay in
their owning page until extraction is justified.

**Page**:
A screen composition that owns its view and user interactions.

**Route component**:
A thin adapter that passes route state to a Page.

**Route definition**:
The router declaration that binds a URL to validation, loading, and presentation.

**Navigation Guard**:
A protective client mechanism (`useNavigationGuard`) that intercepts in-app transitions and browser unload events when form changes are dirty, preventing unintentional data loss.
_Avoid_: Route Blocker, Unsaved Guard.

### Authentication

**User**:
A person represented by an authenticated identity in the application.

**User role**:
The authorization role assigned to a User (`UserRole`), currently either `"user"` or `"admin"`.

**Permission**:
A granular capability granted to a user role (`Permission`), determining
allowed actions such as `"todos:read"`, `"todos:create"`, `"todos:update"`,
or `"todos:delete"`.

**Account**:
An authentication record connecting a User to credentials or an identity
provider. An Account belongs to a User; it is not the User.

**Session**:
A time-bounded authenticated state associated with a User.

**Profile**:
The user-facing view of a User’s name and email address. It is not a separate
identity from the User.

**User sign-in feature**:
The `features/user-sign-in` slice owns the sign-in form and its card and dialog
presentations.

**User sign-up feature**:
The `features/user-sign-up` slice owns the registration form and its card and
dialog presentations. The header layout owns sign-out.

**Permission middleware**:
An authorization gate that requires an authenticated User to hold the Permission
specified for an operation.

### Data

**Database schema**:
Drizzle table declarations that describe persisted columns, indexes, and
constraints.

**Validation schema**:
A Zod parser that defines the accepted shape and constraints of runtime data.
When fields mirror persisted data, it can be derived from the Drizzle database
schema and narrowed for the fields a caller may supply.

### Tests

**Browser test**:
A Playwright test that exercises the built application through a browser. The
suite lives under `tests/browser/` and runs in Chromium during PR checks.
