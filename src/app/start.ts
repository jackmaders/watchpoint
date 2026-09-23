import {
	sentryGlobalFunctionMiddleware,
	sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createStart } from "@tanstack/react-start";

createStart(() => ({
	requestMiddleware: [sentryGlobalRequestMiddleware],
	functionMiddleware: [sentryGlobalFunctionMiddleware],
}));
