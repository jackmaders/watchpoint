export class ServerFunctionError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ServerFunctionError";
		this.status = status;
	}
}
