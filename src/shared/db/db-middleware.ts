import { createMiddleware } from "@tanstack/react-start";
import { getDb } from "./db.server";

export const dbMiddleware = createMiddleware({ type: "function" }).server(
	({ next }) => next({ context: { db: getDb() } }),
);
