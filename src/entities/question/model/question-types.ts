import type { z } from "zod";
import type {
	optionSelectSchema,
	questionInsertSchema,
	questionSelectSchema,
	questionUpdateSchema,
	questionWithOptionsSchema,
} from "./question-validation";

export type Question = z.infer<typeof questionSelectSchema>;
export type Option = z.infer<typeof optionSelectSchema>;
export type QuestionWithOptions = z.infer<typeof questionWithOptionsSchema>;

export type QuestionInsert = z.infer<typeof questionInsertSchema>;
export type QuestionInsertInput = z.input<typeof questionInsertSchema>;

export type QuestionUpdate = z.infer<typeof questionUpdateSchema>;
export type QuestionUpdateInput = z.input<typeof questionUpdateSchema>;
