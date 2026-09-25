import { ServerFunctionError } from "@/shared/errors";

export class LessonError extends ServerFunctionError {
	constructor(message: string, status: number) {
		super(message, status);
		this.name = "LessonError";
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
