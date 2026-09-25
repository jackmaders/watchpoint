import type { z } from "zod";
import type {
	questionAuthoringSchema,
	questionUpdateSchema,
} from "./question-validation";

export type QuestionAuthoring = z.input<typeof questionAuthoringSchema>;
export type QuestionUpdate = z.input<typeof questionUpdateSchema>;
