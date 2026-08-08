# [EPIC] <Feature Name>

## Executive Summary & Problem Statement
* **User Problem:** <Clear, empathetic description of the pain point from the user's perspective.>
* **Proposed Solution:** <High-level summary of what is being introduced and how it solves the problem.>
* **Business & User Value:** <Why this feature is important and what metrics or outcomes define success.>

## User Stories
1. **As a** `<type of user>`, **I want to** `<perform action/goal>`, **so that** `<achieve specific value/benefit>`.
2. **As a** `<type of user>`, **I want to** `<perform action/goal>`, **so that** `<achieve specific value/benefit>`.

## Architecture & Technical Invariants
* **Frontend & FSD Structure:**
  * **Slice Location:** `src/_pages/<slice-name>/` (FSD Pages-First pattern).
  * **Next.js App Router:** `app/<route>/page.tsx` must strictly remain a single-line barrel re-export of `src/_pages/<slice-name>`.
* **Backend & Data Layer:**
  * **Database/ORM:** Cloudflare D1 / Drizzle ORM schema modifications residing in `drizzle/` schema files.
  * **Server Actions / API:** Server Actions or route handlers handling mutation & data fetching.
* **System Invariants:**
  * <Hard technical constraints, e.g. "Must execute database reads in a single query", "All mutations must be idempotent">.

## Data Models & API Contracts

### Data Schemas (`drizzle/schema.ts`)
```typescript
// Proposed or modified database table schemas
export const exampleTable = sqliteTable("example_table", {
  id: text("id").primaryKey(),
});
```

### API & Server Action Signatures
```typescript
// Action/Route payload and response contracts
export type CreateFeatureInput = {
  // Input fields
};

export type CreateFeatureResponse = {
  success: boolean;
  data?: FeatureData;
  error?: string;
};
```

## Testing Strategy & Seams
* **Primary Testing Seam:** <e.g., Testing Server Actions directly via integration tests vs. unit testing custom hooks>.
* **Tested Modules:** <List of modules/files requiring coverage>.
* **Behavioral Expectations:** <Focus on testing observable behavior and data outcomes rather than internal state implementation details>.

## UI & Design Guidelines
* **Target UI File:** `src/_pages/<slice-name>/ui/<Component>.tsx`
* **Styling:** Tailwind CSS v4.
* **Stitch Design Mockup:**
  <!-- design-mockup -->
  ```html
  <!-- Paste your Google Stitch HTML/Tailwind mockup code here -->
  ```
* **Component Prompt / Specifications:**
  * <Natural language prompt or UI breakdown for generating or refining the component structure, responsive behavior, dark mode, and state variants (loading, error, empty, filled)>.

## Vertical Slice Ticket Breakdown
*Breakdown into tracer-bullet vertical slices. Each slice must touch schema, API, UI, and tests, yielding a standalone demoable feature.*

- **[TICKET-1]** `<Name>`: <Summary of vertical slice 1> (Blockers: None — can start immediately)
- **[TICKET-2]** `<Name>`: <Summary of vertical slice 2> (Blockers: `[TICKET-1]`)
- **[TICKET-3]** `<Name>`: <Summary of vertical slice 3> (Blockers: `[TICKET-1]`, `[TICKET-2]`)

## Out of Scope & Non-Goals
* <Explicit list of items intentionally omitted from this feature slice to prevent scope creep>.

## Security & Risk Considerations
* <Authentication/authorization checks, data input validation, rate limiting, and edge cases>.
