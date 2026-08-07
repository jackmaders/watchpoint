import { file, write } from "bun";

const filePath = "cloudflare-env.d.ts";
const referenceHeader = '/// <reference types="@cloudflare/workers-types" />';

try {
	const target = file(filePath);
	const content = await target.text();
	if (!content.includes(referenceHeader)) {
		await write(filePath, `${referenceHeader}\n\n${content}`);
	}
} catch (error) {
	console.error("❌ Failed to patch cloudflare-env.d.ts:", error);
	process.exit(1);
}
