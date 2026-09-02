/**
 * Provides query sanitization, pagination clamping, and dynamic SQL condition
 * builders for Drizzle ORM database operations.
 *
 * Implements standard database query utilities according to ADR-0010. Sanitizes
 * string inputs for SQL LIKE queries, enforces bounded pagination limits, projects
 * paginated query envelopes, and constructs composite WHERE clauses from table filters.
 */

import {
	and,
	Column,
	eq,
	getTableColumns,
	is,
	type SQL,
	type Table,
} from "drizzle-orm";

export interface PaginatedResult<T> {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface PaginationOptions {
	page?: number;
	pageSize?: number;
}

export interface ClampedPagination {
	offset: number;
	page: number;
	pageSize: number;
}

/**
 * Derives query options directly from selectable Drizzle table columns merged with `PaginationOptions`.
 */
export type TableFilterOptions<
	TTable extends Table,
	K extends keyof TTable["$inferSelect"] = keyof TTable["$inferSelect"],
> = PaginationOptions & Partial<Pick<TTable["$inferSelect"], K>>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 50;

/**
 * Sanitizes a string for use in SQL LIKE clauses by escaping wildcards (%, _) and the escape character (\).
 */
export function escapeLike(query: string): string {
	return query.replace(/[\\%_]/g, "\\$&");
}

/**
 * Normalizes and clamps pagination options to safe database query bounds.
 * Page size is clamped between [1, 50] with a default of 10.
 * Page is clamped to >= 1 with a default of 1.
 */
export function clampPagination(
	options?: PaginationOptions,
): ClampedPagination {
	const rawPage = options?.page;
	const rawPageSize = options?.pageSize;

	const validPage =
		typeof rawPage === "number" && !Number.isNaN(rawPage)
			? Math.max(DEFAULT_PAGE, Math.floor(rawPage))
			: DEFAULT_PAGE;

	const validPageSize =
		typeof rawPageSize === "number" && !Number.isNaN(rawPageSize)
			? Math.min(
					MAX_PAGE_SIZE,
					Math.max(MIN_PAGE_SIZE, Math.floor(rawPageSize)),
				)
			: DEFAULT_PAGE_SIZE;

	const offset = (validPage - 1) * validPageSize;

	return {
		offset,
		page: validPage,
		pageSize: validPageSize,
	};
}

/**
 * Builds a standardized PaginatedResult from items, total count, and clamped pagination options.
 */
export function buildPaginatedResult<T>(
	items: T[],
	total: number,
	pagination: ClampedPagination,
): PaginatedResult<T> {
	const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
	return {
		items,
		page: pagination.page,
		pageSize: pagination.pageSize,
		total,
		totalPages,
	};
}

/**
 * Dynamically builds an `and(...conditions)` SQL clause from matching table columns and filter values.
 * Ignores undefined filter values and keys that do not correspond to columns on the table.
 */
export function buildWhereConditions<
	TTable extends Table,
	TFilters extends object = Record<string, unknown>,
>(table: TTable, filters?: TFilters): SQL | undefined {
	if (!filters) {
		return undefined;
	}

	const conditions: SQL[] = [];
	const columns = getTableColumns(table);

	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined) {
			continue;
		}

		const column = columns[key];
		if (column && is(column, Column)) {
			conditions.push(eq(column, value));
		}
	}

	return conditions.length > 0 ? and(...conditions) : undefined;
}
