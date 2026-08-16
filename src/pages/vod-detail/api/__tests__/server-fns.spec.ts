import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionManifest as dbGetSessionManifest } from "@/shared/db";
import * as recordAttemptModule from "../record-attempt";
import {
	getSessionManifest,
	getVodDetails,
	recordAttempt,
} from "../server-fns";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("../record-attempt");

describe("server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes getVodDetails handler correctly", async () => {
		// Arrange
		const mockVod = { id: "vod_123", title: "Test VOD" } as never;
		vi.mocked(dbGetSessionManifest).mockResolvedValueOnce(mockVod);

		// Act
		const result = await (
			getVodDetails as unknown as (ctx: { data: string }) => Promise<unknown>
		)({ data: "vod_123" });

		// Assert
		expect(dbGetSessionManifest).toHaveBeenCalledWith("vod_123");
		expect(result).toBe(mockVod);
	});

	it("executes getSessionManifest handler correctly", async () => {
		// Arrange
		const mockManifest = { id: "vod_123", scenarios: [] } as never;
		vi.mocked(dbGetSessionManifest).mockResolvedValueOnce(mockManifest);

		// Act
		const result = await (
			getSessionManifest as unknown as (ctx: {
				data: { modules?: string[]; publishedOnly?: boolean; vodId: string };
			}) => Promise<unknown>
		)({
			data: {
				modules: ["STRATEGY"],
				publishedOnly: true,
				vodId: "vod_123",
			},
		});

		// Assert
		expect(dbGetSessionManifest).toHaveBeenCalledWith("vod_123", {
			modules: ["STRATEGY"],
			publishedOnly: true,
		});
		expect(result).toBe(mockManifest);
	});

	it("executes recordAttempt validator and handler correctly on valid payload", async () => {
		// Arrange
		const payload = {
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		};
		vi.spyOn(recordAttemptModule, "recordAttemptAction").mockResolvedValueOnce({
			attemptId: "att_1",
			success: true,
		});

		// Act
		const result = await (
			recordAttempt as unknown as (ctx: {
				data: typeof payload;
			}) => Promise<unknown>
		)({ data: payload });

		// Assert
		expect(recordAttemptModule.recordAttemptAction).toHaveBeenCalledWith(
			payload,
		);
		expect(result).toEqual({ attemptId: "att_1", success: true });
	});

	it("throws error in recordAttempt validator on invalid payload", async () => {
		// Arrange
		const invalidPayload = {
			isCorrect: true,
			responseTimeMs: -50,
			scenarioId: "not-a-uuid",
		};

		// Act & Assert
		await expect(
			(
				recordAttempt as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: invalidPayload }),
		).rejects.toThrow("Invalid attempt payload");
	});
});
