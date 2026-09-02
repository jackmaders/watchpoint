/**
 * URL search parameter schema and validation for the interactive session player view.
 *
 * Implements `sessionSearchSchema` and `validateSessionSearch` to parse active module filters,
 * playthrough UUIDs, and prototype diagnostic variants.
 */
import { z } from "zod";

export const sessionSearchSchema = z.object({
	modules: z.string().optional(),
	playthroughId: z.string().uuid().optional(),
	prototype: z.enum(["media-recovery"]).optional(),
	variant: z.enum(["A", "B", "C"]).optional(),
});

export type SessionSearch = z.infer<typeof sessionSearchSchema>;

export function validateSessionSearch(search: unknown): SessionSearch {
	return sessionSearchSchema.parse(search);
}
