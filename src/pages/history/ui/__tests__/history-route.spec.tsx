import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../history-page");

import { getRouteApi } from "@tanstack/react-router";
import { HistoryPage } from "../history-page";
import { HistoryRouteComponent } from "../history-route";

describe("HistoryRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(HistoryPage).mockReturnValue(
			<div data-testid="mock-history-page">History Page</div>,
		);
	});

	it("renders HistoryPage and wires filter navigation callback", () => {
		// Arrange
		const mockNavigate = vi.fn();
		const routeApi = getRouteApi("/history/");
		vi.mocked(routeApi.useSearch).mockReturnValue({ page: 1 });
		vi.mocked(routeApi.useLoaderData).mockReturnValue({
			data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 },
			error: null,
			registrationEnabled: true,
			vods: [],
		});
		vi.mocked(routeApi.useNavigate).mockReturnValue(mockNavigate);

		// Act
		render(<HistoryRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-history-page")).toBeDefined();
		expect(HistoryPage).toHaveBeenCalledWith(
			expect.objectContaining({
				registrationEnabled: true,
				searchParams: { page: 1 },
			}),
			undefined,
		);

		// Act: trigger onFilterChange
		const lastCallProps = vi.mocked(HistoryPage).mock.calls[0]?.[0];
		lastCallProps?.onFilterChange?.({ page: 2 });

		// Assert
		expect(mockNavigate).toHaveBeenCalled();
		const navigateArg = mockNavigate.mock.calls[0]?.[0];
		if (typeof navigateArg?.search === "function") {
			const merged = navigateArg.search({ previous: true });
			expect(merged).toEqual({ page: 2, previous: true });
		}
	});
});
