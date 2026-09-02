/**
 * Public barrel export for the shared library slice, exposing cross-cutting utilities,
 * authentication helpers, domain metric calculators, and operational telemetry.
 *
 * Centralizes consumption for higher Feature-Sliced Design layers, aggregating exports
 * from `audit`, `auth`, `auth-client`, `math`, `metrics`, `sentry`, and `utils`.
 */

export * from "./audit";
export * from "./auth";
export { authClient } from "./auth-client";
export * from "./math";
export * from "./metrics";
export * from "./sentry";
export * from "./utils";
