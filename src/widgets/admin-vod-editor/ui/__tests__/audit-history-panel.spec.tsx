import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type AuditEntryItem, AuditHistoryPanel } from "../audit-history-panel";

describe("AuditHistoryPanel", () => {
	it("renders mutation history items with actor and action details", () => {
		// Arrange
		const mockEntries: AuditEntryItem[] = [
			{
				action: "VOD_CREATED",
				actor: { email: "admin@example.com", name: "Admin One" },
				actorUserId: "usr_1",
				createdAt: new Date("2026-08-20T10:00:00Z"),
				entityId: "vod_123",
				entityType: "VOD",
				id: "audit_1",
				metadata: { title: "Ana King's Row" },
			},
			{
				action: "SCENARIO_CREATED",
				actor: { email: "admin2@example.com", name: "Admin Two" },
				actorUserId: "usr_2",
				createdAt: new Date("2026-08-20T10:15:00Z"),
				entityId: "scen_456",
				entityType: "SCENARIO",
				id: "audit_2",
				metadata: { moduleType: "STRATEGY", promptText: "First Push" },
			},
		];

		// Act
		render(<AuditHistoryPanel auditEntries={mockEntries} />);

		// Assert
		expect(screen.getByText("Audit History")).toBeDefined();
		expect(screen.getByText("VOD_CREATED")).toBeDefined();
		expect(screen.getByText("SCENARIO_CREATED")).toBeDefined();
		expect(screen.getByText("Admin One")).toBeDefined();
		expect(screen.getByText("Admin Two")).toBeDefined();
	});

	it("renders empty state when no audit entries are present", () => {
		// Arrange & Act
		render(<AuditHistoryPanel auditEntries={[]} />);

		// Assert
		expect(
			screen.getByText("No audit history found for this VOD."),
		).toBeDefined();
	});

	it("renders entries with missing actor, null metadata, and empty metadata gracefully", () => {
		// Arrange
		const entries: AuditEntryItem[] = [
			{
				action: "VOD_UPDATED",
				actor: null,
				actorUserId: null,
				createdAt: new Date("2026-08-20T11:00:00Z"),
				entityId: "vod_123",
				entityType: "VOD",
				id: "audit_3",
				metadata: null,
			},
			{
				action: "VOD_DELETED",
				actor: { email: "no-name@example.com" },
				actorUserId: "usr_4",
				createdAt: new Date("2026-08-20T11:30:00Z"),
				entityId: "vod_123",
				entityType: "VOD",
				id: "audit_4",
				metadata: {},
			},
		];

		// Act
		render(<AuditHistoryPanel auditEntries={entries} />);

		// Assert
		expect(screen.getByText("System / Admin")).toBeDefined();
		expect(screen.getByText("no-name@example.com")).toBeDefined();
	});
});
