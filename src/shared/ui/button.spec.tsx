import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button component", () => {
	it("renders children correctly", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole("button", { name: "Click me" })).toBeDefined();
	});

	it("applies variant classes correctly", () => {
		render(<Button variant="destructive">Delete</Button>);
		const button = screen.getByRole("button", { name: "Delete" });
		expect(button.className).toContain("bg-destructive");
	});

	it("renders as child slot when asChild is true", () => {
		render(
			<Button asChild>
				<a href="/test">Link Button</a>
			</Button>,
		);
		expect(screen.getByRole("link", { name: "Link Button" })).toBeDefined();
	});
});
