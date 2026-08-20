# ADR-009: Private Cross-Session Performance History & Snapshot Drill-Down

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Engineering / Product Team

## Context

Players require durable, private visibility into their training performance across sessions to track game sense improvement over time. The historical record must reliably present aggregate metrics (accuracy and median active-response latency) as well as drill-down review into immutable scenario snapshots, even if published VODs or scenario definitions change in the catalog.

Access must remain strictly isolated by authenticated player identity, masking unowned records with 404 responses to prevent identifier enumeration and excluding internal test accounts from ordinary player history.

## Decision

1. **Routing & Slices**:
   - Deliver performance history at `/history` (`app/routes/history/index.tsx`) with drill-down review at `/history/$playthroughId` (`app/routes/history/$playthroughId.tsx`), backed by the `src/pages/history/` FSD slice.
   - Add navigation links connecting Home, VOD Catalog, and Training History.
2. **Data & Persistence Seam**:
   - Query history via `queryPlayerHistory` and `getPlaythroughHistoryDetail` in the shared database repository.
   - Enforce bounded pagination (`page`, `pageSize` default 10, max 50) and multi-module / VOD filtering via URL search parameters.
   - Default history view to `COMPLETED` playthroughs, with an `IN_PROGRESS` tab offering re-entry to the active session.
3. **Metrics Calculation**:
   - Accuracy: $\text{Accuracy} = (\text{correct attempts} / \text{total scenario snapshots}) \times 100\%$.
   - Median Active-Response Latency: Median of `responseTimeMs` strictly for non-timeout responses (`isTimedOut = false`), displaying `"—"` when zero active responses exist.
4. **Security & Authorization**:
   - Authenticated session derivation for all player-facing history queries.
   - Mask unowned or non-existent records with 404 Not Found.
   - Filter out test accounts (`isTestAccount = true`).

## Consequences

- Players can independently review chronological history and inspect immutable scenario snapshots.
- Metrics are calculated deterministically via pure shared domain helpers (`src/shared/lib/metrics.ts`).
- Server actions, repositories, and UI slices are fully tested with 100% test coverage and zero console output.
