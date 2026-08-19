import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getProtectedSessionManifest,
	getSessionManifest,
} from "@/pages/vod-detail";
import { Route as VodDetailRoute } from "../$id";
import { Route as SessionRoute } from "../$id.session";

vi.mock("@/pages/vod-detail");

describe("VOD route manifest adapters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("passes the VOD detail route identifier through the canonical payload", async () => {
		// Arrange
		const loader = VodDetailRoute.options.loader as unknown as (context: {
			params: { id: string };
		}) => Promise<unknown>;

		// Act
		await loader({ params: { id: "vod_123" } });

		// Assert
		expect(getSessionManifest).toHaveBeenCalledWith({
			data: { vodId: "vod_123" },
		});
	});

	it("passes the session route search value with the canonical VOD identifier", async () => {
		// Arrange
		const loader = SessionRoute.options.loader as unknown as (context: {
			deps: { modules?: string };
			params: { id: string };
		}) => Promise<unknown>;

		// Act
		await loader({
			deps: { modules: "STRATEGY,TACTICS" },
			params: { id: "vod_123" },
		});

		// Assert
		expect(getProtectedSessionManifest).toHaveBeenCalledWith({
			data: { modules: "STRATEGY,TACTICS", vodId: "vod_123" },
		});
	});
});
