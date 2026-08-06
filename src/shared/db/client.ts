import type { D1Database } from "@cloudflare/workers-types";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient;
	DB: D1Database;
};

const d1 = globalForPrisma.DB;

const adapter = new PrismaD1(d1);
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
