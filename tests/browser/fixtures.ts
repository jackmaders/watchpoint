import { test as base, expect } from "@playwright/test";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";

import { checkpoints } from "@/shared/db/schema";
import { seedVods } from "@/shared/db/seed";

const HTTP_OK = 200;
const SEED_TIMEOUT_MS = 15_000;
const SEEDED_CHECKPOINT_COUNT = 12;
const SEEDED_VOD_IDS = [
  "shu-ana-owcs-kr-s3",
  "junbin-winston-owcs-kr-s3",
  "taejong-tracer-owcs-kr-s3",
];
const THUMBNAIL_STUB_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"></svg>';

const IGNORED_WARNINGS = [
  // Firefox internal layout engine warning triggered during client navigation / stylesheet eval
  "Layout was forced before the page was fully loaded",
];

const BUSY_ERROR_PATTERNS = [
  "SQLITE_BUSY",
  "database is locked",
  "Failed to get session commit token",
];

type SeedDatabase = Parameters<typeof seedVods>[0];

interface BrowserDiagnostics {
  readonly problems: readonly string[];
}

function isDatabaseBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (BUSY_ERROR_PATTERNS.some((pattern) => error.message.includes(pattern))) {
    return true;
  }

  return isDatabaseBusyError(error.cause);
}

async function areVodsSeeded(db: SeedDatabase): Promise<boolean> {
  const rows = await db
    .select({ vodId: checkpoints.vodId })
    .from(checkpoints)
    .where(inArray(checkpoints.vodId, SEEDED_VOD_IDS));

  const distinctVodIds = new Set(rows.map((row) => row.vodId));
  return distinctVodIds.size === SEEDED_VOD_IDS.length && rows.length === SEEDED_CHECKPOINT_COUNT;
}

async function tryEnsureVodsSeeded(db: SeedDatabase, shouldSeed: boolean): Promise<boolean> {
  try {
    if (await areVodsSeeded(db)) {
      return true;
    }

    if (!shouldSeed) {
      return false;
    }

    await seedVods(db);
    return true;
  } catch (error) {
    if (isDatabaseBusyError(error)) {
      return false;
    }

    throw error;
  }
}

const test = base.extend<
  {
    browserDiagnostics: BrowserDiagnostics;
  },
  {
    seedPreviewDatabase: null;
  }
>({
  browserDiagnostics: [
    async ({ page }, use, testInfo) => {
      const problems: string[] = [];

      page.on("console", (message) => {
        if (!["warning", "error"].includes(message.type())) {
          return;
        }

        const text = message.text();
        if (IGNORED_WARNINGS.some((pattern) => text.includes(pattern))) {
          return;
        }

        problems.push(`[console.${message.type()}] ${text}`);
      });

      page.on("pageerror", (error) => {
        problems.push(`[pageerror] ${error.message}`);
      });

      await page.route("https://i.ytimg.com/**", async (route) => {
        await route.fulfill({
          body: THUMBNAIL_STUB_SVG,
          contentType: "image/svg+xml",
          status: HTTP_OK,
        });
      });

      await use({ problems });

      if (problems.length > 0) {
        const report = problems.join("\n");
        await testInfo.attach("browser-diagnostics", {
          body: report,
          contentType: "text/plain",
        });

        throw new Error(`Browser warnings or errors detected:\n${report}`);
      }
    },
    { auto: true },
  ],
  seedPreviewDatabase: [
    async ({ playwright }, use, workerInfo) => {
      void playwright;
      if (workerInfo.workerIndex < workerInfo.config.workers) {
        const proxy = await getPlatformProxy<{ DB: D1Database }>({
          environment: "preview",
        });
        try {
          const db = drizzle(proxy.env.DB);
          const shouldSeed = workerInfo.parallelIndex === 0;
          await expect
            .poll(async () => await tryEnsureVodsSeeded(db, shouldSeed), {
              timeout: SEED_TIMEOUT_MS,
            })
            .toBe(true);
        } finally {
          await proxy.dispose();
        }
      }
      await use(null);
    },
    { auto: true, scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
export { test };
export type { BrowserDiagnostics };
