import type { z } from "zod";
import type { questionAuthoringSchema } from "./question-validation";

export type QuestionAuthoring = z.infer<typeof questionAuthoringSchema>;
