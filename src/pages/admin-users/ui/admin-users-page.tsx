"use client";

import { useCallback, useMemo, useState } from "react";
import type { UserItem, UserRole } from "@/shared/db";
import type { AuthenticatedUser } from "@/shared/lib/permissions";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { updateUserRole } from "../api/server-fns";

export interface AdminUsersPageProps {
	currentUser: AuthenticatedUser;
	initialUsers: UserItem[];
}

interface AdminUsersHeaderProps {
	totalCount: number;
}

function AdminUsersHeader({ totalCount }: AdminUsersHeaderProps) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					User Management
				</h1>
				<p className="text-sm text-muted-foreground">
					View platform users, assign administrator privileges, and audit
					access.
				</p>
			</div>
			<div className="text-sm font-medium text-muted-foreground">
				{totalCount} Total Users
			</div>
		</div>
	);
}

interface AdminUsersFiltersProps {
	onFilterAdmin: () => void;
	onFilterAll: () => void;
	onFilterPlayer: () => void;
	onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	roleFilter: "ALL" | UserRole;
	searchQuery: string;
}

function AdminUsersFilters({
	onFilterAdmin,
	onFilterAll,
	onFilterPlayer,
	onSearchChange,
	roleFilter,
	searchQuery,
}: AdminUsersFiltersProps) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="w-full sm:max-w-xs">
				<Input
					onChange={onSearchChange}
					placeholder="Search by name or email…"
					value={searchQuery}
				/>
			</div>
			<div className="flex items-center gap-2">
				<Button
					onClick={onFilterAll}
					size="sm"
					variant={roleFilter === "ALL" ? "default" : "outline"}
				>
					All
				</Button>
				<Button
					onClick={onFilterAdmin}
					size="sm"
					variant={roleFilter === "ADMIN" ? "default" : "outline"}
				>
					Admins
				</Button>
				<Button
					onClick={onFilterPlayer}
					size="sm"
					variant={roleFilter === "PLAYER" ? "default" : "outline"}
				>
					Players
				</Button>
			</div>
		</div>
	);
}

interface AdminUsersRowActionProps {
	isSelf: boolean;
	isUpdating: boolean;
	onToggle: () => void;
	role: UserRole;
	userName: string;
}

function AdminUsersRowAction({
	isSelf,
	isUpdating,
	onToggle,
	role,
	userName,
}: AdminUsersRowActionProps) {
	if (role === "ADMIN") {
		const label = isUpdating
			? "Saving…"
			: isSelf
				? "Current User"
				: "Demote to Player";
		return (
			<Button
				aria-label={`Demote to Player - ${userName}`}
				disabled={isSelf || isUpdating}
				onClick={onToggle}
				size="sm"
				variant="outline"
			>
				{label}
			</Button>
		);
	}

	return (
		<Button
			aria-label={`Make Admin - ${userName}`}
			disabled={isUpdating}
			onClick={onToggle}
			size="sm"
			variant="default"
		>
			{isUpdating ? "Saving…" : "Make Admin"}
		</Button>
	);
}

interface AdminUsersTableRowProps {
	isSelf: boolean;
	isUpdating: boolean;
	onToggleRole: (user: UserItem) => void;
	user: UserItem;
}

