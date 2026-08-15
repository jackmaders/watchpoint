import { orchestrateSandcastle, parseCliArgs } from "../src/shared/sandcastle";

const args = parseCliArgs(process.argv.slice(2));

await orchestrateSandcastle(
	{ args },
	{
		logger: (msg) => {
			console.log(`[Sandcastle] ${msg}`);
		},
	},
);
