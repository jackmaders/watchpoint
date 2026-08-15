import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVodById } from "@/shared/db";
import { VodDetailPage } from "../vod-detail-page";

vi.mock("next/server");
vi.mock("@/shared/db");

describe("VodDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockVod = {
		createdAt: new Date("2026-08-06T10:00:00Z"),
		durationSeconds: 1080,
		id: "vod_1",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		scenarios: [
			{
				id: "sc_1",
				moduleType: "STRATEGY" as const,
				promptText: "Pre-fight strategy",
				timestampSeconds: 30,
			},
			{
				id: "sc_2",
				moduleType: "TACTICS" as const,
				promptText: "Mid-fight tactics",
				timestampSeconds: 60,
			},
			{
				id: "sc_3",
				moduleType: "ULTIMATE" as const,
				promptText: "Ult tracking",
				timestampSeconds: 90,
			},
			{
				id: "sc_4",
				moduleType: "COOLDOWN" as const,
				promptText: "Cooldown tracking",
				timestampSeconds: 120,
			},
			{
				id: "sc_5",
				moduleType: "SPATIAL" as const,
				promptText: "Spatial awareness",
				timestampSeconds: 150,
			},
		],
		title: "Grandmaster Ana VOD - King's Row",
		youtubeVideoId: "dQw4w9WgXcQ",
	};

	it("renders VOD detail header with map name, rank tier, hero badge, duration, and title", async () => {
		// Arrange
		vi.mocked(getVodById).mockResolvedValueOnce(
			mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
		);

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
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
		vi.mocked(getVodById).mockResolvedValueOnce(
			vodWithoutHero as unknown as Awaited<ReturnType<typeof getVodById>>,
		);

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
		});
		render(ui);

		// Assert
		expect(screen.queryByText(/Hero:/)).toBeNull();
	});

	it("renders module filter controls for all 5 modules (STRATEGY, TACTICS, ULTIMATE, COOLDOWN, SPATIAL)", async () => {
		// Arrange
		vi.mocked(getVodById).mockResolvedValueOnce(
			mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
		);

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
		});
		render(ui);

		// Assert
		expect(screen.getByTestId("module-filter-STRATEGY")).toBeDefined();
		expect(screen.getByTestId("module-filter-TACTICS")).toBeDefined();
		expect(screen.getByTestId("module-filter-ULTIMATE")).toBeDefined();
		expect(screen.getByTestId("module-filter-COOLDOWN")).toBeDefined();
		expect(screen.getByTestId("module-filter-SPATIAL")).toBeDefined();
	});

	it("allows toggling module filters off and on and updates scenario count and start link href", async () => {
		// Arrange
		vi.mocked(getVodById).mockResolvedValueOnce(
			mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
		);

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
		});
		render(ui);

		const strategyBtn = screen.getByTestId("module-filter-STRATEGY");
		const startLink = screen.getByRole("link", { name: /start training/i });

		// Assert
		expect(startLink.getAttribute("href")).toContain(
			"modules=STRATEGY%2CTACTICS%2CULTIMATE%2CCOOLDOWN%2CSPATIAL",
		);

		// Act - Toggle STRATEGY off
		await act(async () => {
			fireEvent.click(strategyBtn);
		});

		// Assert
		expect(startLink.getAttribute("href")).not.toContain("STRATEGY");

		// Act - Toggle STRATEGY back on
		await act(async () => {
			fireEvent.click(strategyBtn);
		});

		// Assert
		expect(startLink.getAttribute("href")).toContain("STRATEGY");
	});

	it("handles deselecting all modules showing warning and disabling start link", async () => {
		// Arrange
		vi.mocked(getVodById).mockResolvedValueOnce(
			mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
		);

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "vod_1" }),
		});
		render(ui);

		const modules = [
			"STRATEGY",
			"TACTICS",
			"ULTIMATE",
			"COOLDOWN",
			"SPATIAL",
		] as const;

		// Toggle first 4 off so 1 module remains
		for (let i = 0; i < 4; i++) {
			await act(async () => {
				fireEvent.click(screen.getByTestId(`module-filter-${modules[i]}`));
			});
		}

		// Assert
		expect(screen.getByText("1 module selected")).toBeDefined();

		// Act - Toggle remaining 5th module off
		await act(async () => {
			fireEvent.click(screen.getByTestId("module-filter-SPATIAL"));
		});

		// Assert
		expect(
			screen.getByText(/select at least one module to start training/i),
		).toBeDefined();

		const startLink = screen.getByRole("link", { name: /start training/i });
		expect(startLink.getAttribute("href")).toBe("#");
	});

	it("renders VOD Not Found UI when vod is not found", async () => {
		// Arrange
		vi.mocked(getVodById).mockResolvedValueOnce(
			undefined as unknown as Awaited<ReturnType<typeof getVodById>>,
		);

		// Act
		const ui = await VodDetailPage({
			params: Promise.resolve({ id: "non_existent" }),
		});
		render(ui);

		// Assert
		expect(screen.getByText("VOD Not Found")).toBeDefined();
	});
});
