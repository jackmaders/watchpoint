import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");

import { AccessDeniedPage } from "../access-denied-page";

describe("AccessDeniedPage", () => {
	it("renders access denied message and return link", () => {
		// Act
		render(<AccessDeniedPage />);

		// Assert
		expect(screen.getByText("403 - Access Denied")).toBeDefined();
		expect(
			screen.getByText(
				"Administrator authorization is required to access this area. Your current account does not have administrative privileges.",
			),
		).toBeDefined();
		expect(screen.getByText("Return Home")).toBeDefined();
	});
});
