import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const TITLE_MAX_LENGTH = 256;
const DESCRIPTION_MAX_LENGTH = 1024;

const todos = sqliteTable(
  "todos",
  {
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    description: text("description", { length: DESCRIPTION_MAX_LENGTH }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    imageKey: text("image_key"),
    title: text("title", { length: TITLE_MAX_LENGTH }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("todos_user_id_idx").on(table.userId),
    uniqueIndex("todos_user_id_title_unique").on(table.userId, table.title),
  ],
);

type Todo = typeof todos.$inferSelect;

export { todos, type Todo };
