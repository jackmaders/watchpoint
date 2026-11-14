import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

import { getDb } from "../db/index.server";
import { account, rateLimit, session, user, userRoles, verification } from "../db/schema";

const auth = betterAuth({
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema: { account, rateLimit, session, user, verification },
  }),
  emailAndPassword: { enabled: true },
  plugins: [tanstackStartCookies()],
  rateLimit: {
    storage: "database",
  },
  secret: env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      role: {
        defaultValue: "user",
        input: false,
        required: true,
        type: userRoles,
      },
    },
  },
});

export { auth };
