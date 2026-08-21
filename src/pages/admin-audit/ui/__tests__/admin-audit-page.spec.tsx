import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminAuditLogItem } from "../admin-audit-page";

vi.mock("@tanstack/react-router");

import { AdminAuditPage } from "../admin-audit-page";

const mockAuditLogs: AdminAuditLogItem[] = [
	{
		action: "VOD_CREATED",
		actor: {
			createdAt: new Date("2026-01-01"),
			email: "admin@example.com",
			emailVerified: false,
			id: "usr_admin",
			image: null,
			isTestAccount: false,
			name: "Admin User",
			role: "ADMIN",
			updatedAt: new Date("2026-01-01"),
		},
		actorUserId: "usr_admin",
		createdAt: new Date("2026-01-01T12:00:00Z"),
		entityId: "vod_1",
		entityType: "VOD",
		id: "audit_1",
		metadata: {
			heroName: "Reinhardt",
			title: "GM Rein Guide",
		},
	},
	{
		action: "VOD_PUBLISHED",
		actor: null,
		actorUserId: null,
		createdAt: new Date("2026-01-02T15:30:00Z"),
		entityId: "vod_2",
		entityType: "VOD",
		id: "audit_2",
		metadata: {
			isPublished: true,
			previousState: false,
		},
	},
];

