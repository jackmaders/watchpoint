import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../vods-page");

import { getRouteApi } from "@tanstack/react-router";
import { VodsPage } from "../vods-page";
import { VodsRouteComponent } from "../vods-route";

describe("VodsRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(VodsPage).mockReturnValue(
			<div data-testid="mock-vods-page">Vods Page</div>,
		);
	});

	it("renders VodsPage with loader data from route api", () => {
		// Arrange
		const mockLoaderData = {
			registrationEnabled: true,
			vods: [{ id: "vod_1" }],
		};
		const routeApi = getRouteApi("/vods/");
		vi.mocked(routeApi.useLoaderData).mockReturnValue(mockLoaderData);

		// Act
		render(<VodsRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-vods-page")).toBeDefined();
		expect(VodsPage).toHaveBeenCalledWith(
			{
				registrationEnabled: true,
				vods: mockLoaderData.vods,
			},
			undefined,
		);
	});
});
