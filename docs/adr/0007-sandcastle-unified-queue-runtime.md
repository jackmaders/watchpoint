# ADR-007: Unified Sandcastle Queue Runtime

**Status**: Accepted  
**Date**: 2026-08-16  
**Deciders**: Engineering / Architecture Team

## Context

Ad-hoc Sandcastle runs and the `pick`/`watch` queue commands previously built
agent execution configuration through separate paths. That made provider,
model, credentials, and container defaults easy to drift, especially after
Codex/OpenRouter became the default. Queue retries also needed an explicit
guarantee that they would remain on the selected provider.

## Decision

Resolve agent runtime configuration once through a shared runtime seam. The
resolved configuration includes the agent, provider model, sandbox image,
permission mode, and runtime credential mounts. Queue workflows create one
runner from that configuration and reuse it for every self-healing attempt.

Codex defaults to OpenRouter's `openrouter/free`. Antigravity remains available
through `--agent agy` and keeps its independent credential mounts. A routed
model is optional telemetry: provider output is inspected for model metadata,
but missing or malformed metadata never fails execution.

## Consequences

Ad-hoc and queue execution now share the same defaults and credential boundary.
Retries cannot silently switch providers or models. The free router remains
non-reproducible by design; operators who need a stable route must supply an
explicit model.
