import { asc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/shared/db/index.server";
import { options } from "@/shared/db/schema/options";
import { questions } from "@/shared/db/schema/questions";
import type { QuestionAuthoring } from "../model/question-types";
import {
	questionAuthoringSchema,
	questionUpdateSchema,
	questionWithOptionsSchema,
} from "../model/question-validation";

type QuestionDatabase = ReturnType<typeof getDb>;

export async function questionCreateHandler(
	data: QuestionAuthoring,
	db: QuestionDatabase = getDb(),
) {
	const input = questionAuthoringSchema.parse(data);
	const questionId = input.id ?? crypto.randomUUID();
	const statements = createPersistenceStatements(
		{ ...input, id: questionId },
		db,
	);

	await db.batch(statements);
	return readQuestion(questionId, db);
}

export async function questionUpdateHandler(
	data: QuestionAuthoring & { id: string },
	db: QuestionDatabase = getDb(),
) {
	const input = questionUpdateSchema.parse(data);
	const statements = createPersistenceStatements(input, db, true);

	await db.batch(statements);
	return readQuestion(input.id, db);
}

function createPersistenceStatements(
	input: QuestionAuthoring & { id: string },
	db: QuestionDatabase,
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

	return batchStatements(
		questionStatement,
		...(includeOptionDelete ? [optionDeleteStatement] : []),
		...optionStatements,
	);
}

function batchStatements(
	first: BatchItem<"sqlite">,
	...rest: BatchItem<"sqlite">[]
): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
	return [first, ...rest];
}

async function readQuestion(id: string, db: QuestionDatabase) {
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
