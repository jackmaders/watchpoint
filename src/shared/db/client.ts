import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../../../generated/prisma/client";

const adapter = new PrismaD1(process.env.DB);

export const prisma = globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
