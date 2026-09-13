import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPage } from "../admin-users-page";

vi.mock("@tanstack/react-router");
vi.mock("../../api/loaders");

import { useUpdateUserRole } from "../../api/loaders";

describe("AdminUsersPage", () => {
	const currentAdmin = {
		email: "admin@example.com",
		id: "usr_admin",
		name: "Admin User",
		role: "ADMIN" as const,
	};

	const initialUsers = [
		{
			createdAt: new Date("2026-01-01"),
			email: "admin@example.com",
			emailVerified: false,
			id: "usr_admin",
			image: null,
			isTestAccount: false,
			name: "Admin User",
			role: "ADMIN" as const,
			updatedAt: new Date("2026-01-01"),
		},
		{
			createdAt: new Date("2026-01-02"),
			email: "player1@example.com",
			emailVerified: false,
			id: "usr_player1",
			image: null,
			isTestAccount: false,
			name: "Tracer Main",
			role: "PLAYER" as const,
			updatedAt: new Date("2026-01-02"),
		},
		{
			createdAt: new Date("2026-01-03"),
			email: "player2@example.com",
			emailVerified: false,
			id: "usr_player2",
			image: null,
			isTestAccount: false,
			name: "Ana Healer",
			role: "PLAYER" as const,
			updatedAt: new Date("2026-01-03"),
		},
	];

	const defaultMutation = {
		data: undefined,
		error: null,
		isError: false,
		isPending: false,
		mutate: vi.fn(),
		variables: undefined,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUpdateUserRole).mockReturnValue(defaultMutation as never);
	});

	it("renders user table with user list, summary, and filter controls", () => {
		// Arrange & Act
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);

		// Assert
		expect(
			screen.getByRole("heading", { name: /user management/i }),
		).toBeDefined();
		expect(
			screen.getByPlaceholderText(/search by name or email/i),
		).toBeDefined();
		expect(screen.getByText("Admin User")).toBeDefined();
		expect(screen.getByText("Tracer Main")).toBeDefined();
		expect(screen.getByText("Ana Healer")).toBeDefined();
		expect(screen.getByText("3 Total Users")).toBeDefined();
	});

	it("filters users by search query on name and email", () => {
		// Arrange
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);
		const searchInput = screen.getByPlaceholderText(/search by name or email/i);

		// Act: Search by name
		fireEvent.change(searchInput, { target: { value: "tracer" } });

		// Assert
		expect(screen.getByText("Tracer Main")).toBeDefined();
		expect(screen.queryByText("Ana Healer")).toBeNull();

		// Act: Search by email
		fireEvent.change(searchInput, { target: { value: "player2@example.com" } });

		// Assert
		expect(screen.getByText("Ana Healer")).toBeDefined();
		expect(screen.queryByText("Tracer Main")).toBeNull();

		// Act: Clear search query
		fireEvent.change(searchInput, { target: { value: "" } });

		// Assert
		expect(screen.getByText("Tracer Main")).toBeDefined();
		expect(screen.getByText("Ana Healer")).toBeDefined();
	});

	it("filters users by role selection for Admin, Player, and All", () => {
		// Arrange
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);
		const adminFilterBtn = screen.getByRole("button", { name: /^admins$/i });
		const playerFilterBtn = screen.getByRole("button", { name: /^players$/i });
		const allFilterBtn = screen.getByRole("button", { name: /^all$/i });

		// Act: Filter by Admins
		fireEvent.click(adminFilterBtn);

		// Assert
		expect(screen.getByText("Admin User")).toBeDefined();
		expect(screen.queryByText("Tracer Main")).toBeNull();

		// Act: Filter by Players
		fireEvent.click(playerFilterBtn);

		// Assert
		expect(screen.getByText("Tracer Main")).toBeDefined();
		expect(screen.getByText("Ana Healer")).toBeDefined();
		expect(screen.queryByText("Admin User")).toBeNull();

		// Act: Reset to All
		fireEvent.click(allFilterBtn);

		// Assert
		expect(screen.getByText("Admin User")).toBeDefined();
		expect(screen.getByText("Tracer Main")).toBeDefined();
		expect(screen.getByText("Ana Healer")).toBeDefined();
	});

	it("renders empty state when no users match search filter", () => {
		// Arrange
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);
		const searchInput = screen.getByPlaceholderText(/search by name or email/i);

		// Act
		fireEvent.change(searchInput, { target: { value: "nonexistent_query" } });

		// Assert
		expect(
			screen.getByText(/no users found matching current filters/i),
		).toBeDefined();
	});

	it("promotes player to admin on promote button click", () => {
		// Arrange
		const mutateMock = vi.fn();
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			mutate: mutateMock,
		} as never);

		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);
		const promoteBtn = screen.getByRole("button", {
			name: /make admin - tracer main/i,
		});

		// Act
		fireEvent.click(promoteBtn);

		// Assert
		expect(mutateMock).toHaveBeenCalledWith({
			newRole: "ADMIN",
			targetUserId: "usr_player1",
		});
	});

	it("disables demotion button for current user", () => {
		// Arrange & Act
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);

		// Assert
		const selfDemoteBtn = screen.getByRole("button", {
			name: /demote to player - admin user/i,
		});
		expect((selfDemoteBtn as HTMLButtonElement).disabled).toBe(true);
	});

	it("displays error message when mutation result is rejected", () => {
		// Arrange
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			data: {
				reason: "Cannot demote the last remaining administrator",
				status: "rejected",
			},
		} as never);

		const twoAdmins = [
			initialUsers[0],
			{
				...initialUsers[1],
				role: "ADMIN" as const,
			},
		];
		render(<AdminUsersPage currentUser={currentAdmin} users={twoAdmins} />);

		// Assert
		expect(
			screen.getByText("Cannot demote the last remaining administrator"),
		).toBeDefined();
	});

	it("demotes other admin to player on demote button click", () => {
		// Arrange
		const mutateMock = vi.fn();
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			mutate: mutateMock,
		} as never);

		const twoAdmins = [
			initialUsers[0],
			{
				...initialUsers[1],
				role: "ADMIN" as const,
			},
		];
		render(<AdminUsersPage currentUser={currentAdmin} users={twoAdmins} />);
		const demoteBtn = screen.getByRole("button", {
			name: /demote to player - tracer main/i,
		});

		// Act
		fireEvent.click(demoteBtn);

		// Assert
		expect(mutateMock).toHaveBeenCalledWith({
			newRole: "PLAYER",
			targetUserId: "usr_player1",
		});
	});

	it("shows saving state when mutation is pending for target user", () => {
		// Arrange
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			isPending: true,
			variables: { newRole: "ADMIN", targetUserId: "usr_player1" },
		} as never);

		// Act
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);

		// Assert
		expect(screen.getByText("Saving…")).toBeDefined();
	});

	it("shows saving state when mutation is pending for target admin", () => {
		// Arrange
		const twoAdmins = [
			initialUsers[0],
			{
				...initialUsers[1],
				role: "ADMIN" as const,
			},
		];
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			isPending: true,
			variables: { newRole: "PLAYER", targetUserId: "usr_player1" },
		} as never);

		// Act
		render(<AdminUsersPage currentUser={currentAdmin} users={twoAdmins} />);

		// Assert
		expect(screen.getByText("Saving…")).toBeDefined();
	});

	it("handles pending state when variables are undefined", () => {
		// Arrange
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			isPending: true,
			variables: undefined,
		} as never);

		// Act
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);

		// Assert
		expect(screen.queryByText("Saving…")).toBeNull();
	});

	it("displays error message when mutation error is an Error instance", () => {
		// Arrange
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			error: new Error("Network request failed"),
			isError: true,
		} as never);

		// Act
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);

		// Assert
		expect(screen.getByText("Network request failed")).toBeDefined();
	});

	it("displays default error message when mutation error is not an Error instance", () => {
		// Arrange
		vi.mocked(useUpdateUserRole).mockReturnValue({
			...defaultMutation,
			error: "Some string error",
			isError: true,
		} as never);

		// Act
		render(<AdminUsersPage currentUser={currentAdmin} users={initialUsers} />);

		// Assert
		expect(
			screen.getByText("Unable to update user role. Please try again."),
		).toBeDefined();
	});
});
