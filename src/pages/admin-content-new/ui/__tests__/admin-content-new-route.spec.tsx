import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/admin-vod-editor");

import { AdminVodEditorPage } from "@/widgets/admin-vod-editor";
import { AdminContentNewRouteComponent } from "../admin-content-new-route";

describe("AdminContentNewRouteComponent", () => {
	it("renders AdminVodEditorPage with isCreate=true", () => {
		// Arrange
		vi.mocked(AdminVodEditorPage).mockReturnValue(
			<div data-testid="mock-admin-vod-editor">Editor</div>,
		);

		// Act
		render(<AdminContentNewRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-admin-vod-editor")).toBeDefined();
		expect(AdminVodEditorPage).toHaveBeenCalledWith(
			{ isCreate: true },
			undefined,
		);
	});
});
