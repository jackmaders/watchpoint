import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export { account, session, user, verification } from "./auth-schema";

export const posts = sqliteTable("posts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
});
