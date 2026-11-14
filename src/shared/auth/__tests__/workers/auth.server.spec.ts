import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

import { auth } from "@/shared/auth/auth.server";
import { getDb } from "@/shared/db/index.server";
import { account, rateLimit, session, user, verification } from "@/shared/db/schema";

function createSessionRequest(connectingIp: string, forwardedIp?: string) {
  const headers = new Headers({
    "cf-connecting-ip": connectingIp,
  });

  if (typeof forwardedIp === "string" && forwardedIp.length > 0) {
    headers.set("x-forwarded-for", forwardedIp);
  }

  return new Request(`${env.BETTER_AUTH_URL}/api/auth/get-session`, {
    headers,
    method: "GET",
  });
}

function createRateLimitedAuth(maxRequests = 2, windowSeconds = 10) {
  return betterAuth({
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
      customRules: {
        "/get-session": { max: maxRequests, window: windowSeconds },
      },
      enabled: true,
      storage: "database",
    },
    secret: env.BETTER_AUTH_SECRET,
  });
}

describe("auth server worker configuration", () => {
  it("initializes Better Auth with worker bindings", () => {
    expect.assertions(3);

    // Assert
    expect(auth.options.baseURL).toBe(env.BETTER_AUTH_URL);
    expect(auth.options.secret).toBe(env.BETTER_AUTH_SECRET);
    expect(auth.options.emailAndPassword).toStrictEqual({ enabled: true });
  });

  it("configures database rate-limit storage and trusted IP extraction", () => {
    expect.assertions(4);

    // Assert
    expect(auth.options.rateLimit).toMatchObject({
      storage: "database",
    });
    expect(auth.options.advanced.ipAddress.ipAddressHeaders).toStrictEqual(["cf-connecting-ip"]);
    expect(auth.handler).toBeTypeOf("function");
    expect(auth.api.getSession).toBeTypeOf("function");
  });

  it("throttles repeated requests by connecting IP and emits retry header", async () => {
    expect.assertions(3);

    // Arrange
    const clientIp = "198.51.100.42";
    const testAuth = createRateLimitedAuth();

    // Act
    await testAuth.handler(createSessionRequest(clientIp));
    await testAuth.handler(createSessionRequest(clientIp));
    const throttledResponse = await testAuth.handler(createSessionRequest(clientIp));

    // Assert
    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.headers.get("x-retry-after")).toBeDefined();
    expect(Number(throttledResponse.headers.get("x-retry-after"))).toBeGreaterThan(0);
  });

  it("shares throttling state across separate auth instances using the same backing store", async () => {
    expect.assertions(1);

    // Arrange
    const clientIp = "198.51.100.43";
    const firstInstance = createRateLimitedAuth();
    const secondInstance = createRateLimitedAuth();

    // Act
    await firstInstance.handler(createSessionRequest(clientIp));
    await firstInstance.handler(createSessionRequest(clientIp));
    const responseFromSecondInstance = await secondInstance.handler(createSessionRequest(clientIp));

    // Assert
    expect(responseFromSecondInstance.status).toBe(429);
  });

  it("extracts client IP using trusted cf-connecting-ip instead of spoofed headers", async () => {
    expect.assertions(2);

    // Arrange
    const testAuth = createRateLimitedAuth();

    // Act
    await testAuth.handler(createSessionRequest("198.51.100.50", "203.0.113.199"));
    await testAuth.handler(createSessionRequest("198.51.100.50", "203.0.113.199"));
    const throttledSameConnectingIp = await testAuth.handler(
      createSessionRequest("198.51.100.50", "203.0.113.199"),
    );
    const allowedDifferentConnectingIp = await testAuth.handler(
      createSessionRequest("198.51.100.51", "203.0.113.199"),
    );

    // Assert
    expect(throttledSameConnectingIp.status).toBe(429);
    expect(allowedDifferentConnectingIp.status).toBe(200);
  });
});
