import type { RolldownOptions } from "rolldown";

export const rolldownOptions: RolldownOptions = {
	output: {
		codeSplitting: {
			groups: [
				{ name: "sentry", test: /node_modules\/@sentry/ },
				{ name: "zod", test: /node_modules\/zod/ },
			],
		},
	},
};
