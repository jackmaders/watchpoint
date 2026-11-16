import { writeFile } from "node:fs/promises";

import { firefox } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4194";
const browser = await firefox.launch();
const context = await browser.newContext({ baseURL });
const page = await context.newPage();
const diagnostics = [];

page.on("console", async (message) => {
  if (message.type() !== "error") return;
  const args = [];
  for (const handle of message.args()) {
    try {
      args.push(
        await handle.evaluate((value) => {
          if (value === null || typeof value !== "object") return value;
          return {
            type: Object.prototype.toString.call(value),
            name: value.name,
            message: value.message,
            stack: value.stack,
            ownKeys: Reflect.ownKeys(value).map(String),
            entries: Object.fromEntries(
              Reflect.ownKeys(value).map((key) => [String(key), String(value[key])]),
            ),
          };
        }),
      );
    } catch (error) {
      args.push({ serializationError: String(error) });
    }
  }
  diagnostics.push({ kind: "console", text: message.text(), args });
});
page.on("pageerror", (error) => {
  diagnostics.push({
    kind: "pageerror",
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
});
page.on("requestfailed", (request) => {
  const failedURL = new URL(request.url());
  const isServerFn = failedURL.pathname.startsWith("/_serverFn/");
  diagnostics.push({
    kind: "requestfailed",
    url: `${failedURL.origin}${isServerFn ? "/_serverFn/[redacted]" : failedURL.pathname}`,
    queryPresent: Boolean(failedURL.search),
    method: request.method(),
    failure: request.failure()?.errorText,
  });
});

const email = `firefox-diagnostic-${globalThis.crypto.randomUUID()}@example.com`;
const response = await context.request.post(`${baseURL}/api/auth/sign-up/email`, {
  headers: { Origin: baseURL },
  data: { name: "Firefox Diagnostic", email, password: "watchpoint-review-password" },
});
if (!response.ok()) throw new Error(`Signup failed: ${response.status()} ${await response.text()}`);

await page.goto(baseURL);
await page
  .getByRole("banner")
  .getByRole("button", { name: "Sign Out", exact: true })
  .first()
  .click();
await page.getByRole("dialog", { name: "Sign out?" }).waitFor();
await page.getByRole("button", { name: "Cancel", exact: true }).click();
await page
  .getByRole("banner")
  .getByRole("button", { name: "Sign Out", exact: true })
  .first()
  .click();
await page.getByRole("dialog").getByRole("button", { name: "Sign Out", exact: true }).click();
await page.getByRole("heading", { name: "Sign in" }).waitFor();
const requestedVod = `${baseURL}/vods/shu-ana-owcs-kr-s3`;
await page.route("https://www.youtube.com/iframe_api", (route) =>
  route.fulfill({ body: "", contentType: "text/javascript" }),
);
await page.goto(requestedVod);
await page.waitForURL(`${baseURL}/?returnTo=%2Fvods%2Fshu-ana-owcs-kr-s3`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill("watchpoint-review-password");
await page.getByLabel("Password").press("Enter");
await page.waitForURL(requestedVod);
await page.waitForTimeout(500);

const result = {
  label: "firefox-signout-signin-diagnostic",
  finalURL: new URL(page.url()).pathname,
  diagnostics,
};
const output = `${JSON.stringify(result, null, 2)}\n`;
await writeFile(
  "docs/reviews/evidence/implementation/firefox-signout-signin-diagnostic.json",
  output,
);
console.log(output);
await browser.close();
