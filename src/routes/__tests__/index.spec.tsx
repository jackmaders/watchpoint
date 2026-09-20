import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Route } from "../index";

const EDIT_TEXT_PATTERN = /edit/i;

describe("Home route component", () => {
	// biome-ignore lint/style/noNonNullAssertion: required for testing here
	const HomeComponent = Route.options.component!;

	test("renders the main heading", () => {
		render(<HomeComponent />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Welcome to TanStack Start");
	});

	test("renders the instruction text and code element", () => {
		render(<HomeComponent />);

		expect(screen.getByText(EDIT_TEXT_PATTERN)).toBeInTheDocument();
		expect(screen.getByText("src/routes/index.tsx")).toBeInTheDocument();
	});
});
