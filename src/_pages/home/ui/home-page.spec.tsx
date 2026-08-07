import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPublishedVods } from "@/shared/db";
import { HomePage } from "./home-page";

vi.mock("next/server");
vi.mock("@/shared/db");

describe("HomePage component", () => {
	it("renders heading, description, and user form", async () => {
		render(await HomePage());

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

	it("renders empty database state when no VODs are passed", async () => {
		render(await HomePage());

		expect(
			screen.getByText(/no published training vods in database/i),
		).toBeDefined();
	});

	it("renders VOD items fetched from database", async () => {
		vi.mocked(getPublishedVods).mockResolvedValueOnce([
			{
				createdAt: new Date(),
				durationSeconds: 100,
				id: "1",
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
				title: "Grandmaster Ana VOD",
				youtubeVideoId: "abcde",
			},
		]);

		render(await HomePage());

		expect(screen.getByText("Grandmaster Ana VOD")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Grandmaster")).toBeDefined();
		expect(screen.getByText(/5 scenarios/i)).toBeDefined();
	});

	it("handles form submission cleanly", async () => {
		render(await HomePage());

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
