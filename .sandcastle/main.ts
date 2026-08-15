import { orchestrateSandcastle, parseCliArgs } from "./index";

const args = parseCliArgs(process.argv.slice(2));

await orchestrateSandcastle(
	{ args },
	{
		logger: (msg) => {
			console.log(`[Sandcastle] ${msg}`);
		},
	},
);
