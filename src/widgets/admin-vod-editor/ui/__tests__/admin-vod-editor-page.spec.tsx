import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { auditEntries, scenarios } from "@/shared/db";
import { AdminVodEditorPage } from "../admin-vod-editor-page";

vi.mock("@tanstack/react-router");
vi.mock("../../api/server-fns");

import {
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	reorderScenarios,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
} from "../../api/server-fns";

describe("AdminVodEditorPage", () => {
	const currentAdmin = {
		email: "admin@example.com",
		id: "usr_admin",
		name: "Admin User",
		role: "ADMIN" as const,
	};

	const mockVod = {
		createdAt: new Date("2026-08-20T00:00:00Z"),
		durationSeconds: 600,
		heroName: "Ana",
		id: "vod_123",
		isPublished: false,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		role: "SUPPORT" as const,
		title: "GM Ana Match",
		youtubeVideoId: "dQw4w9WgXcQ",
	};

	const mockScenarios: Array<typeof scenarios.$inferSelect> = [
		{
			explanationText: "Position on high ground",
			id: "scen_1",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "High Ground" },
					{ id: "2", is_correct: false, text: "Low Ground" },
				],
			},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "STRATEGY",
			promptText: "Where should you position?",
			timeLimitSeconds: 15,
			timestampSeconds: 50,
			vodId: "vod_123",
		},
		{
			explanationText: "Check cooldown",
			id: "scen_2",
			imageUrl: null,
			inputConfig: { target: 3 },
			inputType: "TIME_SLIDER",
			moduleType: "COOLDOWN",
			promptText: "Is sleep dart ready?",
			timeLimitSeconds: null,
			timestampSeconds: 120,
			vodId: "vod_123",
		},
	];

	const mockAuditEntries: Array<typeof auditEntries.$inferSelect> = [
		{
			action: "VOD_CREATED",
			actorUserId: "usr_admin",
			createdAt: new Date("2026-08-20T00:00:00Z"),
			entityId: "vod_123",
			entityType: "VOD",
			id: "audit_1",
			metadata: { title: "GM Ana Match" },
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders create VOD view, handles cancel, and handles create errors", async () => {
		// Arrange
		vi.mocked(createVod).mockResolvedValueOnce({
			data: { ...mockVod, id: "vod_new" } as never,
			success: true,
		});

		// Act
		const { container } = render(
			<AdminVodEditorPage
				auditEntries={[]}
				currentUser={currentAdmin}
				initialScenarios={[]}
				initialVod={null}
				isCreate
			/>,
		);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Create New VOD" }),
		).toBeDefined();

		// Act: fill and submit
		fireEvent.change(screen.getByLabelText("VOD Title"), {
			target: { value: "New VOD Title" },
		});
		fireEvent.change(screen.getByLabelText("YouTube Video ID"), {
			target: { value: "dQw4w9WgXcQ" },
		});
		fireEvent.change(screen.getByLabelText("Hero Name"), {
			target: { value: "Ana" },
		});
		fireEvent.change(screen.getByLabelText("Map Name"), {
			target: { value: "King's Row" },
		});
		fireEvent.change(screen.getByLabelText("Duration (Seconds)"), {
			target: { value: "600" },
		});
		fireEvent.change(screen.getByLabelText("Rank Tier"), {
			target: { value: "Grandmaster" },
		});

		const form = container.querySelector("form");
		if (form) {
			fireEvent.submit(form);
		}

		// Assert
		await waitFor(() => {
			expect(createVod).toHaveBeenCalledWith({
				data: expect.objectContaining({
					title: "New VOD Title",
				}),
			});
		});

		// Act: cancel create VOD
		const cancelCreateBtn = screen.getByRole("button", { name: "Cancel" });
		fireEvent.click(cancelCreateBtn);

		// Act: Create failure response
		vi.mocked(createVod).mockResolvedValueOnce({
			error: "Duplicate VOD",
			success: false,
		});
		if (form) {
			fireEvent.submit(form);
		}
		await waitFor(() => {
			expect(screen.getByText("Duplicate VOD")).toBeDefined();
		});

		// Act: Create throw exception
		vi.mocked(createVod).mockRejectedValueOnce(
			new Error("Network create error"),
		);
		if (form) {
			fireEvent.submit(form);
		}
		await waitFor(() => {
			expect(screen.getByText("Network create error")).toBeDefined();
		});
	});

	it("renders edit view with scenario timeline, scenario editor, and publication controls", () => {
		// Arrange & Act
		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Assert
		expect(screen.getByText("GM Ana Match")).toBeDefined();
		expect(screen.getByText("Where should you position?")).toBeDefined();
		expect(screen.getByText("Is sleep dart ready?")).toBeDefined();
		expect(screen.getByText("Scenario Timeline")).toBeDefined();
		expect(screen.getByText("Publication Status:")).toBeDefined();
	});

	it("handles editing an existing scenario via updateScenario and handles errors", async () => {
		// Arrange
		const baseScenario = mockScenarios[0];
		if (!baseScenario) throw new Error("Missing mock scenario");

		vi.mocked(updateScenario).mockResolvedValueOnce({
			data: {
				...baseScenario,
				promptText: "Updated Positioning Prompt",
			} as never,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act: select first scenario
		fireEvent.click(screen.getByText("Where should you position?"));

		// Change prompt
		fireEvent.change(screen.getByLabelText("Prompt Text"), {
			target: { value: "Updated Positioning Prompt" },
		});

		// Submit scenario form
		const submitButton = screen.getByRole("button", { name: "Save Changes" });
		fireEvent.click(submitButton);

		// Assert
		await waitFor(() => {
			expect(updateScenario).toHaveBeenCalledWith({
				data: expect.objectContaining({
					id: "scen_1",
					promptText: "Updated Positioning Prompt",
				}),
			});
		});

		// Act: update failure response
		vi.mocked(updateScenario).mockResolvedValueOnce({
			error: "Update rejected",
			success: false,
		});
		fireEvent.click(submitButton);
		await waitFor(() => {
			expect(screen.getByText("Update rejected")).toBeDefined();
		});

		// Act: update throw exception
		vi.mocked(updateScenario).mockRejectedValueOnce(
			new Error("Update threw error"),
		);
		fireEvent.click(submitButton);
		await waitFor(() => {
			expect(screen.getByText("Update threw error")).toBeDefined();
		});

		// Act: cancel scenario edit
		const cancelBtn = screen.getByRole("button", { name: "Cancel" });
		fireEvent.click(cancelBtn);
	});

	it("handles creating a new scenario via createScenario and handles errors", async () => {
		// Arrange
		const createdScenario = {
			explanationText: "New explanation",
			id: "scen_new",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "A" },
					{ id: "2", is_correct: false, text: "B" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "New Scenario Prompt",
			timeLimitSeconds: null,
			timestampSeconds: 300,
			vodId: "vod_123",
		};
		vi.mocked(createScenario).mockResolvedValueOnce({
			data: createdScenario as never,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act: click Add Scenario
		fireEvent.click(screen.getByRole("button", { name: /add scenario/i }));

		fireEvent.change(screen.getByLabelText("Prompt Text"), {
			target: { value: "New Scenario Prompt" },
		});
		fireEvent.change(screen.getByLabelText("Explanation Text"), {
			target: { value: "New explanation" },
		});
		fireEvent.change(screen.getByLabelText("Timestamp (Seconds)"), {
			target: { value: "300" },
		});
		const optionInputs = screen.getAllByPlaceholderText(/enter option/i);
		const opt1 = optionInputs[0];
		const opt2 = optionInputs[1];
		if (opt1) {
			fireEvent.change(opt1, { target: { value: "A" } });
		}
		if (opt2) {
			fireEvent.change(opt2, { target: { value: "B" } });
		}

		fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));

		// Assert
		await waitFor(() => {
			expect(createScenario).toHaveBeenCalledWith({
				data: expect.objectContaining({
					promptText: "New Scenario Prompt",
					timestampSeconds: 300,
					vodId: "vod_123",
				}),
			});
		});

		// Act: create failure response
		vi.mocked(createScenario).mockResolvedValueOnce({
			error: "Create rejected",
			success: false,
		});
		fireEvent.click(screen.getByRole("button", { name: /add scenario/i }));
		fireEvent.change(screen.getByLabelText("Prompt Text"), {
			target: { value: "Prompt 2" },
		});
		fireEvent.change(screen.getByLabelText("Explanation Text"), {
			target: { value: "Exp 2" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));
		await waitFor(() => {
			expect(screen.getByText("Create rejected")).toBeDefined();
		});
	});

	it("handles deleting a scenario via deleteScenario and handles errors", async () => {
		// Arrange
		vi.mocked(deleteScenario).mockResolvedValueOnce({
			data: null,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act
		const deleteBtn = screen.getByRole("button", {
			name: "Delete scenario Where should you position?",
		});
		fireEvent.click(deleteBtn);

		// Assert
		await waitFor(() => {
			expect(deleteScenario).toHaveBeenCalledWith({
				data: { id: "scen_1" },
			});
		});

		// Act: delete error branch
		vi.mocked(deleteScenario).mockResolvedValueOnce({
			error: "Cannot delete scenario",
			success: false,
		});
		const deleteBtn2 = screen.getByRole("button", {
			name: "Delete scenario Is sleep dart ready?",
		});
		fireEvent.click(deleteBtn2);
		await waitFor(() => {
			expect(screen.getByText("Cannot delete scenario")).toBeDefined();
		});

		// Act: delete throw exception
		vi.mocked(deleteScenario).mockRejectedValueOnce(
			new Error("Scenario delete threw error"),
		);
		fireEvent.click(deleteBtn2);
		await waitFor(() => {
			expect(screen.getByText("Scenario delete threw error")).toBeDefined();
		});
	});

	it("handles reordering scenarios successfully", async () => {
		// Arrange
		vi.mocked(reorderScenarios).mockResolvedValueOnce({
			data: null,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act: move second scenario up
		const moveUpBtn = screen.getByRole("button", {
			name: "Move Is sleep dart ready? up",
		});
		fireEvent.click(moveUpBtn);

		// Assert
		await waitFor(() => {
			expect(reorderScenarios).toHaveBeenCalledWith({
				data: expect.objectContaining({
					vodId: "vod_123",
				}),
			});
		});
	});

	it("handles reordering scenarios errors", async () => {
		// Arrange
		vi.mocked(reorderScenarios).mockResolvedValueOnce({
			error: "Reorder failed",
			success: false,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act: move second scenario up
		const moveUpBtn = screen.getByRole("button", {
			name: "Move Is sleep dart ready? up",
		});
		fireEvent.click(moveUpBtn);

		// Assert
		await waitFor(() => {
			expect(screen.getByText("Reorder failed")).toBeDefined();
		});
	});

	it("handles publishing VOD and publication error branches", async () => {
		// Arrange
		vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
			data: { ...mockVod, isPublished: true } as never,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act
		const publishBtn = screen.getByRole("button", { name: "Publish VOD" });
		fireEvent.click(publishBtn);

		// Assert
		await waitFor(() => {
			expect(setVodPublicationStatus).toHaveBeenCalledWith({
				data: { id: "vod_123", isPublished: true },
			});
		});

		// Act: Publication failure response
		vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
			error: "Cannot publish draft",
			success: false,
		});
		const unpublishBtn = screen.getByRole("button", { name: "Unpublish VOD" });
		fireEvent.click(unpublishBtn);
		await waitFor(() => {
			expect(screen.getByText("Cannot publish draft")).toBeDefined();
		});

		// Act: Publication throw exception
		vi.mocked(setVodPublicationStatus).mockRejectedValueOnce(
			new Error("Publication threw exception"),
		);
		fireEvent.click(unpublishBtn);
		await waitFor(() => {
			expect(screen.getByText("Publication threw exception")).toBeDefined();
		});
	});

	it("handles deleting VOD and delete error branches", async () => {
		// Arrange
		vi.mocked(deleteVod).mockResolvedValueOnce({
			data: null,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act
		const deleteVodBtn = screen.getByRole("button", { name: "Delete VOD" });
		fireEvent.click(deleteVodBtn);

		// Assert
		await waitFor(() => {
			expect(deleteVod).toHaveBeenCalledWith({
				data: { id: "vod_123" },
			});
		});

		// Act: Delete error response
		vi.mocked(deleteVod).mockResolvedValueOnce({
			error: "Cannot delete VOD",
			success: false,
		});
		fireEvent.click(deleteVodBtn);
		await waitFor(() => {
			expect(screen.getByText("Cannot delete VOD")).toBeDefined();
		});

		// Act: Delete throw exception
		vi.mocked(deleteVod).mockRejectedValueOnce(
			new Error("Delete VOD threw exception"),
		);
		fireEvent.click(deleteVodBtn);
		await waitFor(() => {
			expect(screen.getByText("Delete VOD threw exception")).toBeDefined();
		});
	});

	it("switches tabs, edits VOD metadata, and handles metadata save errors", async () => {
		// Arrange
		vi.mocked(updateVod).mockResolvedValueOnce({
			data: { ...mockVod, title: "Updated GM Ana Title" } as never,
			success: true,
		});

		render(
			<AdminVodEditorPage
				auditEntries={mockAuditEntries}
				currentUser={currentAdmin}
				initialScenarios={mockScenarios}
				initialVod={mockVod}
				isCreate={false}
			/>,
		);

		// Act: Switch to VOD Details
		fireEvent.click(screen.getByRole("button", { name: "VOD Details" }));

		// Assert
		expect(screen.getByLabelText("VOD Title")).toBeDefined();

		// Act: Update title & save
		fireEvent.change(screen.getByLabelText("VOD Title"), {
			target: { value: "Updated GM Ana Title" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save VOD Metadata" }));

		// Assert
		await waitFor(() => {
			expect(updateVod).toHaveBeenCalledWith({
				data: expect.objectContaining({
					id: "vod_123",
					title: "Updated GM Ana Title",
				}),
			});
		});

		// Act: metadata save error response
		vi.mocked(updateVod).mockResolvedValueOnce({
			error: "Invalid metadata",
			success: false,
		});
		fireEvent.click(screen.getByRole("button", { name: "Save VOD Metadata" }));
		await waitFor(() => {
			expect(screen.getByText("Invalid metadata")).toBeDefined();
		});

		// Act: metadata save throw exception
		vi.mocked(updateVod).mockRejectedValueOnce(
			new Error("Metadata save network error"),
		);
		fireEvent.click(screen.getByRole("button", { name: "Save VOD Metadata" }));
		await waitFor(() => {
			expect(screen.getByText("Metadata save network error")).toBeDefined();
		});

		// Act: Switch to Audit History
		fireEvent.click(screen.getByRole("button", { name: "Audit History" }));

		// Assert
		expect(screen.getByText("VOD_CREATED")).toBeDefined();

		// Act: Switch back to Scenarios
		fireEvent.click(
			screen.getByRole("button", { name: "Scenarios & Timeline" }),
		);
		expect(screen.getByText("Scenario Timeline")).toBeDefined();
	});
});
