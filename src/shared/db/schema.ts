/**
 * Compatibility barrel bridging database schema definitions and core primitive types
 * for migration generators, seeds, and root database consumers.
 *
 * Implements the unified schema export interface for ADR-0010 and Drizzle Kit configuration.
 * Re-exports primitive JSON types from `core/types` alongside all entity tables, enums,
 * and relational models from `schema/index`.
 */

export * from "./core/types";
export * from "./schema/index";
