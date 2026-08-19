import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionManifest as dbGetSessionManifest } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import * as recordAttemptModule from "../record-attempt";
import {
	completePlaythrough,
	getProtectedSessionManifest,
	getSessionManifest,
	recordAttempt,
	startPlaythrough,
} from "../server-fns";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");
vi.mock("../record-attempt");

describe("server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "user_1" });
	});

	it("rejects anonymous protected manifest requests", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(
			(
				getProtectedSessionManifest as unknown as (ctx: {
					data: { vodId: string };
				}) => Promise<unknown>
			)({ data: { vodId: "vod_123" } }),
		).rejects.toThrow("Authentication required");
		expect(dbGetSessionManifest).not.toHaveBeenCalled();
	});

	it("loads a protected manifest for an authenticated user", async () => {
		// Arrange
		const mockManifest = { id: "vod_123", scenarios: [] } as never;
		vi.mocked(dbGetSessionManifest).mockResolvedValueOnce(mockManifest);

		// Act
		const result = await (
			getProtectedSessionManifest as unknown as (ctx: {
				data: { modules?: string[]; vodId: string };
			}) => Promise<unknown>
		)({
			data: { modules: ["STRATEGY"], vodId: "vod_123" },
		});

		// Assert
		expect(dbGetSessionManifest).toHaveBeenCalledWith("vod_123", {
			modules: ["STRATEGY"],
			publishedOnly: undefined,
		});
		expect(result).toBe(mockManifest);
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

	it("runs the playthrough lifecycle server handlers", async () => {
		// Arrange
		const start = startPlaythrough as unknown as (ctx: {
			data: unknown;
		}) => Promise<unknown>;
		const complete = completePlaythrough as unknown as (ctx: {
			data: { playthroughId: string };
		}) => Promise<unknown>;

		// Act
		const started = await start({
			data: { id: "playthrough_1", modules: [], scenarios: [], vodId: "vod_1" },
		});
		const completed = await complete({
			data: { playthroughId: "playthrough_1" },
		});

		// Assert
		expect(started).toBeDefined();
		expect(completed).toBeDefined();
	});
});
