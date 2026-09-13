/**
 * Type definitions for administrative user management.
 *
 * Exposes UserRole and UserItem types derived from database schema for consumption by UI and API layers.
 */
import type { UserRole, users } from "@/shared/db";

export type { UserRole };
export type UserItem = typeof users.$inferSelect;
