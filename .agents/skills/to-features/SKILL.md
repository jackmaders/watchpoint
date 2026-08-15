---
name: to-features
description: Break a completed wayfinder map, epic, or large initiative into a sequenced set of mid-sized, dependency-linked feature issues ready for /grill-me or /to-spec.
disable-model-invocation: true
---

# To Features

Take a completed wayfinder map (where all decision tickets are closed and fog is cleared), epic, or large initiative and decompose it into **features** — self-contained capabilities added to the system, each declaring the features that **block** it, sized for the `/grill-me` > `/to-spec` > `/to-tickets` workflow.

The issue tracker and triage label vocabulary should have been provided to you — run `/setup-matt-pocock-skills` if not.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a map issue URL or number) as an argument, fetch it and read its full body and comments.

Verify that the map is complete: all decision tickets (`wayfinder:*`) should be closed and the fog cleared. If open decision tickets remain, prompt the user to resolve the frontier before decomposing into features.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Feature titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

### 3. Draft feature boundaries

Break the destination into **features**.

<feature-boundary-rules>

- A feature is a self-contained capability or addition to the system identified as necessary by the map (e.g. "User login", "Frontier dependency graph engine", "Interactive queue picker").
- Sized so that running `/to-tickets` on it yields 2–5 vertical tracer-bullet PRs (not a multi-week epic, and not a single trivial commit).
- Defines a clear public interface / test seam at its boundary.
- Sequenced topologically: give each feature its **blocking edges** (`Blocked by`) so it depends only on features that genuinely gate it.

</feature-boundary-rules>

### 4. Publish features to the configured tracker

Synthesize the features directly and publish them to the configured tracker:

- **Local files** → write one file per feature under `.scratch/<initiative-slug>/features/<NN>-<slug>.md`, numbered from `01` in dependency order (blockers first). Each file's "Blocked by" lists the numbers/titles it depends on. Use the per-feature file template below.
- **A real issue tracker (GitHub, Linear, …)** → publish one issue per feature in dependency order (blockers first) with a **plain English title** (no `feat:` prefix). Apply `[enhancement, needs-triage]` labels (or repo triage equivalents). Set native blocking dependencies where supported (or `Blocked by: #<id>` lines). Update the parent `wayfinder:map` body with a `## Feature Roadmap` section linking each feature.

Preserve all existing closed decision tickets and context on the parent map; only append the new `## Feature Roadmap` section.

<local-feature-template>

# <NN> — <Feature Title>

**Parent Map:** <Map Name / Path>

**What this feature enables:** the architectural capability and end-to-end behaviour this feature introduces, from the consumer/user perspective.

**Primary seams:** description of the public interface, adapters, or modules introduced.

**Blocked by:** the numbers/titles of the features that gate this one, or "None — can start immediately".

**Status:** needs-triage

</local-feature-template>

<feature-issue-template>

## Parent Map

Part of #<map-id>

## What this feature enables

The architectural capability and end-to-end behaviour this feature introduces, from the consumer/user perspective.

## Primary seams

- Description of the public interface, adapters, or modules introduced.

## Blocked by

- A reference to each blocking feature, or "None — can start immediately".

</feature-issue-template>
