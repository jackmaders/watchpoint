import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/widgets/admin-vod-editor");

import { getRouteApi } from "@tanstack/react-router";
import { AdminVodEditorPage } from "@/widgets/admin-vod-editor";
import { AdminContentIdRouteComponent } from "../admin-content-id-route";

describe("AdminContentIdRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminVodEditorPage).mockReturnValue(
			<div data-testid="mock-admin-vod-editor">Editor</div>,
		);
	});

	it("renders AdminVodEditorPage with loaded vod, scenarios, and audit entries", () => {
		// Arrange
		const mockVod = { id: "vod_1", title: "Test VOD" } as never;
		const mockAudit = [{ id: "aud_1" }] as never;
		const mockScenarios = [{ id: "sc_1" }] as never;
		const routeApi = getRouteApi("/admin/content/$id");
		vi.mocked(routeApi.useLoaderData).mockReturnValue({
			auditEntries: mockAudit,
			scenarios: mockScenarios,
			vod: mockVod,
		});

		// Act
		render(<AdminContentIdRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-admin-vod-editor")).toBeDefined();
		expect(AdminVodEditorPage).toHaveBeenCalledWith(
			{
				auditEntries: mockAudit,
				initialScenarios: mockScenarios,
				initialVod: mockVod,
			},
			undefined,
		);
	});
});
