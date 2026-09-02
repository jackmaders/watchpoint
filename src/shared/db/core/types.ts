/**
 * Establishes shared JSON data types for structured and polymorphic attributes stored
 * within SQLite text and JSON columns throughout the database schemas.
 *
 * Implements foundational serialization types for the data layer. Exports recursive
 * `JsonPrimitive` and `JsonValue` definitions used across scenario configs, audit metadata,
 * and attempt telemetry payload definitions.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| { [key: string]: JsonValue }
	| JsonValue[];
