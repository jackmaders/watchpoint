import { describe, expect, it } from "vitest";
import {
	insertAttemptRecordSchema,
	insertPlaythroughSchema,
	scenarioSnapshotInputSchema,
	selectAttemptRecordSchema,
	selectPlaythroughSchema,
} from "../playthroughs";

describe("playthroughs validation schemas", () => {
	it("validates select and insert playthrough schemas", () => {
		// Arrange
		const playthrough = {
			completedAt: null,
			createdAt: new Date(),
			id: "p_1",
			status: "IN_PROGRESS" as const,
			userId: "u_1",
			vodId: "v_1",
		};

		// Act & Assert
		expect(selectPlaythroughSchema.safeParse(playthrough).success).toBe(true);
		expect(
			insertPlaythroughSchema.safeParse({
				userId: "u_1",
				vodId: "v_1",
			}).success,
		).toBe(true);
	});

	it("validates attempt record insertion and selection", () => {
		// Arrange
		const attempt = {
			createdAt: new Date(),
			id: "a_1",
			idempotencyKey: "key_1",
			inputValue: { selected: "1" },
			isCorrect: true,
			isTimedOut: false,
			playthroughId: "p_1",
			responseTimeMs: 1200,
			scenarioId: "s_1",
			scenarioSnapshotId: "snap_1",
			selectedOptionId: "opt_1",
			userId: "u_1",
		};

		// Act & Assert
		expect(selectAttemptRecordSchema.safeParse(attempt).success).toBe(true);
		expect(
			insertAttemptRecordSchema.safeParse({
				idempotencyKey: "key_1",
				isCorrect: true,
				responseTimeMs: 1200,
				scenarioId: "s_1",
				userId: "u_1",
			}).success,
		).toBe(true);
	});

	it("rejects attempt record with empty idempotency key or negative response time", () => {
		// Act & Assert
		expect(
			insertAttemptRecordSchema.safeParse({
				idempotencyKey: "",
				isCorrect: true,
				responseTimeMs: 1200,
				scenarioId: "s_1",
				userId: "u_1",
			}).success,
		).toBe(false);

		expect(
			insertAttemptRecordSchema.safeParse({
				idempotencyKey: "key_1",
				isCorrect: true,
				responseTimeMs: -10,
				scenarioId: "s_1",
				userId: "u_1",
			}).success,
		).toBe(false);
	});

	it("validates scenarioSnapshotInputSchema", () => {
		// Arrange
		const snapshot = {
			explanationText: "Explanation text",
			inputConfig: { options: [] },
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			playthroughId: "p_1",
			position: 0,
			promptText: "Prompt text",
			scenarioId: "s_1",
			timestampSeconds: 15,
		};

		// Act & Assert
		expect(scenarioSnapshotInputSchema.safeParse(snapshot).success).toBe(true);
	});

	it("rejects scenario snapshot with empty prompt, explanation, or negative timestamp", () => {
		// Act & Assert
		expect(
			scenarioSnapshotInputSchema.safeParse({
				explanationText: "",
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				playthroughId: "p_1",
				position: 0,
				promptText: "Prompt",
				scenarioId: "s_1",
				timestampSeconds: 10,
			}).success,
		).toBe(false);

		expect(
			scenarioSnapshotInputSchema.safeParse({
				explanationText: "Exp",
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				playthroughId: "p_1",
				position: 0,
				promptText: "",
				scenarioId: "s_1",
				timestampSeconds: 10,
			}).success,
		).toBe(false);

		expect(
			scenarioSnapshotInputSchema.safeParse({
				explanationText: "Exp",
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				playthroughId: "p_1",
				position: 0,
				promptText: "Prompt",
				scenarioId: "s_1",
				timestampSeconds: -5,
			}).success,
		).toBe(false);
	});
});
