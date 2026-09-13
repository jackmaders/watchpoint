/**
 * Tests query rules for administrative VOD list and single VOD retrieval.
 */

import { describe, expect, it, vi } from "vitest";
import * as dbQueries from "@/shared/db";
import { getAdminVodByIdRule, getAdminVodsRule } from "../get-admin-vods";

describe("get-admin-vods rules", () => {
	const sampleVod = {
		createdAt: new Date(),
		durationSeconds: 300,
		heroName: "Ana",
		id: "vod-1",
		isPublished: true,
		mapName: "Dorado",
		rankTier: "Diamond",
		role: "SUPPORT" as const,
		title: "Ana VOD",
		youtubeVideoId: "yt-1",
	};

	const sampleScenario = {
		explanationText: "Sleep dart",
		id: "sc-1",
		imageUrl: null,
		inputConfig: {},
		inputType: "MULTIPLE_CHOICE" as const,
		moduleType: "COOLDOWN" as const,
		promptText: "Prompt",
		timeLimitSeconds: null,
		timestampSeconds: 10,
		vodId: "vod-1",
	};

	describe("getAdminVodsRule", () => {
		it("retrieves vods with scenario counts and filters by search, role, and publication", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryVods").mockResolvedValueOnce([sampleVod]);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);

			// Act
			const result = await getAdminVodsRule({
				isPublished: true,
				role: "SUPPORT",
				search: "ana",
			});

			// Assert
			expect(result).toEqual([
				{
					...sampleVod,
					scenarios: [{ id: "sc-1" }],
				},
			]);
		});

		it("filters out vods that do not match search query", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryVods").mockResolvedValueOnce([sampleVod]);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([]);

			// Act
			const result = await getAdminVodsRule({
				search: "rein",
			});

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("getAdminVodByIdRule", () => {
		it("returns null when VOD is not found", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(undefined);

			// Act
			const result = await getAdminVodByIdRule({ id: "missing" });

			// Assert
			expect(result).toBeNull();
		});

		it("returns VOD with scenarios sorted by timestamp", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);

			// Act
			const result = await getAdminVodByIdRule({ id: "vod-1" });

			// Assert
			expect(result).toEqual({
				...sampleVod,
				scenarios: [sampleScenario],
			});
		});
	});
});
