import { $ } from "bun";

try {
	await $`bun run prisma generate`;
	const result = await $`git diff --exit-code -- generated/prisma`.nothrow();

	if (result.exitCode !== 0) {
		console.error(
			"❌ Prisma generated client is out of sync! You have changes in prisma/schema.prisma that are not reflected in generated/prisma.\nPlease run 'bun run prisma generate' locally and commit the updated generated/prisma files.",
		);
		process.exit(1);
	}

	console.log("✅ Prisma generated client is in sync with schema.");
} catch {
	console.error("❌ Failed to verify Prisma Client sync.");
	process.exit(1);
}
