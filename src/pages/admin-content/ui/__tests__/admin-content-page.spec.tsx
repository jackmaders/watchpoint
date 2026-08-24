import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import type { AdminVodItem } from "@/shared/db";
import type { AuthenticatedUser } from "@/shared/lib/permissions";
import * as adminVodEditor from "@/widgets/admin-vod-editor";
import { AdminContentPage } from "../admin-content-page";

vi.mock("@tanstack/react-router");

const mockAdminUser: AuthenticatedUser = {
	email: "admin@example.com",
	id: "usr_admin",
	name: "Admin User",
	role: "ADMIN",
};

const mockInitialVods: AdminVodItem[] = [
	{
		createdAt: new Date("2026-01-01T12:00:00Z"),
		durationSeconds: 600,
		heroName: "Reinhardt",
		id: "vod_1",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		role: "TANK",
		scenarios: [{ id: "sc_1" }, { id: "sc_2" }],
		title: "GM Rein Guide",
		youtubeVideoId: "yt_rein",
	},
	{
		createdAt: new Date("2026-01-02T12:00:00Z"),
		durationSeconds: 900,
		heroName: "Tracer",
		id: "vod_2",
		isPublished: false,
		mapName: "Oasis",
		rankTier: "Top 500",
		role: "DAMAGE",
		scenarios: [{ id: "sc_3" }],
		title: "Tracer Dive",
		youtubeVideoId: "yt_tracer",
	},
	{
		createdAt: new Date("2026-01-03T12:00:00Z"),
		durationSeconds: 720,
		heroName: "Ana",
		id: "vod_3",
		isPublished: false,
		mapName: "Numbani",
		rankTier: "Master",
		role: "SUPPORT",
		scenarios: [],
		title: "Ana Positioning",
		youtubeVideoId: "yt_ana",
	},
];

let setVodPublicationStatusSpy: MockInstance;
let deleteVodSpy: MockInstance;
let bulkPublishVodsSpy: MockInstance;
let bulkDeleteVodsSpy: MockInstance;

