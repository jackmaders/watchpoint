import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vite-plus/test";

import { getDb } from "../../index.server";
import { user } from "../../schema";

describe("database client initialization", () => {
  it("initializes a drizzle client using the default workerd env.DB binding and executes a query", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb();

    // Act
    const result = await db.all<{ value: number }>(sql`SELECT 1 AS value;`);

    // Assert
    expect(db.$client).toBe(env.DB);
    expect(result).toStrictEqual([{ value: 1 }]);
  });

  it("initializes a drizzle client using an explicitly provided D1 binding and executes a query", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const result = await db.all<{ value: number }>(sql`SELECT 2 AS value;`);

    // Assert
    expect(db.$client).toBe(env.DB);
    expect(result).toStrictEqual([{ value: 2 }]);
  });

  it("persists user role with default user and supports admin role", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    const defaultUserId = crypto.randomUUID();
    const adminUserId = crypto.randomUUID();

    // Act
    await db.insert(user).values([
      { email: "default-role@example.com", id: defaultUserId, name: "Default User" },
      { email: "admin-role@example.com", id: adminUserId, name: "Admin User", role: "admin" },
    ]);
    const [defaultUser] = await db.select().from(user).where(eq(user.id, defaultUserId));
    const [adminUser] = await db.select().from(user).where(eq(user.id, adminUserId));

    // Assert
    expect(defaultUser?.role).toBe("user");
    expect(adminUser?.role).toBe("admin");
  });
});
