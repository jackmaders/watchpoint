# ADR-002: Hybrid Relational Database Schema with Polymorphic Input Configurations

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Engineering / Database Design  

---

## Context

Watchpoint scenarios represent diverse interactive modules (Strategy, Tactics, Ultimate Tracking, Cooldown Tracking, Spatial Awareness). Each module type requires different question formats, prompt configurations, and answer validation rules. Furthermore, the platform requires pre-session filtering so users can select specific module types (e.g. "Practice Ultimate Tracking only") before launching a VOD.

We evaluated three data schema patterns:
1. **Pure Relational (Separate Table Per Module Type)**: Strict SQL normalization with `StrategyScenarios`, `TacticsScenarios`, `UltScenarios`, etc.
2. **Pure Document (Single JSON Blob per VOD)**: Storing the entire interactive timeline inside a single `VOD.scenarios` JSON array.
3. **Hybrid Relational Schema with Polymorphic JSON Payloads**: A central `Scenario` relational table with an indexed `module_type` column and a JSON `input_config` field.

---

## Decision

We adopt the **Hybrid Relational Schema with Polymorphic JSON Payloads**.

* **`Scenario` Table**: Contains normalized SQL columns (`id`, `vod_id`, `timestamp_seconds`, `module_type`, `time_limit_seconds`, `prompt_text`, `explanation_text`, `input_type`).
* **`input_config` JSON Field**: Holds module-specific input structures, options, target ranges, or map coordinates.

---

## Consequences

### Positive
* **Fast Database Indexing & Filtering**: Pre-session module filtering (`WHERE vod_id = X AND module_type IN (...)`) is executed natively in SQL without reading or parsing unused scenario payloads.
* **Schema Evolution without Migrations**: Switching a scenario's input mechanism (e.g. from multiple choice to a 0-100% slider or a 2D map pin drop) requires updating the JSON payload and `input_type` string, with zero DDL migrations.
* **Simplified Manifest Pre-loading**: Client fetches a single cleanly structured dataset per session.

### Negative / Trade-Offs
* **Application-Level Validation**: The structure inside `input_config` must be validated by application-layer schemas (e.g. Zod / TypeScript types) rather than database-enforced foreign keys.
