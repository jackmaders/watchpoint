# ADR-003: Uniform Multiple-Choice V1 Input Specification & Future-Proofed Input Engines

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Product Architecture / UX Design  

---

## Context

The Watchpoint interactive experience encompasses 5 distinct module types:
1. **Strategy** (macro pre-fight planning)
2. **Tactics** (timed 3s opportunity recognition)
3. **Ultimate Tracking** (estimating enemy ultimate charge)
4. **Cooldown Tracking** (tracking enemy ability availability and recovery times)
5. **Spatial Awareness** (locating unseen threats)

While ultimate tracking can theoretically use continuous percentage sliders and spatial awareness can use 2D map coordinate pin drops, introducing diverse custom UI widgets in V1 increases initial scope, UI complexity, and analytical variance. However, the system architecture must not lock the product out of introducing continuous sliders or 2D maps in future iterations.

---

## Decision

1. **V1 Standardization on Multiple Choice**: All 5 interactive modules in V1 will be presented using a standardized multiple-choice UI component.
   * **Ultimate Tracking**: Discrete buckets (`0-25% (No Ult)`, `26-50% (Building)`, `51-75% (Soon)`, `76-100% (Ready)`).
   * **Cooldown Tracking**: Discrete availability states (`Ready`, `On CD <3s`, `On CD 3-6s`, `On CD >6s`).
   * **Spatial Awareness**: Descriptive spatial options (`Highground Left`, `Statue`, `Behind Main Shield`) combined with a point-specific screenshot.
2. **Binary PASS/FAIL Evaluation**: All scenario responses are evaluated strictly as binary PASS or FAIL.
3. **Abstracted Input Engine**: Client UI components receive an `input_type` discriminator (`MULTIPLE_CHOICE`, `PERCENT_SLIDER`, `TIME_SLIDER`, `MAP_PIN_2D`) and delegate rendering to an Input Engine registry. Updating a scenario to a slider or map drop in V2 will be isolated to registering a new input component.

---

## Consequences

### Positive
* **Rapid V1 Deployment**: Reusing a unified multiple-choice UI overlay drastically reduces frontend development time.
* **Consistent UX**: Users experience a predictable interaction model across all scenario types.
* **Simple Analytical Logging**: PASS/FAIL telemetry logging is uniform across all modules.
* **Extensibility**: The system is fully decoupled, allowing individual scenarios to upgrade to continuous sliders or 2D maps in V2 without architectural rework.

### Negative / Trade-Offs
* **Granularity Limitation**: Multiple-choice presets for ultimate tracking and cooldowns offer coarser resolution than fine-grained numeric sliders.