describe("AdminAuditPage", () => {
	it("renders audit header, logs table, actors, actions, and timestamps", () => {
		// Arrange & Act
		render(<AdminAuditPage initialLogs={mockAuditLogs} />);

		// Assert
		expect(screen.getByText("Audit Log")).toBeDefined();
		expect(screen.getByText("2 Total Log Entries")).toBeDefined();
		expect(screen.getByText("Admin User")).toBeDefined();
		expect(screen.getByText("admin@example.com")).toBeDefined();
		expect(screen.getByText("System / Automated")).toBeDefined();
		expect(screen.getByText("VOD: vod_1")).toBeDefined();
		expect(screen.getByText("VOD: vod_2")).toBeDefined();
	});

	it("filters audit logs by free-text search query across action, actor, entity, and metadata", () => {
		// Arrange
		render(<AdminAuditPage initialLogs={mockAuditLogs} />);
		const searchInput = screen.getByPlaceholderText(
			/search by actor, action, or entity…/i,
		);

		// Act: Search by action
		fireEvent.change(searchInput, { target: { value: "PUBLISHED" } });

		// Assert
		expect(screen.getByText("VOD: vod_2")).toBeDefined();
		expect(screen.queryByText("VOD: vod_1")).toBeNull();

		// Act: Search by actor email
		fireEvent.change(searchInput, { target: { value: "admin@example.com" } });

		// Assert
		expect(screen.getByText("VOD: vod_1")).toBeDefined();
		expect(screen.queryByText("VOD: vod_2")).toBeNull();

		// Act: Clear search
		fireEvent.change(searchInput, { target: { value: "" } });

		// Assert
		expect(screen.getByText("VOD: vod_1")).toBeDefined();
		expect(screen.getByText("VOD: vod_2")).toBeDefined();
	});

	it("filters audit logs by action type selection", () => {
		// Arrange
		render(<AdminAuditPage initialLogs={mockAuditLogs} />);

		// Act: select action filter
		const select = screen.getByLabelText(/filter by action/i);
		fireEvent.change(select, { target: { value: "VOD_PUBLISHED" } });

		// Assert
		expect(screen.getByText("VOD: vod_2")).toBeDefined();
		expect(screen.queryByText("VOD: vod_1")).toBeNull();
	});

	it("expands and collapses metadata details when clicking View Details", () => {
		// Arrange
		render(<AdminAuditPage initialLogs={mockAuditLogs} />);

		// Assert: metadata not visible initially
		expect(screen.queryByText(/"heroName": "Reinhardt"/i)).toBeNull();

		// Act: click View Details on audit_1
		fireEvent.click(
			screen.getByRole("button", { name: /view details for audit_1/i }),
		);

		// Assert: metadata visible
		expect(screen.getByText(/"heroName": "Reinhardt"/i)).toBeDefined();

		// Act: click Hide Details
		fireEvent.click(
			screen.getByRole("button", { name: /hide details for audit_1/i }),
		);

		// Assert: metadata collapsed
		expect(screen.queryByText(/"heroName": "Reinhardt"/i)).toBeNull();
	});

	it("renders empty state when no audit logs match search criteria", () => {
		// Arrange
		render(<AdminAuditPage initialLogs={mockAuditLogs} />);
		const searchInput = screen.getByPlaceholderText(
			/search by actor, action, or entity…/i,
		);

		// Act
		fireEvent.change(searchInput, { target: { value: "nonexistent_action" } });

		// Assert
		expect(
			screen.getByText(/no audit log entries found matching criteria/i),
		).toBeDefined();
	});

	it("renders distinct badge styles for deleted, updated, and custom actions", () => {
		// Arrange
		const diverseLogs: AdminAuditLogItem[] = [
			{
				action: "VOD_DELETED",
				actor: null,
				actorUserId: null,
				createdAt: new Date("2026-01-03T10:00:00Z"),
				entityId: "vod_del",
				entityType: "VOD",
				id: "audit_del",
				metadata: {},
			},
			{
				action: "VOD_UPDATED",
				actor: null,
				actorUserId: null,
				createdAt: new Date("2026-01-03T11:00:00Z"),
				entityId: "vod_upd",
				entityType: "VOD",
				id: "audit_upd",
				metadata: {},
			},
			{
				action: "SYSTEM_CONFIG",
				actor: null,
				actorUserId: null,
				createdAt: new Date("2026-01-03T12:00:00Z"),
				entityId: "sys_1",
				entityType: "SYSTEM",
				id: "audit_sys",
				metadata: {},
			},
		];

		// Act
		render(<AdminAuditPage initialLogs={diverseLogs} />);

		// Assert
		expect(screen.getByText("VOD: vod_del")).toBeDefined();
		expect(screen.getByText("VOD: vod_upd")).toBeDefined();
		expect(screen.getByText("SYSTEM: sys_1")).toBeDefined();
	});

	it("initializes and syncs with searchParams and invokes onFilterChange", () => {
		// Arrange
		const onFilterChange = vi.fn();
		const { rerender } = render(
			<AdminAuditPage
				initialLogs={mockAuditLogs}
				onFilterChange={onFilterChange}
				searchParams={{ action: "VOD_CREATED", search: "admin" }}
			/>,
		);

		// Assert: initialized from searchParams
		expect(screen.getByText("VOD: vod_1")).toBeDefined();
		expect(screen.queryByText("VOD: vod_2")).toBeNull();

		// Act: Change search input
		fireEvent.change(screen.getByPlaceholderText(/search by actor/i), {
			target: { value: "vod" },
		});

		// Assert
		expect(onFilterChange).toHaveBeenCalledWith({
			action: "VOD_CREATED",
			search: "vod",
		});

		// Act: Change action select
		fireEvent.change(screen.getByLabelText(/filter by action/i), {
			target: { value: "VOD_PUBLISHED" },
		});

		// Assert
		expect(onFilterChange).toHaveBeenCalledWith({
			action: "VOD_PUBLISHED",
			search: "vod",
		});

		// Act: Rerender with new searchParams (e.g. browser back button)
		rerender(
			<AdminAuditPage
				initialLogs={mockAuditLogs}
				onFilterChange={onFilterChange}
				searchParams={{ action: "ALL", search: "" }}
			/>,
		);

		// Assert
		expect(screen.getByText("VOD: vod_1")).toBeDefined();
		expect(screen.getByText("VOD: vod_2")).toBeDefined();

		// Act: Change search input after rerender
		fireEvent.change(screen.getByPlaceholderText(/search by actor/i), {
			target: { value: "test" },
		});

		// Assert
		expect(onFilterChange).toHaveBeenLastCalledWith({
			action: "ALL",
			search: "test",
		});

		// Act: Clear search input
		fireEvent.change(screen.getByPlaceholderText(/search by actor/i), {
			target: { value: "" },
		});

		// Assert
		expect(onFilterChange).toHaveBeenLastCalledWith({
			action: "ALL",
			search: undefined,
		});

		// Act: Change action when search is empty
		fireEvent.change(screen.getByLabelText(/filter by action/i), {
			target: { value: "VOD_CREATED" },
		});

		// Assert
		expect(onFilterChange).toHaveBeenLastCalledWith({
			action: "VOD_CREATED",
			search: undefined,
		});
	});

	it("handles filter changes without onFilterChange callback", () => {
		// Arrange
		render(<AdminAuditPage initialLogs={mockAuditLogs} />);

		// Act
		fireEvent.change(screen.getByPlaceholderText(/search by actor/i), {
			target: { value: "rein" },
		});
		fireEvent.change(screen.getByLabelText(/filter by action/i), {
			target: { value: "VOD_CREATED" },
		});

		// Assert
		expect(screen.getByText("VOD: vod_1")).toBeDefined();
	});
});
