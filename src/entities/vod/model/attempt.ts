import { z } from "zod";
import type { JsonValue, ModuleType } from "@/shared/db";

export interface AttemptOutcome {
	idempotencyKey: string;
	inputValue?: Record<string, JsonValue>;
	isCorrect: boolean;
	isTimedOut: boolean;
	moduleType: ModuleType;
	playthroughId?: string | null;
	responseTimeMs: number;
	scenarioId: string;
	scenarioSnapshotId?: string;
	selectedOptionId: string | null;
}

export const RecordAttemptInputSchema = z.object({
	idempotencyKey: z.string().uuid(),
	inputValue: z.custom<Record<string, JsonValue>>().optional(),
	isCorrect: z.boolean(),
	isTimedOut: z.boolean().default(false),
	playthroughId: z.string().min(1).optional(),
	responseTimeMs: z.number().int().nonnegative(),
	scenarioId: z.string().uuid(),
	scenarioSnapshotId: z.string().min(1).optional(),
	selectedOptionId: z.string().optional().nullable(),
});

export type RecordAttemptInput = z.input<typeof RecordAttemptInputSchema>;

export type RecordAttemptResult = {
	attemptId?: string;
	error?: string;
	success: boolean;
};
