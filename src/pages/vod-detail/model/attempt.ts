import { z } from "zod";
import type { JsonValue } from "@/shared/db";

export const RecordAttemptInputSchema = z.object({
	idempotencyKey: z.string().uuid(),
	inputValue: z.custom<Record<string, JsonValue>>().optional(),
	isCorrect: z.boolean(),
	isTimedOut: z.boolean().default(false),
	responseTimeMs: z.number().int().nonnegative(),
	scenarioId: z.string().uuid(),
	selectedOptionId: z.string().optional().nullable(),
});

export type RecordAttemptInput = z.input<typeof RecordAttemptInputSchema>;

export type RecordAttemptResult = {
	attemptId?: string;
	error?: string;
	success: boolean;
};
