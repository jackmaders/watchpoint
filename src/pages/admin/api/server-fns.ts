import { createServerFn } from "@tanstack/react-start";
import {
	type AuthenticatedUser,
	requirePermission,
} from "@/shared/lib/permissions";

export const checkAdminAccess = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthenticatedUser> => {
		return requirePermission("admin:access");
	},
);
