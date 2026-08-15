import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVodManifest } from "@/shared/db";
import { handleGetVodManifest, parseModulesParam } from "../manifest";

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

		vi.mocked(getVodManifest).mockResolvedValueOnce(
			mockManifest as unknown as Awaited<ReturnType<typeof getVodManifest>>,
		);

		const req = new NextRequest("http://localhost/api/vods/vod_1/manifest");

		// Act
		const res = await handleGetVodManifest(req, {
			params: Promise.resolve({ id: "vod_1" }),
		});

		// Assert
		expect(res.status).toBe(200);
		const body = await res.json();
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
		expect(getVodManifest).toHaveBeenCalledWith("vod_1", {
			modules: undefined,
		});
	});

	it("parses modules query parameter and passes parsed modules array to getVodManifest", async () => {
		// Arrange
		const mockManifest = {
			id: "vod_1",
			scenarios: [],
		};

		vi.mocked(getVodManifest).mockResolvedValueOnce(
			mockManifest as unknown as Awaited<ReturnType<typeof getVodManifest>>,
		);

		const req = new NextRequest(
			"http://localhost/api/vods/vod_1/manifest?modules=STRATEGY,TACTICS",
		);

		// Act
		const res = await handleGetVodManifest(req, {
			params: Promise.resolve({ id: "vod_1" }),
		});

		// Assert
		expect(res.status).toBe(200);
		expect(getVodManifest).toHaveBeenCalledWith("vod_1", {
			modules: ["STRATEGY", "TACTICS"],
		});
	});

	it("returns 404 JSON response if VOD manifest is not found", async () => {
		// Arrange
		vi.mocked(getVodManifest).mockResolvedValueOnce(null);

		const req = new NextRequest(
			"http://localhost/api/vods/non_existent/manifest",
		);

		// Act
		const res = await handleGetVodManifest(req, {
			params: Promise.resolve({ id: "non_existent" }),
		});

		// Assert
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toEqual({ error: "VOD not found" });
	});
});

describe("parseModulesParam helper", () => {
	it("parses comma-separated and multiple query params into uppercase array", () => {
		// Arrange
		const searchParams = new URLSearchParams(
			"modules=strategy,tactics&modules=ultimate",
		);

		// Act
		const result = parseModulesParam(searchParams);

		// Assert
		expect(result).toEqual(["STRATEGY", "TACTICS", "ULTIMATE"]);
	});

	it("returns empty array when no modules param is present", () => {
		// Arrange
		const searchParams = new URLSearchParams("");

		// Act
		const result = parseModulesParam(searchParams);

		// Assert
		expect(result).toEqual([]);
	});
});
