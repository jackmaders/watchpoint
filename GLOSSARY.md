# Watchpoint

Watchpoint monitors and tracks system endpoints, background jobs, and operational workflows.

## Language

### Components & UI Taxonomy

**Leaf Component**:
A presentational component at the bottom of the render tree that renders standard HTML/DOM elements without composing other custom components.
_Avoid_: Dumb component, primitive, terminal component

**Orchestrator Component**:
A component that orchestrates domain state, user interactions, or mutations and delegates visual presentation to child components.
_Avoid_: Container component, smart component, controller component, screen controller

### Architecture

**Seam**:
The public boundary or interface where callers and tests observe behavior without reaching inside internal implementation details.
_Avoid_: Boundary, internal interface
