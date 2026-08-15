import { z } from "zod";

export const RecordAttemptInputSchema = z.object({
	inputValue: z.unknown().optional(),
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
