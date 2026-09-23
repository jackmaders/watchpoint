import type { RolldownOptions } from "rolldown";

export const rolldownOptions: RolldownOptions = {
	output: {
		codeSplitting: {
			groups: [
				{ name: "posthog", test: /node_modules\/posthog-js/ },
				{ name: "zod", test: /node_modules\/zod/ },
			],
		},
	},
};
