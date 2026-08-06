import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../../generated/prisma/client";

const pool = new pg.Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgresql://postgres:postgres@localhost:5432/watchpoint",
});
const adapter = new PrismaPg(pool);
export const db = new PrismaClient({ adapter });
