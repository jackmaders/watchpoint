export type DbResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export function dbSuccess<T>(data: T): DbResult<T> {
	return { data, success: true };
}

export function dbFailure<T = never>(error: string): DbResult<T> {
	return { error, success: false };
}
