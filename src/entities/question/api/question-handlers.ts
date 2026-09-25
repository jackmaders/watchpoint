import { asc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { z } from "zod";
import { getDb } from "@/shared/db/index.server";
import { options } from "@/shared/db/schema/options";
import { questions } from "@/shared/db/schema/questions";
import type {
	QuestionAuthoring,
	QuestionUpdate,
} from "../model/question-types";
import {
	questionAuthoringSchema,
	questionUpdateSchema,
	questionWithOptionsSchema,
} from "../model/question-validation";

export async function questionCreateHandler(
	data: QuestionAuthoring,
	db = getDb(),
) {
	const input = questionAuthoringSchema.parse(data);
	const questionId = crypto.randomUUID();
	await db.batch(buildQuestionCreateBatch({ input, questionId, db }));
	return questionFetchHandler(questionId, db);
}

export async function questionUpdateHandler(
	data: QuestionUpdate,
	db = getDb(),
) {
	const input = questionUpdateSchema.parse(data);
	await db.batch(buildQuestionUpdateBatch({ input, db }));
	return questionFetchHandler(input.id, db);
}

function buildQuestionCreateBatch({
	input,
	questionId,
	db,
}: {
	input: z.infer<typeof questionAuthoringSchema>;
	questionId: string;
	db: ReturnType<typeof getDb>;
}): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
	const { options: questionOptions, ...questionValues } = input;
	const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
		db.insert(questions).values({ id: questionId, ...questionValues }),
		...buildOptionInsertStatements({ questionId, questionOptions, db }),
	];
	return statements;
}

function buildQuestionUpdateBatch({
	input,
	db,
}: {
	input: z.infer<typeof questionUpdateSchema>;
	db: ReturnType<typeof getDb>;
}): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
	const { id, options: questionOptions, ...questionValues } = input;
	const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
		db.update(questions).set(questionValues).where(eq(questions.id, id)),
		db.delete(options).where(eq(options.questionId, id)),
		...buildOptionInsertStatements({
			questionId: id,
			questionOptions,
			db,
		}),
	];
	return statements;
}

function buildOptionInsertStatements({
	questionId,
	questionOptions,
	db,
}: {
	questionId: string;
	questionOptions: QuestionAuthoring["options"];
	db: ReturnType<typeof getDb>;
}) {
	return questionOptions.map((option, orderIndex) =>
		db.insert(options).values({
			id: option.id ?? crypto.randomUUID(),
			questionId,
			text: option.text,
			isCorrect: option.isCorrect,
			orderIndex,
		}),
	);
}

export async function questionFetchHandler(id: string, db = getDb()) {
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
