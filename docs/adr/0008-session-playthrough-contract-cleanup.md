# ADR-008: Single Session Playthrough Contract Boundary

**Status**: Accepted
**Date**: 2026-08-17
**Deciders**: Engineering / Architecture Team

## Context

The coordinator introduced in ADR-007 had absorbed workflow rules, but the
Session Playthrough still delegated phase transitions to a second
`session-player-state` reducer. The public hook also recomputed completion
summary state after the coordinator had already accepted the terminal media
event. Those parallel seams made the internal contract harder to test and
left tests coupled to retired orchestration helpers.

Media events, countdown callbacks, retry generations, and completion callbacks
remain asynchronous. The final boundary must preserve the existing
`useSessionPlayer` and `SessionPlayerClient` contracts while making one internal
coordinator the owner of accepted state and effect ordering.

## Decision

Make the Session Playthrough coordinator the single owner of the phase model,
Scenario transitions, accepted Attempt Outcomes, generation invalidation, and
completion summary. The former session-state reducer is removed. The React
hook remains an application adapter: it normalizes the manifest, forwards
generation-aware events and user commands, executes semantic media commands,
maps normalized Attempt Outcomes to the non-blocking persistence mutation, and
projects the unchanged public result shape.

Each accepted answer or timeout emits exactly one normalized Attempt Outcome
with one stable client idempotency key. Completion is accepted only from the
active generation's terminal media event and stores its summary in coordinator
state before emitting the one-shot completion effect. Repeated terminal events,
stale timer events, and stale generation events are inert.

## Consequences

- Phase behavior has one domain owner and can be tested without React or
  provider-specific media types.
- The public hook and `SessionPlayerClient` remain compatible with existing
  routes and controls.
- Media and persistence remain replaceable infrastructure seams.
- Contract tests focus on end-to-end behavior and race safety rather than the
  layout of pass-through helpers.
- Attempt Record persistence remains non-blocking and conflict-safe through
  the idempotency key documented by the domain glossary.
