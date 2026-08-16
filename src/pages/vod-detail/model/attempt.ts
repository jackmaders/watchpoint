import { z } from "zod";
import type { JsonValue } from "@/shared/db";

export const RecordAttemptInputSchema = z.object({
	idempotencyKey: z.string().optional(),
	inputValue: z.custom<Record<string, JsonValue>>().optional(),
	isCorrect: z.boolean(),
	responseTimeMs: z.number().int().nonnegative(),
	scenarioId: z.string().uuid(),
	selectedOptionId: z.string().optional().nullable(),
});

export type RecordAttemptInput = z.infer<typeof RecordAttemptInputSchema>;

export type RecordAttemptResult = {
	attemptId?: string;
	error?: string;
	success: boolean;
};
