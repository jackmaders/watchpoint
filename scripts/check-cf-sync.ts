import { $, file, write } from "bun";

try {
	const envFile = file(".env");
	if (!(await envFile.exists())) {
		await write(".env", file(".env.example"));
	}

	await $`bun run cf-typegen`;
	const result = await $`git diff --exit-code -- cloudflare-env.d.ts`.nothrow();

	if (result.exitCode !== 0) {
		console.error(
			"❌ Cloudflare types are out of sync! You have changes in wrangler.jsonc or .env.example that are not reflected in cloudflare-env.d.ts.\nPlease run 'bun run cf-typegen' locally and commit the updated cloudflare-env.d.ts file.",
		);
		process.exit(1);
	}

	console.log("✅ Cloudflare types are in sync with wrangler.jsonc.");
} catch {
	console.error("❌ Failed to verify Cloudflare types sync.");
	process.exit(1);
}
