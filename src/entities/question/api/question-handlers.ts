import { and, asc, eq, notInArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/shared/db/index.server";
import { options } from "@/shared/db/schema/options";
import { questions } from "@/shared/db/schema/questions";
import type {
	QuestionInsert,
	QuestionInsertInput,
	QuestionUpdate,
	QuestionUpdateInput,
	QuestionWithOptions,
} from "../model/question-types";
import {
	questionInsertSchema,
	questionUpdateSchema,
	questionWithOptionsSchema,
} from "../model/question-validation";

export async function questionCreateHandler(
	data: QuestionInsertInput,
	db = getDb(),
) {
	const input: QuestionInsert = questionInsertSchema.parse(data);
	const questionId = crypto.randomUUID();
	const { options: questionOptions, ...questionValues } = input;
	const optionRows = toOptionInsertValues(questionId, questionOptions);
	const optionStatements = optionRows.map((option) =>
		db.insert(options).values(option),
	);
	const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
		db.insert(questions).values({ id: questionId, ...questionValues }),
		...optionStatements,
	];

	await db.batch(statements);
	return questionFetchHandler(questionId, db);
}

export async function questionUpdateHandler(
	data: QuestionUpdateInput,
	db = getDb(),
) {
	const input: QuestionUpdate = questionUpdateSchema.parse(data);
	const { id, options: questionOptions, ...questionValues } = input;
	// Retained Options keep their IDs because saved Answers reference them.
	const existingOptions = await db
		.select()
		.from(options)
		.where(eq(options.questionId, id))
		.orderBy(asc(options.orderIndex));
	const existingOptionIds = new Set(existingOptions.map((option) => option.id));
	const optionRows = toOptionInsertValues(id, questionOptions);
	const retainedOptionIds = optionRows.map((option) => option.id);
	const optionStatements = optionRows.map((option) =>
		existingOptionIds.has(option.id)
			? db
					.update(options)
					.set({
						text: option.text,
						isCorrect: option.isCorrect,
						orderIndex: option.orderIndex,
					})
					.where(and(eq(options.id, option.id), eq(options.questionId, id)))
			: db.insert(options).values(option),
	);
	const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
		db.update(questions).set(questionValues).where(eq(questions.id, id)),
		db
			.delete(options)
			.where(
				and(
					eq(options.questionId, id),
					notInArray(options.id, retainedOptionIds),
				),
			),
		...optionStatements,
	];

	await db.batch(statements);
	return questionFetchHandler(input.id, db);
}

export async function questionFetchHandler(
	id: string,
	db = getDb(),
): Promise<QuestionWithOptions | undefined> {
	const [question] = await db
		.select()
		.from(questions)
		.where(eq(questions.id, id));
	if (!question) {
		return undefined;
	}

	const questionOptions = await db
		.select()
		.from(options)
		.where(eq(options.questionId, id))
		.orderBy(asc(options.orderIndex));
	return questionWithOptionsSchema.parse({
		...question,
		options: questionOptions,
	});
}

function toOptionInsertValues(
	questionId: string,
	questionOptions: QuestionInsert["options"],
) {
	return questionOptions.map((option, orderIndex) => ({
		id: option.id ?? crypto.randomUUID(),
		questionId,
		text: option.text,
		isCorrect: option.isCorrect,
		orderIndex,
	}));
}
