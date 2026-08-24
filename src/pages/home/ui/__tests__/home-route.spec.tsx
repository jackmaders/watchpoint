import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../home-page");

import { getRouteApi } from "@tanstack/react-router";
import { HomePage } from "../home-page";
import { HomeRouteComponent } from "../home-route";

describe("HomeRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(HomePage).mockReturnValue(
			<div data-testid="mock-home-page">Home Page</div>,
		);
	});

	it("renders HomePage with loader data from route api", () => {
		// Arrange
		const mockLoaderData = {
			registrationEnabled: true,
			vods: [{ id: "vod_1" }],
		};
		const routeApi = getRouteApi("/");
		vi.mocked(routeApi.useLoaderData).mockReturnValue(mockLoaderData);

		// Act
		render(<HomeRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-home-page")).toBeDefined();
		expect(HomePage).toHaveBeenCalledWith(
			{
				registrationEnabled: true,
				vods: mockLoaderData.vods,
			},
			undefined,
		);
	});
});
