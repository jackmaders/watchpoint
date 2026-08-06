import { PrismaClient } from "../../../generated/prisma/client";

export function createMockAdapter() {
	return {
		adapterName: "@prisma/adapter-d1" as const,
		async executeRaw() {
			return 0;
		},
		provider: "sqlite" as const,
		async queryRaw() {
			return { rows: [] };
		},
	};
}

export function createDbClient(d1Instance?: unknown) {
	const d1 =
		d1Instance ??
		(globalThis as unknown as { env?: { DB?: unknown } })?.env?.DB;

	const adapter = createMockAdapter();
	if (d1) {
		return new PrismaClient({ adapter: adapter as never });
	}

	return new PrismaClient({ adapter: adapter as never });
}

export const db = createDbClient();
