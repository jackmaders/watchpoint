import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../session-player-media-recovery-prototype");
vi.mock("../session-player-page");

import { SessionPlayerMediaRecoveryPrototype } from "../session-player-media-recovery-prototype";
import { SessionPlayerPage } from "../session-player-page";
import { SessionPlayerRouteView } from "../session-player-route-view";

describe("SessionPlayerRouteView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(SessionPlayerPage).mockReturnValue(
			<div data-testid="mock-session-player-page">Session Player Page</div>,
		);
		vi.mocked(SessionPlayerMediaRecoveryPrototype).mockReturnValue(
			<div data-testid="mock-media-prototype">Media Prototype</div>,
		);
	});

	it("renders SessionPlayerPage by default", () => {
		// Arrange
		const mockNavigate = vi.fn();
		const mockVod = { id: "vod_1" } as never;

		// Act
		render(
			<SessionPlayerRouteView
				onNavigateSearch={mockNavigate}
				playthroughId="pt_1"
				scenarioSnapshotIds={["s1"]}
				search={{}}
				vod={mockVod}
				vodId="vod_1"
			/>,
		);

		// Assert
		expect(screen.getByTestId("mock-session-player-page")).toBeDefined();
		expect(SessionPlayerPage).toHaveBeenCalledWith(
			{
				params: { id: "vod_1" },
				playthroughId: "pt_1",
				scenarioSnapshotIds: ["s1"],
				searchParams: {
					modules: undefined,
					playthroughId: "pt_1",
				},
				vod: mockVod,
			},
			undefined,
		);
	});

	it("renders MediaRecoveryPrototype in DEV mode when prototype param is set", () => {
		// Arrange
		const mockNavigate = vi.fn();

		// Act
		render(
			<SessionPlayerRouteView
				onNavigateSearch={mockNavigate}
				playthroughId={null}
				scenarioSnapshotIds={[]}
				search={{
					prototype: "media-recovery",
					variant: "B",
				}}
				vod={null}
				vodId="vod_1"
			/>,
		);

		// Assert
		expect(screen.getByTestId("mock-media-prototype")).toBeDefined();
		expect(SessionPlayerMediaRecoveryPrototype).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: "B",
			}),
			undefined,
		);

		// Act: test variant change and exit callbacks
		const lastCallProps = vi.mocked(SessionPlayerMediaRecoveryPrototype).mock
			.calls[0]?.[0];
		lastCallProps?.onVariantChange("C");
		const variantUpdater = mockNavigate.mock.calls[0]?.[0];
		const variantResult =
			typeof variantUpdater === "function"
				? variantUpdater({ existing: true })
				: undefined;
		lastCallProps?.onExit();
		const exitUpdater = mockNavigate.mock.calls[1]?.[0];
		const exitResult =
			typeof exitUpdater === "function"
				? exitUpdater({ existing: true })
				: undefined;

		// Assert
		expect(mockNavigate).toHaveBeenCalledTimes(2);
		expect(variantResult).toEqual({
			existing: true,
			prototype: "media-recovery",
			variant: "C",
		});
		expect(exitResult).toEqual({
			existing: true,
			prototype: undefined,
			variant: undefined,
		});
	});

	it("defaults variant to A when prototype is media-recovery without explicit variant", () => {
		// Arrange
		const mockNavigate = vi.fn();

		// Act
		render(
			<SessionPlayerRouteView
				onNavigateSearch={mockNavigate}
				playthroughId={null}
				scenarioSnapshotIds={[]}
				search={{
					prototype: "media-recovery",
				}}
				vod={null}
				vodId="vod_1"
			/>,
		);

		// Assert
		expect(SessionPlayerMediaRecoveryPrototype).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: "A",
			}),
			undefined,
		);
	});

	it("passes modules and handles omitted search parameter", () => {
		// Arrange
		const mockNavigate = vi.fn();
		const mockVod = { id: "vod_1" } as never;

		// Act
		render(
			<SessionPlayerRouteView
				onNavigateSearch={mockNavigate}
				playthroughId="pt_1"
				scenarioSnapshotIds={["s1"]}
				search={{ modules: "AIM" }}
				vod={mockVod}
				vodId="vod_1"
			/>,
		);

		// Assert
		expect(SessionPlayerPage).toHaveBeenCalledWith(
			expect.objectContaining({
				searchParams: {
					modules: "AIM",
					playthroughId: "pt_1",
				},
			}),
			undefined,
		);

		// Act: test with search completely undefined
		render(
			<SessionPlayerRouteView
				onNavigateSearch={mockNavigate}
				playthroughId={null}
				scenarioSnapshotIds={[]}
				vod={null}
				vodId="vod_2"
			/>,
		);

		// Assert
		expect(SessionPlayerPage).toHaveBeenCalledWith(
			expect.objectContaining({
				searchParams: {
					modules: undefined,
					playthroughId: undefined,
				},
			}),
			undefined,
		);
	});
});
