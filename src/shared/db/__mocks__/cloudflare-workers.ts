export const env = {
	DB: {
		batch: async () => [],
		dump: async () => new ArrayBuffer(0),
		exec: async () => ({ count: 0, duration: 0 }),
		prepare: () => ({
			bind: () => ({
				all: async () => ({ results: [] }),
				first: async () => null,
				raw: async () => [],
				run: async () => ({ success: true }),
			}),
		}),
	},
};
