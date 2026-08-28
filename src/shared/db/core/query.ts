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
