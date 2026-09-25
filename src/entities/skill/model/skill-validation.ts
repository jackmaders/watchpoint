import { createSelectSchema } from "drizzle-orm/zod";
import { skills } from "@/shared/db";

export const skillSelectSchema = createSelectSchema(skills);
