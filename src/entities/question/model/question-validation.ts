import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";
import { options } from "@/shared/db/schema/options";
import { questions } from "@/shared/db/schema/questions";

const optionInputSchema = createInsertSchema(options, {
	text: z.string().trim().min(1),
	isCorrect: z.boolean(),
}).pick({ id: true, text: true, isCorrect: true });

const questionFieldsSchema = createInsertSchema(questions, {
	vodId: z.string().min(1),
	skillId: z.string().min(1),
	timestampSeconds: z.number().int().nonnegative(),
	prompt: z.string().trim().min(1),
	explanation: z.string().trim().min(1),
})
	.pick({
		vodId: true,
		skillId: true,
		timestampSeconds: true,
		prompt: true,
		explanation: true,
	})
	.extend({
		options: z.array(optionInputSchema).min(2),
	});

const hasExactlyOneCorrectOption = (
	question: z.infer<typeof questionFieldsSchema>,
) => question.options.filter((option) => option.isCorrect).length === 1;

export const questionAuthoringSchema = questionFieldsSchema.refine(
	hasExactlyOneCorrectOption,
	{
		message: "A Question must have exactly one correct Option.",
		path: ["options"],
	},
);

export const questionUpdateSchema = questionFieldsSchema
	.extend({ id: z.string().min(1) })
	.refine(hasExactlyOneCorrectOption, {
		message: "A Question must have exactly one correct Option.",
		path: ["options"],
	});

export const questionSelectSchema = createSelectSchema(questions);
export const optionSelectSchema = createSelectSchema(options);

export const questionWithOptionsSchema = questionSelectSchema.extend({
	options: optionSelectSchema.array(),
});
