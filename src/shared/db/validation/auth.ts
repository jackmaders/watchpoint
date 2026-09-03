/**
 * Defines Zod validation schemas and type parsers for user records, authentication inputs,
 * and administrative role change operations.
 *
 * Implements data validation rules for authentication and user management domains. Uses `drizzle-orm/zod`
 * and Zod to generate `selectUserSchema`, `insertUserSchema`, and `updateUserRoleInputSchema`, verifying
 * email formats, mandatory names, and strict role enumerations ("PLAYER" | "ADMIN").
 */

import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";
import { userRoleEnum, users } from "../schema/auth";

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
