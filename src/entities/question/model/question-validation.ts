import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod";
import { z } from "zod";
import { options } from "@/shared/db/schema/options";
import { questions } from "@/shared/db/schema/questions";

const questionColumns = {
	vodId: true,
	skillId: true,
	timestampSeconds: true,
	prompt: true,
	explanation: true,
} as const;

const questionFieldRefinements = {
	vodId: z.string().min(1),
	skillId: z.string().min(1),
	timestampSeconds: z.number().int().nonnegative(),
	prompt: z.string().trim().min(1),
	explanation: z.string().trim().min(1),
};

const optionInsertSchema = createInsertSchema(options, {
	id: z.string().min(1).optional(),
	text: z.string().trim().min(1),
	isCorrect: z.boolean(),
}).pick({ id: true, text: true, isCorrect: true });

const questionOptionsSchema = z
	.array(optionInsertSchema)
	.min(2)
	.superRefine((questionOptions, context) => {
		const optionIds = new Set<string>();
		questionOptions.forEach((option, index) => {
			if (!option.id) {
				return;
			}

			if (optionIds.has(option.id)) {
				context.addIssue({
					code: "custom",
					message: "Option IDs must be unique within a Question.",
					path: [index, "id"],
				});
			}

			optionIds.add(option.id);
		});
	});

const questionInsertFieldsSchema = createInsertSchema(
	questions,
	questionFieldRefinements,
).pick(questionColumns);

const questionUpdateBaseSchema = createUpdateSchema(questions, {
	...questionFieldRefinements,
	id: z.string().min(1),
})
	.pick({ ...questionColumns, id: true })
	.required();

const hasExactlyOneCorrectOption = (
	options: z.infer<typeof questionOptionsSchema>,
) => options.filter((option) => option.isCorrect).length === 1;

const correctOptionIssue = {
	message: "A Question must have exactly one correct Option.",
	path: ["options"],
};

export const questionInsertSchema = questionInsertFieldsSchema
	.extend({ options: questionOptionsSchema })
	.refine((question) => hasExactlyOneCorrectOption(question.options), {
		...correctOptionIssue,
	});

export const questionUpdateSchema = questionUpdateBaseSchema
	.extend({ options: questionOptionsSchema })
	.refine((question) => hasExactlyOneCorrectOption(question.options), {
		...correctOptionIssue,
	});

export const questionSelectSchema = createSelectSchema(questions);
export const optionSelectSchema = createSelectSchema(options);

export const questionWithOptionsSchema = questionSelectSchema.extend({
	options: optionSelectSchema.array(),
});
