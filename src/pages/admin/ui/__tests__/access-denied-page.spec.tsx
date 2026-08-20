import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccessDeniedPage } from "../access-denied-page";

vi.mock("@tanstack/react-router");

describe("AccessDeniedPage", () => {
	it("renders 403 heading, message, and return home link", () => {
		// Arrange & Act
		render(<AccessDeniedPage />);

		// Assert
		expect(
			screen.getByRole("heading", { name: "403 - Access Denied" }),
		).toBeDefined();
		expect(
			screen.getByText(
				/administrator authorization is required to access this area/i,
			),
		).toBeDefined();
		expect(screen.getByRole("link", { name: /return home/i })).toBeDefined();
	});
});
