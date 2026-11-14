import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeAll } from "vite-plus/test";

import { todos } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { rateLimit, user } from "@/shared/db/schema";

const testEnv = env as unknown as {
  IMAGES: R2Bucket;
  TEST_MIGRATIONS?: D1Migration[];
};

beforeAll(async () => {
  await applyD1Migrations(env.DB, testEnv.TEST_MIGRATIONS ?? []);
});

async function clearImages() {
  const listed = await testEnv.IMAGES.list();
  if (listed.objects.length > 0) {
    await testEnv.IMAGES.delete(listed.objects.map((obj) => obj.key));
  }
}

afterEach(async () => {
  const db = getDb(env.DB);
  await Promise.all([db.delete(todos), db.delete(user), db.delete(rateLimit), clearImages()]);
});
