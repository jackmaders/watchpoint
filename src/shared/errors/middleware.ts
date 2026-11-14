import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

import { HttpStatusCodes } from "../lib/http-status-codes";
import { ApplicationError } from "./application-error";
import { logger } from "./logger";

const errorMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error: unknown) {
    if (isRedirect(error) || isNotFound(error)) {
      throw error;
    }

    if (error instanceof ApplicationError) {
      logApplicationError(error);

      throw error;
    }

    logger.error("Unhandled INTERNAL_SERVER_ERROR:", error);
    throw new ApplicationError("INTERNAL_SERVER_ERROR", { cause: error });
  }
});

function logApplicationError(error: ApplicationError) {
  if (error.statusCode < HttpStatusCodes.INTERNAL_SERVER_ERROR) {
    logger.warn(`[${error.code}] ${error.message}`, error.details);
  } else {
    logger.error(`[${error.code}] ${error.message}`, error);
  }
}

export { errorMiddleware };
