import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../vods-id-page");

import { getRouteApi } from "@tanstack/react-router";
import { VodsIdPage } from "../vods-id-page";
import { VodsIdRouteComponent } from "../vods-id-route";

describe("VodsIdRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(VodsIdPage).mockReturnValue(
			<div data-testid="mock-vods-id-page">VOD ID Page</div>,
		);
	});

	it("renders VodsIdPage with data from routeApi", () => {
		// Arrange
		const mockVod = { id: "vod_1", title: "Test VOD" } as never;
		const routeApi = getRouteApi("/vods/$id");
		vi.mocked(routeApi.useLoaderData).mockReturnValue({
			vod: mockVod,
		});

		// Act
		render(<VodsIdRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-vods-id-page")).toBeDefined();
		expect(VodsIdPage).toHaveBeenCalledWith({ vod: mockVod }, undefined);
	});
});
