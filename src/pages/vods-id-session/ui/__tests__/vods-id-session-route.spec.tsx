import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../session-player-route-view");

import { getRouteApi } from "@tanstack/react-router";
import { SessionPlayerRouteView } from "../session-player-route-view";
import { VodsIdSessionRouteComponent } from "../vods-id-session-route";

describe("VodsIdSessionRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(SessionPlayerRouteView).mockReturnValue(
			<div data-testid="mock-session-player-route-view">Session View</div>,
		);
	});

	it("renders SessionPlayerRouteView with data from route api", () => {
		// Arrange
		const mockNavigate = vi.fn();
		const routeApi = getRouteApi("/vods/$id/session");
		vi.mocked(routeApi.useParams).mockReturnValue({ id: "vod_123" });
		vi.mocked(routeApi.useLoaderData).mockReturnValue({
			playthroughId: "pt_1",
			scenarioSnapshotIds: ["s1"],
			vod: { id: "vod_123" },
		});
		vi.mocked(routeApi.useSearch).mockReturnValue({ modules: "AIM" });
		vi.mocked(routeApi.useNavigate).mockReturnValue(mockNavigate);

		// Act
		render(<VodsIdSessionRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-session-player-route-view")).toBeDefined();
		expect(SessionPlayerRouteView).toHaveBeenCalledWith(
			expect.objectContaining({
				playthroughId: "pt_1",
				scenarioSnapshotIds: ["s1"],
				search: { modules: "AIM" },
				vod: { id: "vod_123" },
				vodId: "vod_123",
			}),
			undefined,
		);

		// Act: trigger onNavigateSearch
		const lastCallProps = vi.mocked(SessionPlayerRouteView).mock.calls[0]?.[0];
		lastCallProps?.onNavigateSearch((prev) => ({ ...prev, next: true }));

		// Assert
		expect(mockNavigate).toHaveBeenCalled();
	});
});
