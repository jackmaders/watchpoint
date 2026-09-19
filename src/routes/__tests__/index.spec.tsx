import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "../index";

describe("Home route component", () => {
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
