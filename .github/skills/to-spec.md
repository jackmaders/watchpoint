---
name: to-spec
description: Turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
---

This skill takes the current conversation context and codebase understanding and produces a structured specification. Do NOT interview the user — just synthesize what you already know.

### Your Target Stack
Align all technical specification details with this target stack:
* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS v4.
* **Backend/Data:** PostgreSQL, Prisma ORM.
* **Tooling:** Biomejs for linting/formatting.

### Process

1. Review the conversation history and codebase context to understand the scope and architectural decisions made. Use the project's domain vocabulary throughout the spec.
2. Identify testing seams. Existing seams should be preferred to new ones. Use the highest seam possible.
3. Write the spec using the exact template structure below.

```markdown
# [EPIC] <Feature Name>

## Problem Statement
The problem that the user is facing, from the user's perspective.

## Solution
The solution to the problem, from the user's perspective.

## User Stories
A long, numbered list of user stories. Each user story must be in the format:
1. As an <actor>, I want a <feature>, so that <benefit>

Cover all key aspects of the feature.

## Implementation Decisions
A detailed breakdown of implementation decisions:
- **Data Model:** PostgreSQL schema & Prisma ORM relation updates.
- **Routing & Server Boundaries:** App Router endpoints, Server Actions, Client vs. Server Component boundaries.
- **Modules & Interfaces:** Modules to build/modify and interface definitions.
- **Architectural & API Contracts:** API request/response shapes and state interactions.

*(Do NOT include transient file paths or full code snippets unless encoding a state machine or schema definition).*

## Testing Decisions
- **Testing Seams:** High-level seams chosen for integration/unit testing.
- **Testing Philosophy:** Focus on testing external behavior, not internal implementation details.
- **Tested Modules:** Modules covered and prior art in the codebase.

## Dependencies & Ticket Breakdown
- **[TICKET-A]** Prisma Schema Update: <Details>
- **[TICKET-B]** API/Server Actions: <Details> (Depends on TICKET-A)
- **[TICKET-C]** UI Implementation: <Details> (Depends on TICKET-B)

## Stitch Design Prompts
- **Target Component:** `<ComponentFilePath.tsx>`
- **Prompt:** "<Detailed natural language prompt for Tailwind CSS v4 UI component generation>"

## Out of Scope
Description of elements explicitly out of scope for this spec.

## Further Notes
Any further notes, security considerations, or context.
```
