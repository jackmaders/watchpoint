import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { reportServerError } from "./report-server-error";
import { ServerFunctionError } from "./server-function-error";

export const serverErrorMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next, serverFnMeta }) => {
	try {
		return await next();
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}

		if (isNotFound(error)) {
			throw error;
		}

		if (error instanceof ServerFunctionError) {
			setResponseStatus(error.status, error.message);
		}
		reportServerError(error, serverFnMeta.name);

		throw error;
	}
});
