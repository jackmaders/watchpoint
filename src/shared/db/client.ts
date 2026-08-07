import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { cache } from "react";
import { PrismaClient } from "../../../generated/prisma/client";

const getPrismaClient = cache((): PrismaClient => {
	if (globalThis.prisma) return globalThis.prisma;
	const { env } = getCloudflareContext();
	const adapter = new PrismaD1(env.DB);
	const prisma = new PrismaClient({ adapter });

	if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

	return prisma;
});

export const prisma = getPrismaClient();
