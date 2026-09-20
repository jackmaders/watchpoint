import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Route } from "../index";

vi.mock("@tanstack/react-query");
vi.mock("@tanstack/react-router");
vi.mock("@/db/db.server");

describe("Home route component", () => {
	// biome-ignore lint/style/noNonNullAssertion: required for testing here
	const HomeComponent = Route.options.component!;

	it("renders the main heading", () => {
		render(<HomeComponent />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Welcome to TanStack Start");
	});

	it("renders the instruction text and code element", () => {
		render(<HomeComponent />);

		expect(screen.getByText(/edit/i)).toBeInTheDocument();
		expect(screen.getByText("src/routes/index.tsx")).toBeInTheDocument();
	});
});
