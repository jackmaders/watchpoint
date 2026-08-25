import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { auditEntries } from "./schema";

export const selectAuditEntrySchema = createSelectSchema(auditEntries);
export const insertAuditEntrySchema = createInsertSchema(auditEntries, {
	action: (s) => s.min(1, "Action is required"),
	entityId: (s) => s.min(1, "Entity ID is required"),
	entityType: (s) => s.min(1, "Entity type is required"),
	metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAuditEntryInput = z.infer<typeof insertAuditEntrySchema>;
