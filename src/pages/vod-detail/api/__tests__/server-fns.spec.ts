import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionManifest as dbGetSessionManifest } from "@/shared/db";
import * as recordAttemptModule from "../record-attempt";
import { getSessionManifest, recordAttempt } from "../server-fns";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("../record-attempt");

describe("server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes getSessionManifest handler correctly with object payload", async () => {
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

	it("normalizes a blank module filter at the server-function seam", async () => {
		// Arrange
		const mockManifest = { id: "vod_123", scenarios: [] } as never;
		vi.mocked(dbGetSessionManifest).mockResolvedValueOnce(mockManifest);

		// Act
		const result = await (
			getSessionManifest as unknown as (ctx: {
				data: { modules: string; vodId: string };
			}) => Promise<unknown>
		)({
			data: { modules: "   ", vodId: "vod_123" },
		});

		// Assert
		expect(dbGetSessionManifest).toHaveBeenCalledWith("vod_123", {
			modules: undefined,
			publishedOnly: undefined,
		});
		expect(result).toBe(mockManifest);
	});

	it("executes recordAttempt validator and handler correctly on valid payload", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91",
			isCorrect: true,
			isTimedOut: false,
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
