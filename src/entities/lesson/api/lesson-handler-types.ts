import type { getDb } from "@/shared/db/index.server";
import type { StartLessonInput } from "../model/lesson-types";

export type LessonDatabase = ReturnType<typeof getDb>;

export type StartLessonHandlerInput = StartLessonInput & { userId: string };
