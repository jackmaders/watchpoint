import { count as drizzleCount, eq } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { type DbContext, getDb } from "../core/client";
import { catchDbError } from "../core/errors";

export interface TableWithId extends SQLiteTable {
	id: SQLiteColumn;
}

function createQueryOperations<TTable extends TableWithId>(table: TTable) {
	type TSelect = TTable["$inferSelect"];

	return {
		async count(context?: DbContext): Promise<number> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const [row] = await db
				.select({ count: drizzleCount() })
				.from(table)
				.catch(catchDbError("Failed to retrieve record count"));

			return Number(row?.count ?? 0);
		},

		async exists(id: string, context?: DbContext): Promise<boolean> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const [row] = await db
				.select({ id: table.id })
				.from(table)
				.where(eq(table.id, id))
				.limit(1)
				.catch(catchDbError("Failed to check record existence"));

			return Boolean(row);
		},

		async getById(id: string, context?: DbContext): Promise<TSelect | null> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const [row] = await db
				.select()
				.from(table)
				.where(eq(table.id, id))
				.limit(1)
				.catch(catchDbError("Failed to retrieve record by ID"));

			return (row as TSelect) ?? null;
		},
	};
}

function createMutationOperations<TTable extends TableWithId>(table: TTable) {
	type TSelect = TTable["$inferSelect"];
	type TInsert = TTable["$inferInsert"];

	return {
		async create(values: TInsert, context?: DbContext): Promise<TSelect> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const result = (await db
				.insert(table)
				.values(values)
				.returning()
				.catch(catchDbError("Failed to create record"))) as
				| TSelect[]
				| undefined;

			const created = result?.[0];
			return created as TSelect;
		},

		async delete(id: string, context?: DbContext): Promise<boolean> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const query = db.delete(table).where(eq(table.id, id));

			if (typeof (query as { returning?: unknown }).returning === "function") {
				const result = (await (
					query as { returning: (cols: unknown) => Promise<unknown[]> }
				)
					.returning({ id: table.id })
					.catch(catchDbError("Failed to delete record"))) as
					| Array<{ id: string }>
					| undefined;

				return Boolean(result && result.length > 0);
			}

			await query.catch(catchDbError("Failed to delete record"));
			return true;
		},

		async update(
			id: string,
			values: Partial<TInsert>,
			context?: DbContext,
		): Promise<TSelect | null> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const [updated] = await db
				.update(table)
				.set(values)
				.where(eq(table.id, id))
				.returning()
				.catch(catchDbError("Failed to update record"));

			return (updated as TSelect) ?? null;
		},

		async upsert(values: TInsert, context?: DbContext): Promise<TSelect> {
			const db = await getDb(context).catch(
				catchDbError("Failed to connect to database"),
			);
			const [upserted] = await db
				.insert(table)
				.values(values)
				.onConflictDoUpdate({
					set: values,
					target: table.id,
				})
				.returning()
				.catch(catchDbError("Failed to upsert record"));

			return upserted as TSelect;
		},
	};
}

export function createTableService<TTable extends TableWithId>(table: TTable) {
	const queries = createQueryOperations(table);
	const mutations = createMutationOperations(table);

	return {
		...queries,
		...mutations,
	};
}
