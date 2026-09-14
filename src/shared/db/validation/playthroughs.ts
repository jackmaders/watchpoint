/**
 * Defines Zod validation schemas and type assertions for interactive playthrough sessions,
 * scenario snapshots, and attempt telemetry records.
 *
 * Implements data validation rules for session coordination and telemetry ingestion. Uses `drizzle-orm/zod`
 * and Zod to construct `selectPlaythroughSchema`, `insertPlaythroughSchema`, `selectAttemptRecordSchema`,
 * `insertAttemptRecordSchema`, and `scenarioSnapshotInputSchema`, validating non-negative timestamps and latency values.
 */

import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";
import { attemptRecords } from "../schema/attempt-record";
import { playthroughs } from "../schema/playthrough";
import { moduleTypeEnum } from "../schema/scenario";
import { scenarioSnapshots } from "../schema/scenario-snapshot";

export const selectPlaythroughSchema = createSelectSchema(playthroughs);
export const insertPlaythroughSchema = createInsertSchema(playthroughs);

export const selectAttemptRecordSchema = createSelectSchema(attemptRecords);
export const insertAttemptRecordSchema = createInsertSchema(attemptRecords, {
	idempotencyKey: (s) => s.min(1, "Idempotency key is required"),
	responseTimeMs: (s) => s.min(0, "Response time must be non-negative"),
});

export const scenarioSnapshotInputSchema = createInsertSchema(
	scenarioSnapshots,
	{
		explanationText: (s) => s.min(1, "Explanation text is required"),
		inputConfig: z.record(z.string(), z.unknown()),
		moduleType: z.enum(moduleTypeEnum),
		promptText: (s) => s.min(1, "Prompt text is required"),
		timestampSeconds: (s) => s.min(0, "Timestamp must be non-negative"),
	},
);
