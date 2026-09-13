/**
 * Data access queries and operations for the vods table.
 *
 * Provides queryVods, getVodById, createVod, updateVod, deleteVod, bulkPublishVods, and bulkDeleteVods
 * adhering to per-request client passing and standard limit/returning conventions.
 */

import {
	eq,
	type InferInsertModel,
	type InferSelectModel,
	inArray,
} from "drizzle-orm";
import { createDbClient } from "../client";
import {
	DEFAULT_LIMIT,
	filterToSQL,
	orderToSQL,
	type QueryOptions,
} from "../query";
import { vods } from "../schema/vod";

type Vod = InferSelectModel<typeof vods>;
type VodValues = InferInsertModel<typeof vods>;

export function queryVods(
	options: QueryOptions<typeof vods> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(vods)
		.where(filterToSQL(vods, filter))
		.orderBy(orderToSQL(vods, order))
		.limit(limit)
		.all();
}

export function createVod(values: VodValues, db = createDbClient()) {
	return db.insert(vods).values(values).returning().get();
}

export function getVodById(id: Vod["id"], db = createDbClient()) {
	return db.select().from(vods).where(eq(vods.id, id)).get();
}

export function updateVod(
	id: Vod["id"],
	values: Partial<VodValues>,
	db = createDbClient(),
) {
	return db.update(vods).set(values).where(eq(vods.id, id)).returning().get();
}

export function deleteVod(id: Vod["id"], db = createDbClient()) {
	return db.delete(vods).where(eq(vods.id, id)).returning().get();
}

export function bulkPublishVods(
	ids: Vod["id"][],
	isPublished: boolean,
	db = createDbClient(),
) {
	if (ids.length === 0) {
		return Promise.resolve([]);
	}
	return db
		.update(vods)
		.set({ isPublished })
		.where(inArray(vods.id, ids))
		.returning()
		.all();
}

export function bulkDeleteVods(ids: Vod["id"][], db = createDbClient()) {
	if (ids.length === 0) {
		return Promise.resolve([]);
	}
	return db.delete(vods).where(inArray(vods.id, ids)).returning().all();
}
