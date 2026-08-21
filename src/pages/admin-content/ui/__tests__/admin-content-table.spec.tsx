import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminVodItem } from "@/shared/db";
import { AdminContentTable } from "../admin-content-table";
import { HeaderSelectionCell } from "../use-content-columns";

const mockVods: AdminVodItem[] = [
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
		title: "GM Rein Masterclass",
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
		scenarios: [],
		title: "Tracer Flank Guide",
		youtubeVideoId: "yt_tracer",
	},
];

describe("AdminContentTable", () => {
	it("renders all columns and vod data correctly", () => {
		// Arrange
		const onBulkDelete = vi.fn();
		const onBulkPublish = vi.fn();
		const onBulkUnpublish = vi.fn();
		const onDelete = vi.fn();
		const onSelectionChange = vi.fn();
		const onSortChange = vi.fn();
		const onTogglePublish = vi.fn();

		// Act
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={onBulkDelete}
				onBulkPublish={onBulkPublish}
				onBulkUnpublish={onBulkUnpublish}
				onDelete={onDelete}
				onSelectionChange={onSelectionChange}
				onSortChange={onSortChange}
				onTogglePublish={onTogglePublish}
				selectedIds={[]}
				sortBy="createdAt"
				sortOrder="desc"
				vods={mockVods}
			/>,
		);

		// Assert
		expect(screen.getByText("GM Rein Masterclass")).toBeDefined();
		expect(screen.getByText("Tracer Flank Guide")).toBeDefined();
		expect(screen.getByText("Reinhardt")).toBeDefined();
		expect(screen.getByText("Tracer")).toBeDefined();
		expect(screen.getByText("TANK")).toBeDefined();
		expect(screen.getByText("DAMAGE")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Oasis")).toBeDefined();
		expect(screen.getByText("10m 00s")).toBeDefined();
		expect(screen.getByText("15m 00s")).toBeDefined();
		expect(screen.getByText("2 Scenarios")).toBeDefined();
		expect(screen.getByText("0 Scenarios")).toBeDefined();
		expect(screen.getByText("Published")).toBeDefined();
		expect(screen.getByText("Draft")).toBeDefined();
	});

	it("handles empty vod list with empty state message", () => {
		// Arrange
		const onBulkDelete = vi.fn();
		const onBulkPublish = vi.fn();
		const onBulkUnpublish = vi.fn();
		const onDelete = vi.fn();
		const onSelectionChange = vi.fn();
		const onSortChange = vi.fn();
		const onTogglePublish = vi.fn();

		// Act
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={onBulkDelete}
				onBulkPublish={onBulkPublish}
				onBulkUnpublish={onBulkUnpublish}
				onDelete={onDelete}
				onSelectionChange={onSelectionChange}
				onSortChange={onSortChange}
				onTogglePublish={onTogglePublish}
				selectedIds={[]}
				vods={[]}
			/>,
		);

		// Assert
		expect(
			screen.getByText(/no content vods found matching criteria/i),
		).toBeDefined();
	});

	it("triggers sort change when column header is clicked", () => {
		// Arrange
		const onSortChange = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={vi.fn()}
				onSortChange={onSortChange}
				onTogglePublish={vi.fn()}
				selectedIds={[]}
				sortBy="createdAt"
				sortOrder="desc"
				vods={mockVods}
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /^sort by title/i }));

		// Assert
		expect(onSortChange).toHaveBeenCalledWith("title", "asc");
	});

	it("toggles sorting direction from asc to desc when same column is clicked", () => {
		// Arrange
		const onSortChange = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={vi.fn()}
				onSortChange={onSortChange}
				onTogglePublish={vi.fn()}
				selectedIds={[]}
				sortBy="title"
				sortOrder="asc"
				vods={mockVods}
			/>,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /^sort by title/i }));

		// Assert
		expect(onSortChange).toHaveBeenCalledWith("title", "desc");
	});

	it("handles individual row selection and select-all selection", () => {
		// Arrange
		const onSelectionChange = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={onSelectionChange}
				onSortChange={vi.fn()}
				onTogglePublish={vi.fn()}
				selectedIds={[]}
				vods={mockVods}
			/>,
		);

		// Act: select row 1
		const rowCheckbox = screen.getByLabelText(
			/select GM Rein Masterclass/i,
		) as HTMLInputElement;
		fireEvent.click(rowCheckbox);

		// Assert
		expect(onSelectionChange).toHaveBeenCalledWith(["vod_1"]);

		// Act: select all
		const selectAllCheckbox = screen.getByLabelText(
			/select all rows/i,
		) as HTMLInputElement;
		fireEvent.click(selectAllCheckbox);

		// Assert
		expect(onSelectionChange).toHaveBeenCalledWith(["vod_1", "vod_2"]);
	});

	it("deselects individual row when already selected", () => {
		// Arrange
		const onSelectionChange = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={onSelectionChange}
				onSortChange={vi.fn()}
				onTogglePublish={vi.fn()}
				selectedIds={["vod_1"]}
				vods={mockVods}
			/>,
		);

		// Act: toggle row 1 to deselect
		const rowCheckbox = screen.getByLabelText(
			/select GM Rein Masterclass/i,
		) as HTMLInputElement;
		fireEvent.click(rowCheckbox);

		// Assert
		expect(onSelectionChange).toHaveBeenCalledWith([]);
	});

	it("handles deselect all when all rows are already selected", () => {
		// Arrange
		const onSelectionChange = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={onSelectionChange}
				onSortChange={vi.fn()}
				onTogglePublish={vi.fn()}
				selectedIds={["vod_1", "vod_2"]}
				vods={mockVods}
			/>,
		);

		// Act: click select all to deselect
		const selectAllCheckbox = screen.getByLabelText(
			/select all rows/i,
		) as HTMLInputElement;
		fireEvent.click(selectAllCheckbox);

		// Assert
		expect(onSelectionChange).toHaveBeenCalledWith([]);
	});

	it("shows bulk action toolbar when rows are selected and triggers bulk actions", () => {
		// Arrange
		const onBulkDelete = vi.fn();
		const onBulkPublish = vi.fn();
		const onBulkUnpublish = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={onBulkDelete}
				onBulkPublish={onBulkPublish}
				onBulkUnpublish={onBulkUnpublish}
				onDelete={vi.fn()}
				onSelectionChange={vi.fn()}
				onSortChange={vi.fn()}
				onTogglePublish={vi.fn()}
				selectedIds={["vod_1", "vod_2"]}
				vods={mockVods}
			/>,
		);

		// Assert
		expect(screen.getByText("2 selected")).toBeDefined();

		// Act: trigger bulk publish
		fireEvent.click(screen.getByRole("button", { name: /^bulk publish$/i }));
		expect(onBulkPublish).toHaveBeenCalledWith(["vod_1", "vod_2"]);

		// Act: trigger bulk unpublish
		fireEvent.click(screen.getByRole("button", { name: /^bulk unpublish$/i }));
		expect(onBulkUnpublish).toHaveBeenCalledWith(["vod_1", "vod_2"]);

		// Act: trigger bulk delete
		fireEvent.click(screen.getByRole("button", { name: /^bulk delete$/i }));
		expect(onBulkDelete).toHaveBeenCalledWith(["vod_1", "vod_2"]);
	});

	it("triggers single row publish toggle and delete", () => {
		// Arrange
		const onTogglePublish = vi.fn();
		const onDelete = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={onDelete}
				onSelectionChange={vi.fn()}
				onSortChange={vi.fn()}
				onTogglePublish={onTogglePublish}
				selectedIds={[]}
				vods={mockVods}
			/>,
		);

		// Act: toggle publish for published item (unpublish)
		fireEvent.click(
			screen.getByRole("button", {
				name: /unpublish GM Rein Masterclass/i,
			}),
		);
		expect(onTogglePublish).toHaveBeenCalledWith(mockVods[0], false);

		// Act: toggle publish for draft item (publish)
		fireEvent.click(
			screen.getByRole("button", {
				name: /publish Tracer Flank Guide/i,
			}),
		);
		expect(onTogglePublish).toHaveBeenCalledWith(mockVods[1], true);

		// Act: delete row
		fireEvent.click(
			screen.getByRole("button", {
				name: /delete GM Rein Masterclass/i,
			}),
		);
		expect(onDelete).toHaveBeenCalledWith(mockVods[0]);
	});

	it("triggers sorting for hero, role, map, duration, scenarioCount, isPublished, and createdAt columns", () => {
		// Arrange
		const onSortChange = vi.fn();
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={vi.fn()}
				onSortChange={onSortChange}
				onTogglePublish={vi.fn()}
				selectedIds={[]}
				sortBy="createdAt"
				sortOrder="desc"
				vods={mockVods}
			/>,
		);

		// Act & Assert
		fireEvent.click(screen.getByRole("button", { name: /^sort by hero/i }));
		expect(onSortChange).toHaveBeenLastCalledWith("heroName", "asc");

		fireEvent.click(screen.getByRole("button", { name: /^sort by role/i }));
		expect(onSortChange).toHaveBeenLastCalledWith("role", "asc");

		fireEvent.click(screen.getByRole("button", { name: /^sort by map/i }));
		expect(onSortChange).toHaveBeenLastCalledWith("mapName", "asc");

		fireEvent.click(screen.getByRole("button", { name: /^sort by duration/i }));
		expect(onSortChange).toHaveBeenLastCalledWith("durationSeconds", "asc");

		fireEvent.click(
			screen.getByRole("button", { name: /^sort by scenarios/i }),
		);
		expect(onSortChange).toHaveBeenLastCalledWith("scenarioCount", "asc");

		fireEvent.click(screen.getByRole("button", { name: /^sort by status/i }));
		expect(onSortChange).toHaveBeenLastCalledWith("isPublished", "asc");

		fireEvent.click(
			screen.getByRole("button", { name: /^sort by created date/i }),
		);
		expect(onSortChange).toHaveBeenLastCalledWith("createdAt", "asc");
	});

	it("renders SUPPORT role badge and handles indeterminate checkbox when partially selected", () => {
		// Arrange
		const supportVod: AdminVodItem = {
			createdAt: new Date("2026-01-03T12:00:00Z"),
			durationSeconds: 720,
			heroName: "Mercy",
			id: "vod_3",
			isPublished: true,
			mapName: "Colosseo",
			rankTier: "Master",
			role: "SUPPORT",
			scenarios: [],
			title: "Mercy Movement",
			youtubeVideoId: "yt_mercy",
		};

		// Act
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={vi.fn()}
				onSortChange={vi.fn()}
				onTogglePublish={vi.fn()}
				selectedIds={["vod_3"]}
				sortBy="title"
				sortOrder="asc"
				vods={[supportVod, mockVods[0] as AdminVodItem]}
			/>,
		);

		// Assert
		expect(screen.getByText("SUPPORT")).toBeDefined();
		const selectAll = screen.getByLabelText(
			/select all rows/i,
		) as HTMLInputElement;
		expect(selectAll.indeterminate).toBe(true);
	});

	it("renders 0 Scenarios when scenarios field is undefined", () => {
		// Arrange
		const vodWithoutScenarios = {
			...mockVods[0],
			id: "vod_no_scenarios",
			scenarios: undefined as unknown as { id: string }[],
			title: "No Scenarios VOD",
		};

		// Act
		render(
			<AdminContentTable
				isOperating={false}
				onBulkDelete={vi.fn()}
				onBulkPublish={vi.fn()}
				onBulkUnpublish={vi.fn()}
				onDelete={vi.fn()}
				onSelectionChange={vi.fn()}
				onSortChange={vi.fn()}
				onTogglePublish={vi.fn()}
				selectedIds={[]}
				vods={[vodWithoutScenarios as AdminVodItem]}
			/>,
		);

		// Assert
		expect(screen.getByText("0 Scenarios")).toBeDefined();
	});

	it("renders and unmounts HeaderSelectionCell", () => {
		// Arrange & Act
		const { unmount } = render(
			<HeaderSelectionCell
				allSelected={false}
				onSelectAll={vi.fn()}
				someSelected={true}
			/>,
		);

		// Assert
		const checkbox = screen.getByLabelText(
			/select all rows/i,
		) as HTMLInputElement;
		expect(checkbox.indeterminate).toBe(true);

		// Act: Unmount
		unmount();

		// Assert
		expect(screen.queryByLabelText(/select all rows/i)).toBeNull();
	});
});
