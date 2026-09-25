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
	const statements = buildQuestionPersistenceBatch(
		{ ...input, id: questionId },
		db,
	);

	await db.batch(statements);
	return readQuestion(questionId, db);
}

export async function questionUpdateHandler(
	data: QuestionUpdate,
	db = getDb(),
) {
	const input = questionUpdateSchema.parse(data);
	const statements = buildQuestionPersistenceBatch(input, db, true);

	await db.batch(statements);
	return readQuestion(input.id, db);
}

function buildQuestionPersistenceBatch(
	input: z.infer<typeof questionUpdateSchema>,
	db: ReturnType<typeof getDb>,
	includeOptionDelete = false,
) {
	const questionValues = {
		vodId: input.vodId,
		skillId: input.skillId,
		timestampSeconds: input.timestampSeconds,
		prompt: input.prompt,
		explanation: input.explanation,
	};
	const questionStatement = includeOptionDelete
		? db.update(questions).set(questionValues).where(eq(questions.id, input.id))
		: db.insert(questions).values({ id: input.id, ...questionValues });
	const optionDeleteStatement = db
		.delete(options)
		.where(eq(options.questionId, input.id));
	const optionStatements = input.options.map((option, orderIndex) =>
		db.insert(options).values({
			id: option.id ?? crypto.randomUUID(),
			questionId: input.id,
			text: option.text,
			isCorrect: option.isCorrect,
			orderIndex,
		}),
	);

	const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
		questionStatement,
		...(includeOptionDelete ? [optionDeleteStatement] : []),
		...optionStatements,
	];
	return statements;
}

async function readQuestion(id: string, db: ReturnType<typeof getDb>) {
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
