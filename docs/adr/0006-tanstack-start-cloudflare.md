# ADR-006: Application Framework Migration from Next.js 16 to TanStack Start & TanStack Query on Cloudflare Workers

**Status**: Accepted  
**Date**: 2026-08-15  
**Deciders**: Engineering / Architecture Team  

---

## Context

Watchpoint previously ran on the Next.js 16 App Router using OpenNext translation shims (`@opennextjs/cloudflare`) to execute in the Cloudflare Workers / Pages environment. While functional, this architectural pattern created several significant friction points:

1. **Large Worker Bundle Sizes**: OpenNext runtime shims and Node.js emulation produced 3–5MB worker bundles, impacting deployment velocity and cold-start performance at the edge.
2. **Multi-Stage Build Overhead**: Two-stage compilation (Next.js production build followed by OpenNext translation) increased CI build times and introduced build pipeline fragility.
3. **RSC Serialization Friction**: React Server Components imposed serialization constraints on interactive playthrough pages with high-frequency timeline state.
4. **Telemetry Retry Needs**: Gameplay attempt telemetry required client-side exponential retry backoff and non-blocking background queueing that were awkward with native server actions.

---

## Decision

We have migrated Watchpoint's application framework from Next.js 16 to **TanStack Start (`@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`)** running natively on **Vite** and the **Nitro Cloudflare Workers** preset.

Key architectural choices include:

1. **Single-Stage Vite Build**: The entire client and server application builds in a unified Vite pipeline, generating lean, sub-600KB uncompressed worker bundles with sub-5ms cold starts.
2. **File-Based Routing & Thin Adapters**: Route files located in `app/routes/` serve strictly as thin parameter-binding adapters delegating data loading and rendering to Feature-Sliced Design (FSD) pages in `src/pages/`.
3. **Type-Safe Server Functions (`createServerFn`)**:
   - `getVodDetails(vodId)`: Direct D1 query returning VOD metadata.
   - `getSessionManifest(vodId, options)`: Filtered chronological scenario manifest retrieval.
   - `recordAttempt(payload)`: Telemetry persistence with a client-generated UUID idempotency key. The key is nullable only for historical rows, globally unique for new rows, and arbitrated by the database during insert. An identical replay for the same User and immutable outcome returns the canonical Attempt Record identifier; changed or cross-User reuse returns a generic conflict without disclosing the existing record. Timeout remains explicit in the domain outcome and maps to the existing correctness and selected-input fields.
4. **Standard HTTP Route Handlers**:
   - `/api/auth/*`: Better-Auth Web-standard request handler mounted on TanStack Router server handlers.
   - `/api/media/:key`: R2 binary asset streaming endpoint with HTTP metadata and ETag cache negotiation.
5. **Decoupled Database Context**: A centralized `getDb(context)` helper in `src/shared/db/` extracts `env.DB` from runtime context with seamless local Wrangler proxy fallback for local development, CLI scripts, and offline testing.
6. **Attempt Telemetry Mutations**: Client-side attempt tracking utilizes `@tanstack/react-query` mutations (`useRecordAttemptMutation`) configured with automatic exponential retry backoff. Persistence remains non-blocking; safe replay is guaranteed by the Attempt Record idempotency policy above rather than by read-before-write coordination in the caller.
7. **Unified Tooling**: Standardized `package.json` scripts on Vite and Wrangler (`dev`, `build`, `preview`, `deploy`, `validate`).

---

## Consequences

### Positive

- **Sub-600KB Worker Bundles**: Reduced worker bundle size by over 80%, yielding instant cold starts.
- **Instant Local HMR**: Vite provides sub-second hot module replacement during development.
- **End-to-End Type Safety**: Server functions and route parameters share full TypeScript typing between client and server without custom RPC schemas.
- **Resilient Telemetry**: TanStack Query automatically retries failed attempt telemetry submissions during transient network blips without blocking video playback.
- **Strict FSD Isolation**: Route definitions remain decoupled from business logic and presentation layers.

### Negative / Trade-Offs

- **Router Migration**: Route files adhere to TanStack Router conventions (`$id.tsx`, `$.ts`, `__root.tsx`) instead of Next.js App Router folders (`[id]/page.tsx`, `[...all]/route.ts`).
