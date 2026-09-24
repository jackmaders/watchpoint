import { z } from "zod/v4";
import type { QuestionSnapshot } from "@/shared/db/schema/lessons";

export type { QuestionSnapshot } from "@/shared/db/schema/lessons";

const snapshotOptionSchema = z
	.object({
		id: z.string().trim().min(1),
		orderIndex: z.number().int().nonnegative(),
		text: z.string().trim().min(1),
		isCorrect: z.boolean(),
	})
	.strict();

export const questionSnapshotSchema = z
	.object({
		questionId: z.string().trim().min(1),
		prompt: z.string().trim().min(1),
		explanation: z.string().nullable(),
		timestampSeconds: z.number().int().nonnegative(),
		skillId: z.string().trim().min(1),
		skillName: z.string().trim().min(1),
		skillSlug: z.string().trim().min(1),
		options: z.array(snapshotOptionSchema).min(2),
		selectedOption: snapshotOptionSchema,
	})
	.strict()
	.superRefine((snapshot, context) => {
		const optionIds = new Set<string>();
		let correctOptionCount = 0;

		for (const [index, option] of snapshot.options.entries()) {
			if (optionIds.has(option.id)) {
				context.addIssue({
					code: "custom",
					message: "Options must have unique ids",
					path: ["options", index, "id"],
				});
			}
			optionIds.add(option.id);
			if (option.isCorrect) {
				correctOptionCount += 1;
			}
			if (option.orderIndex !== index) {
				context.addIssue({
					code: "custom",
					message: "Options must be ordered by orderIndex",
					path: ["options", index, "orderIndex"],
				});
			}
		}

		if (correctOptionCount !== 1) {
			context.addIssue({
				code: "custom",
				message: "A Question must have exactly one correct Option",
				path: ["options"],
			});
		}
		const selectedOption = snapshot.options.find(
			(option) => option.id === snapshot.selectedOption.id,
		);
		if (!selectedOption) {
			context.addIssue({
				code: "custom",
				message: "The selected Option must be present in options",
				path: ["selectedOption", "id"],
			});
		} else if (
			JSON.stringify(selectedOption) !== JSON.stringify(snapshot.selectedOption)
		) {
			context.addIssue({
				code: "custom",
				message: "The selected Option must match its option entry",
				path: ["selectedOption"],
			});
		}
	});

export interface QuestionSnapshotAnswerContext {
	questionId: string;
	selectedOptionId: string;
	skillId: string;
}

/** Parses persisted or submitted JSON at an Answer boundary. */
export function parseQuestionSnapshot(value: unknown): QuestionSnapshot {
	const snapshot: QuestionSnapshot = questionSnapshotSchema.parse(value);
	return snapshot;
}

/** Verifies that a complete snapshot belongs to the Answer being persisted. */
export function validateQuestionSnapshotForAnswer(
	value: unknown,
	context: QuestionSnapshotAnswerContext,
): QuestionSnapshot {
	const snapshot = parseQuestionSnapshot(value);

	if (
		snapshot.questionId !== context.questionId ||
		snapshot.skillId !== context.skillId ||
		snapshot.selectedOption.id !== context.selectedOptionId
	) {
		throw new Error("QuestionSnapshot does not match the Answer context");
	}

	return snapshot;
}
