/**
 * Consolidates and re-exports all relational schema tables, enums, and relation definitions
 * across audit, authentication, playthroughs, and VOD domains.
 *
 * Serves as the centralized schema barrel for ADR-0010, passed directly into the Drizzle ORM
 * client initialization. Re-exports Drizzle table objects and relation builders from `audit.ts`,
 * `auth.ts`, `playthroughs.ts`, and `vods.ts`.
 */

export * from "./audit";
export * from "./auth";
export * from "./playthroughs";
export * from "./relations";
export * from "./vods";
