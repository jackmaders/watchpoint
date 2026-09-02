/**
 * Defines Zod validation and parsing schemas for audit log creation, input verification,
 * and entity inspection records.
 *
 * Implements data validation rules for the audit domain. Uses `drizzle-zod` to derive
 * `selectAuditEntrySchema` and `insertAuditEntrySchema` from the `auditEntries` table, enforcing
 * non-empty action, entity ID, and entity type strings alongside structured JSON metadata defaults.
 */

import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { auditEntries } from "../schema/audit";

export const selectAuditEntrySchema = createSelectSchema(auditEntries);
export const insertAuditEntrySchema = createInsertSchema(auditEntries, {
	action: (s) => s.min(1, "Action is required"),
	entityId: (s) => s.min(1, "Entity ID is required"),
	entityType: (s) => s.min(1, "Entity type is required"),
	metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAuditEntryInput = z.infer<typeof insertAuditEntrySchema>;
