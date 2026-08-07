import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../../../generated/prisma/client";

const { env } = await getCloudflareContext({ async: true });

const adapter = new PrismaD1(env.DB);

export const prisma = globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
