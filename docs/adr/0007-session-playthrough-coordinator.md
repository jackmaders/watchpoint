# ADR-007: Cohesive Session Playthrough Coordinator

**Status**: Accepted
**Date**: 2026-08-17
**Deciders**: Engineering / Architecture Team

## Context

The interactive training flow was coordinated across the public `useSessionPlayer`
hook, a reducer, timer callbacks, media callbacks, and Attempt Record mutation
callbacks. That distribution made phase transitions and asynchronous races depend
on React render timing. A late timer or playback callback could otherwise reach a
new VOD manifest or retry generation.

## Decision

Keep `useSessionPlayer` as the application boundary and place a pure Session
Playthrough coordinator behind it. The coordinator owns the accepted state
transitions for loading, playback, Scenario pauses, feedback, replay, retry, and
completion. It receives generation-tagged semantic events and returns explicit
effect intents for media control, Attempt Outcome persistence, and completion
notification.

Each initial load, changed Session Manifest, and retry creates a new Playthrough
Generation. Scenario triggering is latched for the active Scenario, countdown
acceptance validates a wall-clock deadline, and answer or timeout transitions are
atomic. Context replay intentionally retains the current Scenario index while
waiting for the replay seek before another trigger can be accepted.

The React hook remains a thin adapter: it normalizes and orders the Session
Manifest, translates YouTube events and controls into semantic coordinator events,
executes effect intents, and projects the existing public result contract.

## Consequences

- Race behavior is deterministic and testable without YouTube or network services.
- Completion and Attempt Outcome effects are emitted only after accepted state
  transitions.
- Media and persistence infrastructure can evolve behind the coordinator seam.
- The public hook and SessionPlayerClient remain compatible with existing routes and
  controls.
