import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./home-page";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/lib/auth-client");

describe("HomePage component", () => {
	it("renders heading, description, and account control", () => {
		// Arrange & Act
		render(<HomePage />);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Watchpoint Interactive Engine" }),
		).toBeDefined();
		expect(
			screen.getByText(/overwatch 2 interactive vod decision training/i),
		).toBeDefined();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
	});

	it("renders empty database state when no VODs are passed", () => {
		// Arrange & Act
		render(<HomePage vods={[]} />);

		// Assert
		expect(
			screen.getByText(/no published training vods in database/i),
		).toBeDefined();
	});

	it("renders VOD items passed via props", () => {
		// Arrange
		const mockVods = [
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
		];

		// Act
		render(<HomePage vods={mockVods} />);

		// Assert
		expect(screen.getByText("Grandmaster Ana VOD")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Grandmaster")).toBeDefined();
		expect(screen.getByText(/5 scenarios/i)).toBeDefined();
	});

	it("opens the modal auth flow from the account control", () => {
		// Arrange
		render(<HomePage />);

		// Act
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		// Assert
		expect(screen.getByRole("dialog")).toBeDefined();
		expect(
			screen.getByRole("heading", { name: "Welcome back, player" }),
		).toBeDefined();
	});
});
