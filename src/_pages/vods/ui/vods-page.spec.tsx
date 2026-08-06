import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublishedVodItem } from "@/shared/db";
import { formatDuration, VodsPage } from "./vods-page";

describe("VodsPage catalog component", () => {
	it("renders empty state message when no VODs are provided", () => {
		render(<VodsPage vods={[]} />);
		expect(
			screen.getByText(/no training vods currently available/i),
		).toBeDefined();
	});

	it("renders VOD cards with map name, rank tier, duration, and Start Training action", () => {
		const mockVods: PublishedVodItem[] = [
			{
				_count: { scenarios: 5 },
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 1080,
				id: "vod_1",
				isPublished: true,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				title: "GM Ana VOD — King's Row Defense & Attack",
				youtubeVideoId: "dQw4w9WgXcQ",
			},
		];

		render(<VodsPage vods={mockVods} />);

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

	it("formats duration correctly when under 1 minute or with remaining seconds", () => {
		const mockVods: PublishedVodItem[] = [
			{
				_count: { scenarios: 2 },
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 45,
				id: "vod_short",
				isPublished: true,
				mapName: "Eichenwalde",
				rankTier: "Master",
				title: "Short VOD",
				youtubeVideoId: "abc12345",
			},
		];

		render(<VodsPage vods={mockVods} />);

		expect(screen.getByText(/0m 45s/)).toBeDefined();
	});

	it("renders fallback scenario count 0 when _count is undefined", () => {
		const mockVods = [
			{
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 60,
				id: "vod_no_count",
				isPublished: true,
				mapName: "Hanamura",
				rankTier: "Diamond",
				title: "No Count VOD",
				youtubeVideoId: "12345678",
			},
		] as unknown as PublishedVodItem[];

		render(<VodsPage vods={mockVods} />);

		expect(screen.getByText(/0 Scenarios/)).toBeDefined();
	});

	describe("formatDuration helper", () => {
		it("handles negative, fractional, and NaN duration inputs safely", () => {
			expect(formatDuration(-10)).toBe("0m 00s");
			expect(formatDuration(NaN)).toBe("0m 00s");
			expect(formatDuration(125.7)).toBe("2m 05s");
		});
	});
});