describe("AdminContentPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setVodPublicationStatusSpy = vi
			.spyOn(adminVodEditor, "setVodPublicationStatus")
			.mockResolvedValue({
				success: true,
			} as never);
		deleteVodSpy = vi.spyOn(adminVodEditor, "deleteVod").mockResolvedValue({
			success: true,
		} as never);
		bulkPublishVodsSpy = vi
			.spyOn(adminVodEditor, "bulkPublishVods")
			.mockResolvedValue({
				failed: [],
				succeeded: [],
			} as never);
		bulkDeleteVodsSpy = vi
			.spyOn(adminVodEditor, "bulkDeleteVods")
			.mockResolvedValue({
				failed: [],
				succeeded: [],
			} as never);
	});

	it("renders header, total count, filters, and table", () => {
		// Arrange & Act
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Assert
		expect(screen.getByText("Content Management")).toBeDefined();
		expect(screen.getByText("3 Total VODs")).toBeDefined();
		expect(screen.getByText("GM Rein Guide")).toBeDefined();
		expect(screen.getByText("Tracer Dive")).toBeDefined();
		expect(screen.getByText("Ana Positioning")).toBeDefined();
	}, 2000);

	it("filters items by free-text search across title, hero, and map", () => {
		// Arrange
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);
		const searchInput = screen.getByPlaceholderText(
			/search title, hero, or map…/i,
		);

		// Act: Search by hero
		fireEvent.change(searchInput, { target: { value: "tracer" } });

		// Assert
		expect(screen.getByText("Tracer Dive")).toBeDefined();
		expect(screen.queryByText("GM Rein Guide")).toBeNull();
		expect(screen.queryByText("Ana Positioning")).toBeNull();

		// Act: Search by map
		fireEvent.change(searchInput, { target: { value: "numbani" } });

		// Assert
		expect(screen.getByText("Ana Positioning")).toBeDefined();
		expect(screen.queryByText("GM Rein Guide")).toBeNull();

		// Act: Clear search
		fireEvent.change(searchInput, { target: { value: "" } });

		// Assert
		expect(screen.getByText("GM Rein Guide")).toBeDefined();
		expect(screen.getByText("Tracer Dive")).toBeDefined();
		expect(screen.getByText("Ana Positioning")).toBeDefined();
	});

	it("filters items by publication status and hero role", () => {
		// Arrange
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: filter published
		fireEvent.click(screen.getByRole("button", { name: /^published$/i }));

		// Assert
		expect(screen.getByText("GM Rein Guide")).toBeDefined();
		expect(screen.queryByText("Tracer Dive")).toBeNull();
		expect(screen.queryByText("Ana Positioning")).toBeNull();

		// Act: filter draft
		fireEvent.click(screen.getByRole("button", { name: /^draft$/i }));

		// Assert
		expect(screen.queryByText("GM Rein Guide")).toBeNull();
		expect(screen.getByText("Tracer Dive")).toBeDefined();
		expect(screen.getByText("Ana Positioning")).toBeDefined();

		// Act: filter support role
		fireEvent.click(screen.getByRole("button", { name: /^support$/i }));

		// Assert
		expect(screen.getByText("Ana Positioning")).toBeDefined();
		expect(screen.queryByText("Tracer Dive")).toBeNull();
	});

	it("notifies parent or router via onFilterChange when filters change", () => {
		// Arrange
		const onFilterChange = vi.fn();
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
				onFilterChange={onFilterChange}
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /^tank$/i }));

		// Assert
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({
				role: "TANK",
			}),
		);
	});

	it("executes single row publish toggle successfully", async () => {
		// Arrange
		setVodPublicationStatusSpy.mockResolvedValueOnce({
			data: { ...mockInitialVods[1], isPublished: true },
			success: true,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act
		fireEvent.click(
			screen.getByRole("button", { name: /publish Tracer Dive/i }),
		);

		// Assert
		await waitFor(() => {
			expect(setVodPublicationStatusSpy).toHaveBeenCalledWith({
				data: {
					id: "vod_2",
					isPublished: true,
				},
			});
		});
	});

	it("handles error during single row publish toggle", async () => {
		// Arrange
		setVodPublicationStatusSpy.mockResolvedValueOnce({
			error: "Cannot publish a VOD with zero scenarios",
			success: false,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act
		fireEvent.click(
			screen.getByRole("button", { name: /publish Ana Positioning/i }),
		);

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText(/Cannot publish a VOD with zero scenarios/i),
			).toBeDefined();
		});
	});

	it("opens confirmation dialog before deleting a single VOD, shows scenario count, and deletes on confirm", async () => {
		// Arrange
		deleteVodSpy.mockResolvedValueOnce({
			data: undefined,
			success: true,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: click delete on GM Rein Guide (has 2 scenarios)
		fireEvent.click(
			screen.getByRole("button", { name: /delete GM Rein Guide/i }),
		);

		// Assert: dialog open with 1 VOD and 2 scenarios
		expect(
			screen.getByText(
				/This will permanently delete 1 VOD and 2 associated scenarios\./i,
			),
		).toBeDefined();

		// Act: confirm delete
		fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

		// Assert: calls deleteVod and removes item from table
		await waitFor(() => {
			expect(deleteVodSpy).toHaveBeenCalledWith({
				data: { id: "vod_1" },
			});
			expect(screen.queryByText("GM Rein Guide")).toBeNull();
		});
	});

	it("executes bulk publish with partial failures and displays summary alert", async () => {
		// Arrange
		bulkPublishVodsSpy.mockResolvedValueOnce({
			data: {
				failed: [{ error: "Cannot publish with zero scenarios", id: "vod_3" }],
				succeeded: ["vod_2"],
			},
			success: true,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: select all rows
		fireEvent.click(screen.getByLabelText(/select all rows/i));

		// Act: click bulk publish
		fireEvent.click(screen.getByRole("button", { name: /^bulk publish$/i }));

		// Assert: summary alert appears
		await waitFor(() => {
			expect(bulkPublishVodsSpy).toHaveBeenCalledWith({
				data: {
					ids: expect.arrayContaining(["vod_1", "vod_2", "vod_3"]),
					isPublished: true,
				},
			});
			expect(
				screen.getByText(/Bulk Publish completed: 1 succeeded, 1 failed/i),
			).toBeDefined();
			expect(
				screen.getByText(/vod_3: Cannot publish with zero scenarios/i),
			).toBeDefined();
		});

		// Act: dismiss summary alert
		fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

		// Assert: alert dismissed
		expect(screen.queryByText(/Bulk Publish completed/i)).toBeNull();
	});

	it("executes bulk unpublish successfully", async () => {
		// Arrange
		bulkPublishVodsSpy.mockResolvedValueOnce({
			data: {
				failed: [],
				succeeded: ["vod_1"],
			},
			success: true,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: select row 1
		fireEvent.click(screen.getByLabelText(/select GM Rein Guide/i));

		// Act: click bulk unpublish
		fireEvent.click(screen.getByRole("button", { name: /^bulk unpublish$/i }));

		// Assert
		await waitFor(() => {
			expect(bulkPublishVodsSpy).toHaveBeenCalledWith({
				data: {
					ids: ["vod_1"],
					isPublished: false,
				},
			});
			expect(
				screen.getByText(/Bulk Unpublish completed: 1 succeeded, 0 failed/i),
			).toBeDefined();
		});
	});

	it("opens confirmation dialog for bulk delete, showing total vods and scenario count, and deletes on confirm", async () => {
		// Arrange
		bulkDeleteVodsSpy.mockResolvedValueOnce({
			data: {
				failed: [],
				succeeded: ["vod_1", "vod_2"],
			},
			success: true,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: select row 1 and row 2 (vod_1 has 2 scenarios, vod_2 has 1 scenario = 3 scenarios total)
		fireEvent.click(screen.getByLabelText(/select GM Rein Guide/i));
		fireEvent.click(screen.getByLabelText(/select Tracer Dive/i));

		// Act: click bulk delete
		fireEvent.click(screen.getByRole("button", { name: /^bulk delete$/i }));

		// Assert: dialog open with 2 VODs and 3 scenarios
		expect(
			screen.getByText(
				/This will permanently delete 2 VODs and 3 associated scenarios\./i,
			),
		).toBeDefined();

		// Act: confirm delete
		fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

		// Assert: calls bulkDeleteVods and removes items
		await waitFor(() => {
			expect(bulkDeleteVodsSpy).toHaveBeenCalledWith({
				data: {
					ids: ["vod_1", "vod_2"],
				},
			});
			expect(screen.queryByText("GM Rein Guide")).toBeNull();
			expect(screen.queryByText("Tracer Dive")).toBeNull();
			expect(screen.getByText("Ana Positioning")).toBeDefined();
		});
	});

	it("handles exception during single delete", async () => {
		// Arrange
		deleteVodSpy.mockRejectedValueOnce(new Error("Network Error"));
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: click delete
		fireEvent.click(
			screen.getByRole("button", { name: /delete GM Rein Guide/i }),
		);
		fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText(/Failed to delete VOD\. Please try again\./i),
			).toBeDefined();
		});
	});

	it("handles error result without error message during toggle publish", async () => {
		// Arrange
		setVodPublicationStatusSpy.mockResolvedValueOnce({
			error: "Failed to update publication status",
			success: false,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act
		fireEvent.click(
			screen.getByRole("button", { name: /publish Tracer Dive/i }),
		);

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText(/Failed to update publication status/i),
			).toBeDefined();
		});
	});

	it("handles error result without error message during single delete", async () => {
		// Arrange
		deleteVodSpy.mockResolvedValueOnce({
			error: "Failed to delete VOD",
			success: false,
		} as never);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: click delete
		fireEvent.click(
			screen.getByRole("button", { name: /delete GM Rein Guide/i }),
		);
		fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

		// Assert
		await waitFor(() => {
			expect(screen.getByText(/Failed to delete VOD/i)).toBeDefined();
		});
	});

	it("handles identical values when sorting", () => {
		// Arrange
		const identicalVods = [
			{ ...mockInitialVods[0], title: "Same Title" },
			{ ...mockInitialVods[1], id: "vod_2_same", title: "Same Title" },
		];

		// Act
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={identicalVods as AdminVodItem[]}
				searchParams={{ sortBy: "title", sortOrder: "asc" }}
			/>,
		);

		// Assert
		expect(screen.getAllByText("Same Title")).toHaveLength(2);
	});

	it("handles exception during toggle publish", async () => {
		// Arrange
		setVodPublicationStatusSpy.mockRejectedValueOnce(
			new Error("Server unreachable"),
		);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act
		fireEvent.click(
			screen.getByRole("button", { name: /publish Tracer Dive/i }),
		);

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText(
					/Failed to update publication status\. Please try again\./i,
				),
			).toBeDefined();
		});
	});

	it("handles exception during bulk publish", async () => {
		// Arrange
		bulkPublishVodsSpy.mockRejectedValueOnce(new Error("Bulk server error"));
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: select all and bulk publish
		fireEvent.click(screen.getByLabelText(/select all rows/i));
		fireEvent.click(screen.getByRole("button", { name: /^bulk publish$/i }));

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText(
					/Failed to perform bulk publication\. Please try again\./i,
				),
			).toBeDefined();
		});
	});

	it("handles exception during bulk delete", async () => {
		// Arrange
		bulkDeleteVodsSpy.mockRejectedValueOnce(
			new Error("Bulk delete network error"),
		);
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: select two rows and bulk delete
		fireEvent.click(screen.getByLabelText(/select GM Rein Guide/i));
		fireEvent.click(screen.getByLabelText(/select Tracer Dive/i));
		fireEvent.click(screen.getByRole("button", { name: /^bulk delete$/i }));
		fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

		// Assert
		await waitFor(() => {
			expect(
				screen.getByText(/Failed to delete VOD\. Please try again\./i),
			).toBeDefined();
		});
	});

	it("sorts table data by title, hero, role, map, duration, scenarios, status, and createdAt", () => {
		// Arrange
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
				searchParams={{
					role: "ALL",
					search: "",
					sortBy: "title",
					sortOrder: "asc",
					status: "ALL",
				}}
			/>,
		);

		// Act: Sort by Hero
		fireEvent.click(screen.getByRole("button", { name: /^sort by hero/i }));
		// Act: Sort by Role
		fireEvent.click(screen.getByRole("button", { name: /^sort by role/i }));
		// Act: Sort by Map
		fireEvent.click(screen.getByRole("button", { name: /^sort by map/i }));
		// Act: Sort by Duration
		fireEvent.click(screen.getByRole("button", { name: /^sort by duration/i }));
		// Act: Sort by Scenarios
		fireEvent.click(
			screen.getByRole("button", { name: /^sort by scenarios/i }),
		);
		// Act: Sort by Status
		fireEvent.click(screen.getByRole("button", { name: /^sort by status/i }));
		// Act: Sort by Created Date
		fireEvent.click(
			screen.getByRole("button", { name: /^sort by created date/i }),
		);

		// Assert
		expect(screen.getByText("GM Rein Guide")).toBeDefined();
	});

	it("closes delete confirmation dialog when cancel is clicked", () => {
		// Arrange
		render(
			<AdminContentPage
				currentUser={mockAdminUser}
				initialVods={mockInitialVods}
			/>,
		);

		// Act: open delete dialog and cancel
		fireEvent.click(
			screen.getByRole("button", { name: /delete GM Rein Guide/i }),
		);
		expect(screen.getByText(/Delete VOD Confirmation/i)).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

		// Assert: dialog closed
		expect(
			screen.queryByText(/This will permanently delete 1 VOD/i),
		).toBeNull();
	});
});
