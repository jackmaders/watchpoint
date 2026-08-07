import { $ } from "bun";

try {
	const result =
		await $`bunx prisma migrate diff --from-schema prisma/schema.prisma --to-migrations prisma/migrations --exit-code`.nothrow();

	if (result.exitCode !== 0) {
		console.error(
			"❌ Schema drift detected! You have changes in prisma/schema.prisma that are not reflected in a migration script.\nPlease run 'bun run db:migrate:new' locally and commit the generated migration files.",
		);
		process.exit(1);
	}

	console.log("✅ Database schema is in sync with migration history.");
} catch {
	console.error("❌ Failed to check database schema drift.");
	process.exit(1);
}
