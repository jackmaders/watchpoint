import { describe, expect, test, vi } from "vitest";
import { questions } from "@/shared/db/schema/questions";
import { questionAuthoringSchema } from "..";
import {
	questionCreateHandler,
	questionUpdateHandler,
} from "../api/question-handlers";

vi.mock("@/shared/db/index.server", () => ({
	getDb: vi.fn(),
}));

const validQuestion = {
	id: "question-1",
	vodId: "vod-1",
	skillId: "skill-1",
	timestampSeconds: 42,
	prompt: "What should happen next?",
	explanation: "The high-ground rotation preserves sight lines.",
	options: [
		{ id: "option-1", text: "Rotate to high ground", isCorrect: true },
		{ id: "option-2", text: "Push alone", isCorrect: false },
	],
};

// biome-ignore lint/security/noSecrets: This is a domain name, not a secret.
describe("questionAuthoringSchema", () => {
	test("requires at least two Options", () => {
		expect(() =>
			questionAuthoringSchema.parse({
				...validQuestion,
				options: [validQuestion.options[0]],
			}),
		).toThrow();
	});

	test("requires exactly one correct Option", () => {
		expect(() =>
			questionAuthoringSchema.parse({
				...validQuestion,
				options: validQuestion.options.map((option) => ({
					...option,
					isCorrect: true,
				})),
			}),
		).toThrow();
	});
});

describe("question persistence", () => {
	test("returns the Question with explanation and Options in authoring order", async () => {
		const db = createDatabaseDouble();

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The double models only the public database seam.
		const result = await questionCreateHandler(validQuestion, db as never);

		expect(result).toMatchObject({
			id: "question-1",
			explanation: validQuestion.explanation,
			options: [
				{ id: "option-1", orderIndex: 0 },
				{ id: "option-2", orderIndex: 1 },
			],
		});
		expect(db.batches).toHaveLength(1);
	});

	test("replaces Options in one batch so removed Options detach", async () => {
		const db = createDatabaseDouble();
		const updatedQuestion = {
			...validQuestion,
			options: [
				{ id: "option-2", text: "Push alone", isCorrect: true },
				{ text: "Hold", isCorrect: false },
			],
		};

		// biome-ignore lint/nursery/noUnsafeTypeAssertion: The double models only the public database seam.
		await questionUpdateHandler(updatedQuestion, db as never);

		expect(db.batches).toHaveLength(1);
		expect(db.batches[0]).toHaveLength(4);
	});

	test("propagates a failed batch without reading a partially saved aggregate", async () => {
		const db = createDatabaseDouble(new Error("batch failed"));

		await expect(
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: The double models only the public database seam.
			questionCreateHandler(validQuestion, db as never),
		).rejects.toThrow("batch failed");
		expect(db.reads).toBe(0);
	});
});

function createDatabaseDouble(batchError?: Error) {
	const batches: unknown[][] = [];
	let reads = 0;
	const questionRow = {
		...validQuestion,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	const optionRows = validQuestion.options.map((option, orderIndex) => ({
		...option,
		questionId: validQuestion.id,
		orderIndex,
		createdAt: new Date(),
		updatedAt: new Date(),
	}));
	const builder = (table: unknown) => ({
		values: () => builder(table),
		set: () => builder(table),
		where: () => builder(table),
		onConflictDoUpdate: () => builder(table),
	});

	return {
		batches,
		get reads() {
			return reads;
		},
		insert: (table: unknown) => builder(table),
		update: (table: unknown) => builder(table),
		delete: (table: unknown) => builder(table),
		batch: async (statements: unknown[]) => {
			batches.push(statements);
			if (batchError) {
				throw batchError;
			}
		},
		select: () => ({
			from: (table: unknown) => ({
				where: () => {
					reads += 1;
					return table === questions
						? Promise.resolve([questionRow])
						: {
								orderBy: () => Promise.resolve(optionRows),
							};
				},
			}),
		}),
	} as const;
}
