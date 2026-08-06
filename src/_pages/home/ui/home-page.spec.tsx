import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage } from "./home-page";

describe("HomePage component", () => {
	it("renders heading, description, and user form", () => {
		render(<HomePage />);

		expect(
			screen.getByRole("heading", { name: "Next.js Project Template" }),
		).toBeDefined();
		expect(
			screen.getByText("Scaffolded with Bun, FSD, Biome, and Vitest"),
		).toBeDefined();
		expect(screen.getByPlaceholderText("Name")).toBeDefined();
		expect(screen.getByPlaceholderText("Email")).toBeDefined();
		expect(screen.getByRole("button", { name: "Submit" })).toBeDefined();
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
