import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { serverErrorMiddleware } from "@/shared/errors";

const csrfMiddleware = createCsrfMiddleware({
	filter: (context) => context.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware],
	functionMiddleware: [serverErrorMiddleware],
}));
