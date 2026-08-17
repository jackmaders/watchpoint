import { z } from "zod";
import type { JsonValue, ModuleType } from "@/shared/db";

export interface AttemptOutcome {
	idempotencyKey: string;
	inputValue?: Record<string, JsonValue>;
	isCorrect: boolean;
	isTimedOut: boolean;
	moduleType: ModuleType;
	responseTimeMs: number;
	scenarioId: string;
	selectedOptionId: string | null;
}

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
