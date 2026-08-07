import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPublishedVods } from "@/shared/db";
import { formatDuration, VodsPage } from "./vods-page";

vi.mock("next/server");
vi.mock("@/shared/db");

describe("VodsPage catalog component", () => {
	it("renders empty state message when no VODs are provided", async () => {
		render(await VodsPage());

		expect(
			screen.getByText(/no training vods currently available/i),
		).toBeDefined();
	});

	it("renders VOD cards with map name, rank tier, duration, and Start Training action", async () => {
		vi.mocked(getPublishedVods).mockResolvedValueOnce([
			{
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 1080,
				id: "vod_1",
				isPublished: true,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				scenarios: [
					{ id: "1" },
					{ id: "2" },
					{ id: "3" },
					{ id: "4" },
					{ id: "5" },
				],
				title: "GM Ana VOD — King's Row Defense & Attack",
				youtubeVideoId: "dQw4w9WgXcQ",
			},
		]);
		render(await VodsPage());

		expect(
			screen.getByText("GM Ana VOD — King's Row Defense & Attack"),
		).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Grandmaster")).toBeDefined();
		expect(screen.getByText(/18m 00s/)).toBeDefined();
		expect(screen.getByText(/5 Scenarios/)).toBeDefined();

		const startButton = screen.getByRole("link", { name: /start training/i });
		expect(startButton).toBeDefined();
		expect(startButton.getAttribute("href")).toBe("/vods/vod_1");
	});

	it("formats duration correctly when under 1 minute or with remaining seconds", async () => {
		vi.mocked(getPublishedVods).mockResolvedValueOnce([
			{
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 45,
				id: "vod_short",
				isPublished: true,
				mapName: "Eichenwalde",
				rankTier: "Master",
				scenarios: [{ id: "1" }, { id: "2" }],
				title: "Short VOD",
				youtubeVideoId: "abc12345",
			},
		]);
		render(await VodsPage());

		expect(screen.getByText(/0m 45s/)).toBeDefined();
	});

	describe("formatDuration helper", () => {
		it("handles negative, fractional, and NaN duration inputs safely", () => {
			expect(formatDuration(-10)).toBe("0m 00s");
			expect(formatDuration(NaN)).toBe("0m 00s");
			expect(formatDuration(125.7)).toBe("2m 05s");
		});
	});
});
