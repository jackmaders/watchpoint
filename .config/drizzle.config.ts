import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/shared/db/schema/*",
	out: "./drizzle",
	dialect: "sqlite",
});
