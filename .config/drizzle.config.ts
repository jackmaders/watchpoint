import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/entities/post/model/post.schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
});
