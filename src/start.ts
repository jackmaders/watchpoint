import { createIsomorphicFn, createStart } from "@tanstack/react-start";
import { sentryRequestMiddleware } from "@/shared/observability/index.server";

const getRequestMiddleware = createIsomorphicFn()
	.client(() => [])
	.server(() => [sentryRequestMiddleware]);

export const startInstance = createStart(() => ({
	requestMiddleware: getRequestMiddleware(),
}));
