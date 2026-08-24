import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { userRoleEnum, users } from "./schema";

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users, {
	email: (s) => s.email(),
	name: (s) => s.min(1, "Name is required"),
});

export const updateUserRoleInputSchema = z.object({
	actorUserId: z.string().min(1, "Actor user ID is required"),
	newRole: z.enum(userRoleEnum),
	targetUserId: z.string().min(1, "Target user ID is required"),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInputSchema>;
