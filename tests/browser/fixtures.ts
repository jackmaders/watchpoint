import { test as base, expect } from "@playwright/test";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";

import { seedVods } from "@/shared/db/seed";

const HTTP_OK = 200;
const SEED_TIMEOUT_MS = 15_000;
const THUMBNAIL_STUB_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"></svg>';

const IGNORED_WARNINGS = [
  // Firefox internal layout engine warning triggered during client navigation / stylesheet eval
  "Layout was forced before the page was fully loaded",
];

interface BrowserDiagnostics {
  readonly problems: readonly string[];
}

function isDatabaseBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message.includes("SQLITE_BUSY") || error.message.includes("database is locked")) {
    return true;
  }

  return isDatabaseBusyError(error.cause);
}

async function trySeedVods(db: Parameters<typeof seedVods>[0]): Promise<boolean> {
  try {
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
    async ({ playwright }, use) => {
      void playwright;
      const proxy = await getPlatformProxy<{ DB: D1Database }>({
        environment: "preview",
      });
      try {
        const db = drizzle(proxy.env.DB);
        await expect
          .poll(async () => await trySeedVods(db), { timeout: SEED_TIMEOUT_MS })
          .toBe(true);
      } finally {
        await proxy.dispose();
      }
      await use(null);
    },
    { auto: true, scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
export { test };
export type { BrowserDiagnostics };
