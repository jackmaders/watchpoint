/**
 * Data access queries and operations for the scenarios table.
 *
 * Provides queryScenarios, createScenario, updateScenario, deleteScenario, and reorderScenarios
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
import { scenarios } from "../schema/scenario";

type Scenario = InferSelectModel<typeof scenarios>;
type ScenarioValues = InferInsertModel<typeof scenarios>;

export function queryScenarios(
	options: QueryOptions<typeof scenarios> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(scenarios)
		.where(filterToSQL(scenarios, filter))
		.orderBy(orderToSQL(scenarios, order))
		.limit(limit)
		.all();
}

export function createScenario(values: ScenarioValues, db = createDbClient()) {
	return db.insert(scenarios).values(values).returning().get();
}

export function createScenarios(
	values: ScenarioValues[],
	db = createDbClient(),
) {
	if (values.length === 0) {
		return Promise.resolve([]);
	}
	return db.insert(scenarios).values(values).returning().all();
}

export function getScenarioById(id: Scenario["id"], db = createDbClient()) {
	return db.select().from(scenarios).where(eq(scenarios.id, id)).get();
}

export function updateScenario(
	id: Scenario["id"],
	values: Partial<ScenarioValues>,
	db = createDbClient(),
) {
	return db
		.update(scenarios)
		.set(values)
		.where(eq(scenarios.id, id))
		.returning()
		.get();
}

export function deleteScenario(id: Scenario["id"], db = createDbClient()) {
	return db.delete(scenarios).where(eq(scenarios.id, id)).returning().get();
}

export function reorderScenarios(
	orders: Array<{ id: Scenario["id"]; timestampSeconds: number }>,
	db = createDbClient(),
) {
	if (orders.length === 0) {
		return Promise.resolve([]);
	}
	return Promise.all(
		orders.map((order) =>
			db
				.update(scenarios)
				.set({ timestampSeconds: order.timestampSeconds })
				.where(eq(scenarios.id, order.id))
				.returning()
				.get(),
		),
	);
}
