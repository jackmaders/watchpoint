import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { moduleTypeEnum } from "../vods/schema";
import { attemptRecords, playthroughs, scenarioSnapshots } from "./schema";

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
		inputConfig: z.record(z.unknown()),
		moduleType: z.enum(moduleTypeEnum),
		promptText: (s) => s.min(1, "Prompt text is required"),
		timestampSeconds: (s) => s.min(0, "Timestamp must be non-negative"),
	},
);
