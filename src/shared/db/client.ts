import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createDefaultPrismaClient(): PrismaClient {
	const url = process.env.DATABASE_URL || "file:./dev.db";
	const adapter = new PrismaLibSql({ url });
	return new PrismaClient({ adapter });
}

export function createD1PrismaClient(d1: D1Database): PrismaClient {
	const adapter = new PrismaD1(d1);
	return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createDefaultPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
