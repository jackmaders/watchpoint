import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionManifest } from "@/shared/db";
import { VodDetailPage } from "../vod-detail-page";

vi.mock("@tanstack/react-router");

describe("VodDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockVod: SessionManifest = {
		createdAt: new Date("2026-08-06T10:00:00Z"),
		durationSeconds: 1080,
		id: "vod_1",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		scenarios: [
			{
				explanationText: "Strategy explanation",
				id: "sc_1",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "Pre-fight strategy",
				timeLimitSeconds: null,
				timestampSeconds: 30,
				vodId: "vod_1",
			},
			{
				explanationText: "Tactics explanation",
				id: "sc_2",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "TACTICS",
				promptText: "Mid-fight tactics",
				timeLimitSeconds: null,
				timestampSeconds: 60,
				vodId: "vod_1",
			},
			{
				explanationText: "Ult explanation",
				id: "sc_3",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "ULTIMATE",
				promptText: "Ult tracking",
				timeLimitSeconds: null,
				timestampSeconds: 90,
				vodId: "vod_1",
			},
			{
				explanationText: "Cooldown explanation",
				id: "sc_4",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "COOLDOWN",
				promptText: "Cooldown tracking",
				timeLimitSeconds: null,
				timestampSeconds: 120,
				vodId: "vod_1",
			},
			{
				explanationText: "Spatial explanation",
				id: "sc_5",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "SPATIAL",
				promptText: "Spatial awareness",
				timeLimitSeconds: null,
				timestampSeconds: 150,
				vodId: "vod_1",
			},
		],
		title: "Grandmaster Ana VOD - King's Row",
		youtubeVideoId: "dQw4w9WgXcQ",
	};

	it("renders VOD detail header with map name, rank tier, hero badge, duration, and title", async () => {
		// Arrange & Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: mockVod,
		});
		render(ui);

		// Assert
		expect(screen.getByText("Grandmaster Ana VOD - King's Row")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Grandmaster")).toBeDefined();
		expect(screen.getByText("Hero: Ana")).toBeDefined();
		expect(screen.getByText("Duration: 18m 00s")).toBeDefined();
		expect(screen.getByText("Total Scenarios: 5")).toBeDefined();
	});

	it("renders without hero badge when title has no matching hero", async () => {
		// Arrange
		const vodWithoutHero = {
			...mockVod,
			title: "Overwatch Ranked Match",
		};

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: vodWithoutHero,
		});
		render(ui);

		// Assert
		expect(screen.queryByText(/Hero:/)).toBeNull();
	});

	it("renders module filter controls for all 5 modules (STRATEGY, TACTICS, ULTIMATE, COOLDOWN, SPATIAL)", async () => {
		// Arrange & Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: mockVod,
		});
		render(ui);

		// Assert
		expect(screen.getByTestId("module-filter-STRATEGY")).toBeDefined();
		expect(screen.getByTestId("module-filter-TACTICS")).toBeDefined();
		expect(screen.getByTestId("module-filter-ULTIMATE")).toBeDefined();
		expect(screen.getByTestId("module-filter-COOLDOWN")).toBeDefined();
		expect(screen.getByTestId("module-filter-SPATIAL")).toBeDefined();
	});

	it("updates session launcher href when a module filter is toggled off", async () => {
		// Arrange
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: mockVod,
		});
		render(ui);
		const strategyBtn = screen.getByTestId("module-filter-STRATEGY");

		// Act
		await act(async () => {
			fireEvent.click(strategyBtn);
		});

		// Assert
		const startLink = screen.getByRole("link", { name: /start training/i });
		expect(startLink.getAttribute("href")).not.toContain("STRATEGY");
	});

	it("re-enables a module filter when toggled back on", async () => {
		// Arrange
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: mockVod,
		});
		render(ui);
		const strategyBtn = screen.getByTestId("module-filter-STRATEGY");

		// Act
		await act(async () => {
			fireEvent.click(strategyBtn);
		});
		await act(async () => {
			fireEvent.click(strategyBtn);
		});

		// Assert
		const startLink = screen.getByRole("link", { name: /start training/i });
		expect(startLink.getAttribute("href")).toContain("STRATEGY");
	});

	it("displays '1 module selected' when exactly 1 module remains selected", async () => {
		// Arrange
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: mockVod,
		});
		render(ui);
		const modulesToDisable = [
			"STRATEGY",
			"TACTICS",
			"ULTIMATE",
			"COOLDOWN",
		] as const;

		// Act
		for (const mod of modulesToDisable) {
			await act(async () => {
				fireEvent.click(screen.getByTestId(`module-filter-${mod}`));
			});
		}

		// Assert
		expect(screen.getByText("1 module selected")).toBeDefined();
	});

	it("handles deselecting all modules by showing warning and disabling start link", async () => {
		// Arrange
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
			vod: mockVod,
		});
		render(ui);
		const deselectAllBtn = screen.getByRole("button", {
			name: /^deselect all$/i,
		});

		// Act
		await act(async () => {
			fireEvent.click(deselectAllBtn);
		});

		// Assert
		expect(
			screen.getByText(/select at least one module to start training/i),
		).toBeDefined();
		const startLink = screen.getByRole("link", { name: /start training/i });
		expect(startLink.getAttribute("href")).toBe("#");
	});

	it("renders VOD Not Found UI when vod is not found", async () => {
		// Arrange & Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "non_existent" }),
			vod: null,
		});
		render(ui);

		// Assert
		expect(screen.getByText("VOD Not Found")).toBeDefined();
	});

	it("renders directly with passed vod prop", async () => {
		// Arrange & Act
		const ui = await VodDetailPage({
			params: { id: "vod_1" },
			vod: mockVod,
		});
		render(ui);

		// Assert
		expect(screen.getByText("Grandmaster Ana VOD - King's Row")).toBeDefined();
	});
});
