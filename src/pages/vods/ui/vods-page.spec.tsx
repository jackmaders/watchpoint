import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VodsPage } from "./vods-page";

describe("VodsPage catalog component", () => {
	it("renders empty state message when no VODs are provided", () => {
		render(<VodsPage vods={[]} />);
		expect(
			screen.getByText(/no training vods currently available/i),
		).toBeDefined();
	});

	it("renders VOD cards with map name, rank tier, duration, and Start Training action", () => {
		const mockVods = [
			{
				_count: { scenarios: 5 },
				durationSeconds: 1080,
				id: "vod_1",
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
		const mockVods = [
			{
				_count: { scenarios: 2 },
				durationSeconds: 45,
				id: "vod_short",
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
				durationSeconds: 60,
				id: "vod_no_count",
				mapName: "Hanamura",
				rankTier: "Diamond",
				title: "No Count VOD",
				youtubeVideoId: "12345678",
			},
		];

		render(<VodsPage vods={mockVods} />);

		expect(screen.getByText(/0 Scenarios/)).toBeDefined();
	});
});
