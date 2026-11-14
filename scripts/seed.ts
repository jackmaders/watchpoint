import { drizzle } from "drizzle-orm/d1";
// oxlint-disable node/no-top-level-await -- CLI entrypoint uses top-level await for clean exit codes on failure.
import { getPlatformProxy } from "wrangler";

import { seedAdmin } from "../src/shared/db/seed";

const seeders = [{ name: "seedAdmin", seeder: seedAdmin }];

const proxy = await getPlatformProxy<{ DB: Parameters<typeof drizzle>[0] }>();

try {
  const db = drizzle(proxy.env.DB);
  await Promise.all(
    seeders.map(async ({ name, seeder }) => {
      // eslint-disable-next-line no-console -- CLI seed script prints step progress to stdout.
      console.log(`Running seeder: ${name}...`);
      await seeder(db);
    }),
  );
  // eslint-disable-next-line no-console -- CLI seed script prints completion status to stdout.
  console.log("Database seeding completed successfully.");
} finally {
  await proxy.dispose();
}
