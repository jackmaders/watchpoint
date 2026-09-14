/**
 * Tests business rules for administrative scenario authoring, editing, deletion, and reordering.
 *
 * Verifies create, update, delete, and reorder operations with discriminated unions.
 */

import { describe, expect, it, vi } from "vitest";
import * as dbQueries from "@/shared/db";
import {
	createScenarioRule,
	deleteScenarioRule,
	reorderScenariosRule,
	updateScenarioRule,
} from "../scenario-rules";
import * as validationModule from "../validation";

describe("scenario-rules", () => {
	const sampleVod = {
		createdAt: new Date(),
		durationSeconds: 300,
		heroName: "Ana",
		id: "vod-1",
		isPublished: false,
		mapName: "Dorado",
		rankTier: "Diamond",
		role: "SUPPORT" as const,
		title: "Ana VOD",
		youtubeVideoId: "yt-1",
	};

	const sampleScenario = {
		explanationText: "Use sleep dart",
		id: "sc-1",
		imageUrl: null,
		inputConfig: {
			options: [{ id: "opt-1", is_correct: true, text: "Sleep" }],
		},
		inputType: "MULTIPLE_CHOICE" as const,
		moduleType: "COOLDOWN" as const,
		promptText: "What cooldown should you use?",
		timeLimitSeconds: 15,
		timestampSeconds: 45.5,
		vodId: "vod-1",
	};

	const sampleAuditEntry = {
		action: "AUDIT",
		actorUserId: "admin-1",
		createdAt: new Date(),
		entityId: "sc-1",
		entityType: "SCENARIO",
		id: "audit-1",
		metadata: {},
	};

	describe("createScenarioRule", () => {
		it("rejects when scenario config is invalid", async () => {
			// Arrange
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				error: "Invalid scenario config",
				valid: false,
			});

			// Act
			const result = await createScenarioRule(sampleScenario);

			// Assert
			expect(result).toEqual({
				reason: "Invalid scenario config",
				status: "rejected",
			});
		});

		it("rejects with default message when validation error message is empty", async () => {
			// Arrange
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: false,
			});

			// Act
			const result = await createScenarioRule(sampleScenario);

			// Assert
			expect(result).toEqual({
				reason: "Invalid scenario configuration",
				status: "rejected",
			});
		});

		it("rejects when VOD does not exist", async () => {
			// Arrange
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(undefined);

			// Act
			const result = await createScenarioRule(sampleScenario);

			// Assert
			expect(result).toEqual({
				reason: "VOD not found",
				status: "rejected",
			});
		});

		it("rejects when scenario timestamp exceeds VOD duration", async () => {
			// Arrange
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce({
				...sampleVod,
				durationSeconds: 30,
			});

			// Act
			const result = await createScenarioRule({
				...sampleScenario,
				timestampSeconds: 45.5,
			});

			// Assert
			expect(result).toEqual({
				reason: "Scenario timestamp (45.5s) exceeds VOD duration (30s)",
				status: "rejected",
			});
		});

		it("creates scenario, writes audit log when actorUserId provided, and returns success", async () => {
			// Arrange
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "createScenario").mockResolvedValueOnce(
				sampleScenario,
			);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await createScenarioRule({
				...sampleScenario,
				actorUserId: "admin-1",
			});

			// Assert
			expect(result).toEqual({
				scenario: sampleScenario,
				status: "success",
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "SCENARIO_CREATED",
					actorUserId: "admin-1",
				}),
				undefined,
			);
		});

		it("creates scenario with null timeLimitSeconds when omitted", async () => {
			// Arrange
			const scenarioWithoutTimeLimit = {
				...sampleScenario,
				timeLimitSeconds: null,
			};
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "createScenario").mockResolvedValueOnce(
				scenarioWithoutTimeLimit,
			);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await createScenarioRule({
				...sampleScenario,
				timeLimitSeconds: undefined,
			});

			// Assert
			expect(result).toEqual({
				scenario: scenarioWithoutTimeLimit,
				status: "success",
			});
			expect(dbQueries.createScenario).toHaveBeenCalledWith(
				expect.objectContaining({
					timeLimitSeconds: null,
				}),
				undefined,
			);
		});

		it("returns rejected when db insert fails", async () => {
			// Arrange
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "createScenario").mockResolvedValueOnce(
				undefined as unknown as typeof sampleScenario,
			);

			// Act
			const result = await createScenarioRule(sampleScenario);

			// Assert
			expect(result).toEqual({
				reason: "Failed to create scenario",
				status: "rejected",
			});
		});
	});

	describe("updateScenarioRule", () => {
		it("rejects when scenario is not found", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([]);

			// Act
			const result = await updateScenarioRule({ id: "missing" });

			// Assert
			expect(result).toEqual({
				reason: "Scenario not found",
				status: "rejected",
			});
		});

		it("rejects when merged config is invalid", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				error: "Invalid config",
				valid: false,
			});

			// Act
			const result = await updateScenarioRule({ id: "sc-1" });

			// Assert
			expect(result).toEqual({
				reason: "Invalid config",
				status: "rejected",
			});
		});

		it("rejects with default message when update validation error message is empty", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: false,
			});

			// Act
			const result = await updateScenarioRule({ id: "sc-1" });

			// Assert
			expect(result).toEqual({
				reason: "Invalid scenario configuration",
				status: "rejected",
			});
		});

		it("updates scenario successfully and records audit", async () => {
			// Arrange
			const updatedScenario = { ...sampleScenario, promptText: "New Prompt" };
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "updateScenario").mockResolvedValueOnce(
				updatedScenario,
			);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await updateScenarioRule({
				actorUserId: "admin-1",
				explanationText: "New Expl",
				id: "sc-1",
				imageUrl: "http://img",
				inputConfig: { options: [] },
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "New Prompt",
				timeLimitSeconds: 20,
				timestampSeconds: 50,
			});

			// Assert
			expect(result).toEqual({
				scenario: updatedScenario,
				status: "success",
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "SCENARIO_UPDATED",
				}),
				undefined,
			);
		});

		it("returns rejected when db update fails", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(validationModule, "validateScenarioConfig").mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "updateScenario").mockResolvedValueOnce(
				undefined as unknown as typeof sampleScenario,
			);

			// Act
			const result = await updateScenarioRule({ id: "sc-1" });

			// Assert
			expect(result).toEqual({
				reason: "Failed to update scenario",
				status: "rejected",
			});
		});
	});

	describe("deleteScenarioRule", () => {
		it("rejects when scenario is not found", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([]);

			// Act
			const result = await deleteScenarioRule({ id: "missing" });

			// Assert
			expect(result).toEqual({
				reason: "Scenario not found",
				status: "rejected",
			});
		});

		it("deletes scenario and logs audit", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(dbQueries, "deleteScenario").mockResolvedValueOnce(
				sampleScenario,
			);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await deleteScenarioRule({
				actorUserId: "admin-1",
				id: "sc-1",
			});

			// Assert
			expect(result).toEqual({
				scenario: sampleScenario,
				status: "success",
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "SCENARIO_DELETED",
				}),
				undefined,
			);
		});

		it("returns rejected when db delete fails", async () => {
			// Arrange
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(dbQueries, "deleteScenario").mockResolvedValueOnce(
				undefined as unknown as typeof sampleScenario,
			);

			// Act
			const result = await deleteScenarioRule({ id: "sc-1" });

			// Assert
			expect(result).toEqual({
				reason: "Failed to delete scenario",
				status: "rejected",
			});
		});
	});

	describe("reorderScenariosRule", () => {
		it("rejects when VOD is not found", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(undefined);

			// Act
			const result = await reorderScenariosRule({
				scenarioOrders: [{ id: "sc-1", timestampSeconds: 10 }],
				vodId: "missing-vod",
			});

			// Assert
			expect(result).toEqual({
				reason: "VOD not found",
				status: "rejected",
			});
		});

		it("rejects when scenario does not belong to VOD", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);

			// Act
			const result = await reorderScenariosRule({
				scenarioOrders: [{ id: "foreign-sc", timestampSeconds: 10 }],
				vodId: "vod-1",
			});

			// Assert
			expect(result).toEqual({
				reason: "Scenario foreign-sc does not belong to VOD vod-1",
				status: "rejected",
			});
		});

		it("rejects when timestamp is invalid", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);

			// Act
			const result = await reorderScenariosRule({
				scenarioOrders: [{ id: "sc-1", timestampSeconds: -5 }],
				vodId: "vod-1",
			});

			// Assert
			expect(result).toEqual({
				reason: "Scenario timestamp must be a non-negative number",
				status: "rejected",
			});
		});

		it("reorders scenarios and records audit log", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				sampleScenario,
			]);
			vi.spyOn(dbQueries, "reorderScenarios").mockResolvedValueOnce([]);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await reorderScenariosRule({
				actorUserId: "admin-1",
				scenarioOrders: [{ id: "sc-1", timestampSeconds: 10 }],
				vodId: "vod-1",
			});

			// Assert
			expect(result).toEqual({
				status: "success",
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "SCENARIOS_REORDERED",
				}),
				undefined,
			);
		});
	});
});