function AdminUsersTableRow({
	isSelf,
	isUpdating,
	onToggleRole,
	user,
}: AdminUsersTableRowProps) {
	const handleToggle = useCallback(() => {
		onToggleRole(user);
	}, [onToggleRole, user]);

	return (
		<tr className="hover:bg-muted/30 transition-colors">
			<td className="px-6 py-4">
				<div className="font-medium text-foreground">
					{user.name}
					{isSelf ? (
						<span className="ml-2 text-xs font-normal text-muted-foreground">
							(You)
						</span>
					) : null}
				</div>
				<div className="text-xs text-muted-foreground">{user.email}</div>
			</td>
			<td className="px-6 py-4">
				<span
					className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
						user.role === "ADMIN"
							? "bg-primary/10 text-primary border border-primary/20"
							: "bg-muted text-muted-foreground border border-border"
					}`}
				>
					{user.role}
				</span>
			</td>
			<td className="px-6 py-4 text-muted-foreground text-xs">
				{new Date(user.createdAt).toLocaleDateString()}
			</td>
			<td className="px-6 py-4 text-right">
				<AdminUsersRowAction
					isSelf={isSelf}
					isUpdating={isUpdating}
					onToggle={handleToggle}
					role={user.role}
					userName={user.name}
				/>
			</td>
		</tr>
	);
}

interface AdminUsersTableProps {
	currentUserId: string;
	onToggleRole: (user: UserItem) => void;
	updatingUserId: string | null;
	users: UserItem[];
}

function AdminUsersTable({
	currentUserId,
	onToggleRole,
	updatingUserId,
	users,
}: AdminUsersTableProps) {
	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						<tr>
							<th className="px-6 py-3" scope="col">
								User
							</th>
							<th className="px-6 py-3" scope="col">
								Role
							</th>
							<th className="px-6 py-3" scope="col">
								Registered
							</th>
							<th className="px-6 py-3 text-right" scope="col">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{users.length === 0 ? (
							<tr>
								<td
									className="px-6 py-8 text-center text-muted-foreground"
									colSpan={4}
								>
									No users found matching current filters.
								</td>
							</tr>
						) : (
							users.map((user) => (
								<AdminUsersTableRow
									isSelf={user.id === currentUserId}
									isUpdating={updatingUserId === user.id}
									key={user.id}
									onToggleRole={onToggleRole}
									user={user}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function AdminUsersPage({
	currentUser,
	initialUsers,
}: AdminUsersPageProps) {
	const [users, setUsers] = useState<UserItem[]>(initialUsers);
	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
	const [error, setError] = useState<string | null>(null);
	const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchQuery(e.target.value);
		},
		[],
	);

	const handleFilterAll = useCallback(() => setRoleFilter("ALL"), []);
	const handleFilterAdmin = useCallback(() => setRoleFilter("ADMIN"), []);
	const handleFilterPlayer = useCallback(() => setRoleFilter("PLAYER"), []);

	const filteredUsers = useMemo(() => {
		return users.filter((u) => {
			if (roleFilter !== "ALL" && u.role !== roleFilter) {
				return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				return (
					u.name.toLowerCase().includes(query) ||
					u.email.toLowerCase().includes(query)
				);
			}
			return true;
		});
	}, [users, roleFilter, searchQuery]);

	const handleRoleToggle = useCallback(async (user: UserItem) => {
		const newRole: UserRole = user.role === "ADMIN" ? "PLAYER" : "ADMIN";
		setError(null);
		setUpdatingUserId(user.id);

		try {
			const result = await updateUserRole({
				data: {
					newRole,
					targetUserId: user.id,
				},
			});

			if (!result.success) {
				setError(result.error ?? "Failed to update role");
				return;
			}

			setUsers((prev) =>
				prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
			);
		} catch {
			setError("Unable to update user role. Please try again.");
		} finally {
			setUpdatingUserId(null);
		}
	}, []);

	return (
		<div className="space-y-6">
			<AdminUsersHeader totalCount={users.length} />

			{error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<AdminUsersFilters
				onFilterAdmin={handleFilterAdmin}
				onFilterAll={handleFilterAll}
				onFilterPlayer={handleFilterPlayer}
				onSearchChange={handleSearchChange}
				roleFilter={roleFilter}
				searchQuery={searchQuery}
			/>

			<AdminUsersTable
				currentUserId={currentUser.id}
				onToggleRole={handleRoleToggle}
				updatingUserId={updatingUserId}
				users={filteredUsers}
			/>
		</div>
	);
}
