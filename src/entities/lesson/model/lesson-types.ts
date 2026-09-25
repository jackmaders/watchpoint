import type { z } from "zod/v4";
import type { startLessonSchema } from "./lesson-validation";

export type StartLessonInput = z.infer<typeof startLessonSchema>;
