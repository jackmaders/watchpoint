import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import pg from "pg";
import { PrismaClient } from "../../../generated/prisma/client";

const pool = new pg.Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgresql://postgres:postgres@localhost:5432/watchpoint",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
	},
});
