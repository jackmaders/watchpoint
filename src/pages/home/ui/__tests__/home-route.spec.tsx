import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query");
vi.mock("../home-page");

import { useSuspenseQuery } from "@tanstack/react-query";
import { HomePage } from "../home-page";
import { HomeRouteComponent } from "../home-route";

describe("HomeRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(HomePage).mockReturnValue(
			<div data-testid="mock-home-page">Home Page</div>,
		);
	});

	it("renders HomePage with query data from useSuspenseQuery", () => {
		// Arrange
		const mockQueryData = {
			registrationEnabled: true,
			vods: [{ id: "vod_1" }],
		};
		vi.mocked(useSuspenseQuery).mockReturnValue({
			data: mockQueryData,
		} as never);

		// Act
		render(<HomeRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-home-page")).toBeDefined();
		expect(HomePage).toHaveBeenCalledWith(
			{
				registrationEnabled: true,
				vods: mockQueryData.vods,
			},
			undefined,
		);
	});
});
