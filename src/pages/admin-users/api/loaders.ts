/**
 * Data loading, query options, and mutation hooks for administrative user management.
 *
 * Implements `adminUsersQueryOptions`, `loadAdminUsers`, and `useUpdateUserRole` adhering to TanStack Query conventions.
 */

import type { QueryClient } from "@tanstack/react-query";
import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/api";
import type { UserRole } from "../model/types";
import { getAdminUsers, updateUserRole } from "./server-fns";

export const adminUsersQueryOptions = () =>
	queryOptions({
		queryFn: () => getAdminUsers({ data: {} }),
		queryKey: queryKeys.users,
	});

/** Warms the admin users query cache on server or navigation before rendering. */
export async function loadAdminUsers({
	context,
}: {
	context: { queryClient: QueryClient };
}) {
	await context.queryClient.query({
		...adminUsersQueryOptions(),
		staleTime: "static",
	});
}

/** Updates a user's role and invalidates the users cache. */
export function useUpdateUserRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: { newRole: UserRole; targetUserId: string }) =>
			updateUserRole({ data }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.users }),
	});
}
