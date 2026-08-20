import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/home");
vi.mock("@/pages/vods");
vi.mock("@/shared/lib/auth");

import { HomePage } from "@/pages/home";
import { getPublishedVods } from "@/pages/vods";
import { isRegistrationOpen } from "@/shared/lib/auth";
import { Route } from "../index";

describe("Home index route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(HomePage).mockReturnValue(
			<div data-testid="mock-home-page">Home Page</div>,
		);
	});

	it("loader fetches vods and checks registration status", async () => {
		// Arrange
		const mockVods = [{ id: "vod_1", scenarios: [] }] as never;
		vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
		vi.mocked(isRegistrationOpen).mockResolvedValueOnce(true);
		const loader = Route.options.loader as () => Promise<unknown>;

		// Act
		const data = await loader();

		// Assert
		expect(getPublishedVods).toHaveBeenCalled();
		expect(isRegistrationOpen).toHaveBeenCalled();
		expect(data).toEqual({
			registrationEnabled: true,
			vods: mockVods,
		});
	});

	it("renders HomePage with loader data", () => {
		// Arrange
		const mockData = {
			registrationEnabled: false,
			vods: [],
		};
		vi.mocked(Route.useLoaderData).mockReturnValue(mockData);
		const Component = Route.options.component as () => React.ReactNode;

		// Act
		render(Component());

		// Assert
		expect(screen.getByTestId("mock-home-page")).toBeDefined();
		expect(HomePage).toHaveBeenCalledWith(mockData, undefined);
	});
});
