export class LessonError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "LessonError";
		this.status = status;
	}
}

export class LessonNotFoundError extends LessonError {
	constructor(resource: string) {
		super(`${resource} not found`, 404);
		this.name = "LessonNotFoundError";
	}
}

export class LessonValidationError extends LessonError {
	constructor(message: string) {
		super(message, 422);
		this.name = "LessonValidationError";
	}
}

export class LessonConflictError extends LessonError {
	constructor(message: string) {
		super(message, 409);
		this.name = "LessonConflictError";
	}
}
