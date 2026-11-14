import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import type { Database } from "../index.server";
import { account, type User, user } from "../schema";

const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = "adminpassword123";
const DEFAULT_ADMIN_NAME = "Admin";

async function createAdminAccount(
  db: Database,
  userId: string,
  hashedPassword: string,
): Promise<void> {
  await db.insert(account).values({
    accountId: userId,
    password: hashedPassword,
    providerId: "credential",
    userId,
  });
}

async function updateExistingAdmin(
  db: Database,
  existingUser: User,
  hashedPassword: string,
): Promise<void> {
  if (existingUser.role !== "admin") {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, existingUser.id));
  }

  const existingAccounts = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, existingUser.id), eq(account.providerId, "credential")));

  const [existingAccount] = existingAccounts;

  if (existingAccount) {
    await db
      .update(account)
      .set({ password: hashedPassword })
      .where(eq(account.id, existingAccount.id));
    return;
  }

  await createAdminAccount(db, existingUser.id, hashedPassword);
}

async function insertNewAdmin(db: Database, hashedPassword: string): Promise<void> {
  const userId = crypto.randomUUID();

  await db.insert(user).values({
    email: DEFAULT_ADMIN_EMAIL,
    id: userId,
    name: DEFAULT_ADMIN_NAME,
    role: "admin",
  });

  await createAdminAccount(db, userId, hashedPassword);
}

async function seedAdmin(db: Database): Promise<void> {
  const [existingUser] = await db.select().from(user).where(eq(user.email, DEFAULT_ADMIN_EMAIL));
  const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  await (existingUser
    ? updateExistingAdmin(db, existingUser, hashedPassword)
    : insertNewAdmin(db, hashedPassword));
}

export { seedAdmin };
