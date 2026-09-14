/**
 * Data access queries and operations for playthroughs, completions, module selections, and scenario snapshots.
 *
 * Provides standard list queries with pagination and filtering, inserts, updates, and deletions
 * adhering to per-request client passing and standard limit/returning conventions.
 */

import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { createDbClient } from "../client";
import {
	DEFAULT_LIMIT,
	filterToSQL,
	orderToSQL,
	type QueryOptions,
} from "../query";
import { playthroughs } from "../schema/playthrough";
import { playthroughCompletions } from "../schema/playthrough-completion";
import { playthroughModuleSelections } from "../schema/playthrough-module-selection";
import { scenarioSnapshots } from "../schema/scenario-snapshot";

type Playthrough = InferSelectModel<typeof playthroughs>;
type PlaythroughValues = InferInsertModel<typeof playthroughs>;

type PlaythroughCompletionValues = InferInsertModel<
	typeof playthroughCompletions
>;

type PlaythroughModuleSelectionValues = InferInsertModel<
	typeof playthroughModuleSelections
>;

type ScenarioSnapshotValues = InferInsertModel<typeof scenarioSnapshots>;

export function queryPlaythroughs(
	options: QueryOptions<typeof playthroughs> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(playthroughs)
		.where(filterToSQL(playthroughs, filter))
		.orderBy(orderToSQL(playthroughs, order))
		.limit(limit)
		.all();
}

export function createPlaythrough(
	values: PlaythroughValues,
	db = createDbClient(),
) {
	return db.insert(playthroughs).values(values).returning().get();
}

export function getPlaythroughById(
	id: Playthrough["id"],
	db = createDbClient(),
) {
	return db.select().from(playthroughs).where(eq(playthroughs.id, id)).get();
}

export function updatePlaythrough(
	id: Playthrough["id"],
	values: Partial<PlaythroughValues>,
	db = createDbClient(),
) {
	return db
		.update(playthroughs)
		.set(values)
		.where(eq(playthroughs.id, id))
		.returning()
		.get();
}

export function deletePlaythrough(
	id: Playthrough["id"],
	db = createDbClient(),
) {
	return db
		.delete(playthroughs)
		.where(eq(playthroughs.id, id))
		.returning()
		.get();
}

export function createPlaythroughCompletion(
	values: PlaythroughCompletionValues,
	db = createDbClient(),
) {
	return db.insert(playthroughCompletions).values(values).returning().get();
}

export function queryPlaythroughCompletions(
	options: QueryOptions<typeof playthroughCompletions> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(playthroughCompletions)
		.where(filterToSQL(playthroughCompletions, filter))
		.orderBy(orderToSQL(playthroughCompletions, order))
		.limit(limit)
		.all();
}

export function createPlaythroughModuleSelections(
	values: PlaythroughModuleSelectionValues[],
	db = createDbClient(),
) {
	if (values.length === 0) {
		return Promise.resolve([]);
	}
	return db
		.insert(playthroughModuleSelections)
		.values(values)
		.returning()
		.all();
}

export function queryPlaythroughModuleSelections(
	options: QueryOptions<typeof playthroughModuleSelections> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(playthroughModuleSelections)
		.where(filterToSQL(playthroughModuleSelections, filter))
		.orderBy(orderToSQL(playthroughModuleSelections, order))
		.limit(limit)
		.all();
}

export function createScenarioSnapshots(
	values: ScenarioSnapshotValues[],
	db = createDbClient(),
) {
	if (values.length === 0) {
		return Promise.resolve([]);
	}
	return db.insert(scenarioSnapshots).values(values).returning().all();
}

export function queryScenarioSnapshots(
	options: QueryOptions<typeof scenarioSnapshots> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(scenarioSnapshots)
		.where(filterToSQL(scenarioSnapshots, filter))
		.orderBy(orderToSQL(scenarioSnapshots, order))
		.limit(limit)
		.all();
}
