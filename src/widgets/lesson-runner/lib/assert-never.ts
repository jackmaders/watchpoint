export function assertNever(value: never): never {
	throw new Error(`Unknown Lesson Runner transition: ${String(value)}`);
}
