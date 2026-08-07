import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublishedVodItem } from "@/shared/db";
import { HomePage } from "./home-page";

describe("HomePage component", () => {
	it("renders heading, description, and user form", () => {
		render(<HomePage />);

		expect(
			screen.getByRole("heading", { name: "Watchpoint Interactive Engine" }),
		).toBeDefined();
		expect(
			screen.getByText(/overwatch 2 interactive vod decision training/i),
		).toBeDefined();
		expect(screen.getByPlaceholderText("Name")).toBeDefined();
		expect(screen.getByPlaceholderText("Email")).toBeDefined();
		expect(screen.getByRole("button", { name: "Submit" })).toBeDefined();
	});

	it("renders empty database state when no VODs are passed", () => {
		render(<HomePage vods={[]} />);

		expect(
			screen.getByText(/no published training vods in database/i),
		).toBeDefined();
	});

	it("renders VOD items fetched from database", () => {
		const mockVods: PublishedVodItem[] = [
			{
				_count: { scenarios: 5 },
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 1080,
				id: "vod_1",
				isPublished: true,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				title: "Grandmaster Ana VOD",
				youtubeVideoId: "dQw4w9WgXcQ",
			},
		];

		render(<HomePage vods={mockVods} />);

		expect(screen.getByText("Grandmaster Ana VOD")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Grandmaster")).toBeDefined();
		expect(screen.getByText(/5 scenarios/i)).toBeDefined();
	});

	it("renders fallback 0 scenarios when VOD _count is undefined", () => {
		const mockVods = [
			{
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 600,
				id: "vod_no_count",
				isPublished: true,
				mapName: "Eichenwalde",
				rankTier: "Master",
				title: "No Count VOD",
				youtubeVideoId: "abc12345",
			},
		] as unknown as PublishedVodItem[];

		render(<HomePage vods={mockVods} />);

		expect(screen.getByText(/0 scenarios/i)).toBeDefined();
	});

	it("handles form submission cleanly", async () => {
		render(<HomePage />);

		const nameInput = screen.getByPlaceholderText("Name");
		const emailInput = screen.getByPlaceholderText("Email");
		const submitButton = screen.getByRole("button", { name: "Submit" });

		await act(async () => {
			fireEvent.change(nameInput, { target: { value: "Alice" } });
			fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
			fireEvent.click(submitButton);
		});

		expect(nameInput).toBeDefined();
	});
});
