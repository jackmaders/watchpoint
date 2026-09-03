/**
 * Shared clause builders and standard options for Drizzle ORM queries.
 *
 * Implements standard query parameter structures and SQL converters for derived table
 * filters and deterministic order-by clauses with primary-key tiebreakers.
 */

import {
	type AnyTableFilter,
	type InferSelectModel,
	relationsFilterToSQL,
	relationsOrderToSQL,
	type Table,
	type TableFilter,
} from "drizzle-orm";

export const DEFAULT_LIMIT = 100;

export type QueryOptions<T extends Table> = {
	filter?: TableFilter<T>;
	order?: Partial<Record<keyof InferSelectModel<T>, "asc" | "desc">>;
	limit?: number;
};

/** Turns a table's filter options into a WHERE clause. */
export function filterToSQL<T extends Table>(
	table: T,
	filter: TableFilter<T> = {},
) {
	// the cast is unavoidable: AnyTableFilter is index-signed and invariant
	return relationsFilterToSQL(table, filter as AnyTableFilter);
}

/** Turns a table's order options into an ORDER BY clause. */
export function orderToSQL<T extends Table>(
	table: T,
	order: QueryOptions<T>["order"],
	tiebreak: keyof InferSelectModel<T> & string,
) {
	// the tiebreak always adds an entry, so the result is never undefined
	// biome-ignore lint/style/noNonNullAssertion: relationsOrderToSQL is non-null when order has at least one entry
	return relationsOrderToSQL(table, {
		...order,
		[tiebreak]: order?.[tiebreak] ?? "asc",
	})!;
}
