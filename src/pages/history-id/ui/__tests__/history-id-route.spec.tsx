import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../history-id-page");

import { getRouteApi } from "@tanstack/react-router";
import { HistoryIdPage } from "../history-id-page";
import { HistoryIdRouteComponent } from "../history-id-route";

describe("HistoryIdRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(HistoryIdPage).mockReturnValue(
			<div data-testid="mock-history-id-page">History ID Page</div>,
		);
	});

	it("renders HistoryIdPage with data from routeApi loader", () => {
		// Arrange
		const mockPlaythrough = { id: "pt_1" } as never;
		const routeApi = getRouteApi("/history/$id");
		vi.mocked(routeApi.useLoaderData).mockReturnValue({
			error: null,
			playthrough: mockPlaythrough,
		});

		// Act
		render(<HistoryIdRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-history-id-page")).toBeDefined();
		expect(HistoryIdPage).toHaveBeenCalledWith(
			{
				error: null,
				playthrough: mockPlaythrough,
			},
			undefined,
		);
	});
});
