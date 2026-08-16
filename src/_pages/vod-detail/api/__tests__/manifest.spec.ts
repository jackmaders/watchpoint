import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionManifest } from "@/shared/db";
import { handleGetVodManifest } from "../manifest";

vi.mock("@/shared/db");

describe("GET /api/vods/[id]/manifest handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 JSON with VOD manifest when VOD exists", async () => {
		// Arrange
		const mockManifest = {
			createdAt: new Date("2026-08-06T10:00:00Z"),
			durationSeconds: 1080,
			id: "vod_1",
			isPublished: true,
			mapName: "King's Row",
			rankTier: "Grandmaster",
			scenarios: [
				{
					explanationText: "Test exp",
					id: "sc_1",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "Test prompt",
					timeLimitSeconds: null,
					timestampSeconds: 30,
					vodId: "vod_1",
				},
			],
			title: "GM Ana VOD",
			youtubeVideoId: "dQw4w9WgXcQ",
		};

		vi.mocked(getSessionManifest).mockResolvedValueOnce(
			mockManifest as unknown as Awaited<ReturnType<typeof getSessionManifest>>,
		);

		const req = new Request("http://localhost/api/vods/vod_1/manifest");

		// Act
		const res = await handleGetVodManifest(req, {
			params: Promise.resolve({ id: "vod_1" }),
		});
		const body = await res.json();

		// Assert
		expect(res.status).toBe(200);
		expect(body).toEqual({
			createdAt: "2026-08-06T10:00:00.000Z",
			durationSeconds: 1080,
			id: "vod_1",
			isPublished: true,
			mapName: "King's Row",
			rankTier: "Grandmaster",
			scenarios: [
				{
					explanationText: "Test exp",
					id: "sc_1",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "Test prompt",
					timeLimitSeconds: null,
					timestampSeconds: 30,
					vodId: "vod_1",
				},
			],
			title: "GM Ana VOD",
			youtubeVideoId: "dQw4w9WgXcQ",
		});
		expect(getSessionManifest).toHaveBeenCalledWith("vod_1", {
			modules: expect.any(URLSearchParams),
		});
	});

	it("passes search params directly to getSessionManifest", async () => {
		// Arrange
		const mockManifest = {
			id: "vod_1",
			scenarios: [],
		};

		vi.mocked(getSessionManifest).mockResolvedValueOnce(
			mockManifest as unknown as Awaited<ReturnType<typeof getSessionManifest>>,
		);

		const req = new Request(
			"http://localhost/api/vods/vod_1/manifest?modules=STRATEGY,TACTICS",
		);

		// Act
		const res = await handleGetVodManifest(req, {
			params: Promise.resolve({ id: "vod_1" }),
		});
		const capturedModules = vi.mocked(getSessionManifest).mock.calls[0]?.[1]
			?.modules as URLSearchParams;

		// Assert
		expect(res.status).toBe(200);
		expect(capturedModules.getAll("modules")).toEqual(["STRATEGY,TACTICS"]);
	});

	it("returns 404 JSON response if VOD manifest is not found", async () => {
		// Arrange
		vi.mocked(getSessionManifest).mockResolvedValueOnce(null);

		const req = new Request("http://localhost/api/vods/non_existent/manifest");

		// Act
		const res = await handleGetVodManifest(req, {
			params: Promise.resolve({ id: "non_existent" }),
		});
		const body = await res.json();

		// Assert
		expect(res.status).toBe(404);
		expect(body).toEqual({ error: "VOD not found" });
	});
});
