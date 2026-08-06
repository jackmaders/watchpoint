# ADR-004: All-in-Cloudflare Native Architecture & Edge Infrastructure

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Engineering / Architecture Team  

---

## Context

Watchpoint requires a low-cost, scalable, and low-latency hosting environment for its Next.js 16 App Router application, authentication services (`better-auth`), relational database schema, and static scenario media assets. 

Running a dedicated Node.js server container and external PostgreSQL database instance incurs monthly hosting fees and server management overhead. Conversely, Cloudflare's serverless edge ecosystem (Cloudflare Workers/Pages, Cloudflare D1 Serverless SQLite, and Cloudflare R2 Object Storage) provides zero-cost hosting under free tier limits (100,000 requests/day, 5 GB database storage, 10 GB asset storage, and zero egress bandwidth fees).

---

## Decision

We will deploy Watchpoint using an **All-in-Cloudflare Native Architecture** powered by the **Cloudflare OpenNext Adapter (`@opennextjs/cloudflare`)**.

Key architectural choices include:
1. **Server & Compute Layer**: Deploy Next.js 16 App Router onto **Cloudflare Workers / Pages** using `@opennextjs/cloudflare` with `compatibility_flags = ["nodejs_compat"]`.
2. **Database Engine**: Migrate from external PostgreSQL to **Cloudflare D1** (Serverless SQLite at the edge) accessed via Prisma ORM / `better-auth` D1 adapters.
3. **Media Storage**: Store spatial scenario screenshots and map assets in **Cloudflare R2** with zero egress fees.
4. **Edge Authentication**: Execute `better-auth` sessions directly at the edge against Cloudflare D1 storage bindings (`env.DB`).
5. **Local Emulation Workflow**: Use Cloudflare Wrangler (`wrangler.jsonc` + `wrangler d1 execute DB --local`) for local offline development, testing, and seed migrations.

---

## Consequences

### Positive
* **Zero Egress & Hosting Costs**: 100% of bandwidth, compute, and database storage fit within Cloudflare's free tier.
* **Global Low Latency**: Database queries and API handlers execute at Cloudflare's edge locations (<10ms response times).
* **Simplified Local Dev**: Developers can run `bun run dev` and `bun run db:seed:local` completely offline without requiring active cloud credentials.

### Negative / Trade-Offs
* **Database Engine Shift**: Switching from PostgreSQL to SQLite requires storing polymorphic JSON payloads as serialized strings and utilizing string representations for domain module types.
* **Edge Runtime Constraints**: Code must rely on `nodejs_compat` polyfills rather than native C/C++ binaries.
