import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

import { YOUTUBE_IFRAME_API_STUB_SCRIPT } from "../../tests/browser/page-objects/youtube-player-stub.ts";

const output = "docs/reviews/evidence/implementation";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4194";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const findings = [];

await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

async function capture(label, preservePointer = false) {
  if (!preservePointer) await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.screenshot({ animations: "disabled", path: `${output}/${label}.png`, fullPage: true });
}

async function inspect(label, selectors) {
  findings.push(
    await page.evaluate(
      ({ label, selectors }) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const painter = canvas.getContext("2d", { willReadFrequently: true });
        const rgba = (value) => {
          painter.clearRect(0, 0, 1, 1);
          painter.fillStyle = value;
          painter.fillRect(0, 0, 1, 1);
          return [...painter.getImageData(0, 0, 1, 1).data];
        };
        const composite = (front, back) =>
          front
            .slice(0, 3)
            .map((channel, index) =>
              Math.round((channel * front[3]) / 255 + back[index] * (1 - front[3] / 255)),
            );
        const luminance = (rgb) =>
          rgb
            .map((channel) => {
              const value = channel / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        const ratio = (front, back) => {
          const a = luminance(front);
          const b = luminance(back);
          return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
        };
        const backgroundFor = (element) => {
          const chain = [];
          for (let node = element; node; node = node.parentElement) chain.unshift(node);
          return chain.reduce(
            (background, node) => {
              const color = rgba(getComputedStyle(node).backgroundColor);
              return color[3] === 255 ? color.slice(0, 3) : composite(color, background);
            },
            [255, 255, 255],
          );
        };
        const bySelector = Object.fromEntries(
          selectors.map((selector) => {
            const element = document.querySelector(selector);
            if (!element) return [selector, { found: false }];
            const style = getComputedStyle(element);
            const background = backgroundFor(element);
            const adjacentBackground = element.parentElement
              ? backgroundFor(element.parentElement)
              : [255, 255, 255];
            const foreground = rgba(style.color);
            const effectiveForeground =
              foreground[3] === 255 ? foreground.slice(0, 3) : composite(foreground, background);
            const border = rgba(style.borderColor);
            const outline = rgba(style.outlineColor);
            const placeholderColor =
              element instanceof HTMLInputElement
                ? getComputedStyle(element, "::placeholder").color
                : null;
            const ancestors = [];
            for (let node = element; node; node = node.parentElement) {
              const ancestorStyle = getComputedStyle(node);
              ancestors.unshift({
                tag: node.tagName.toLowerCase(),
                className: String(node.className).slice(0, 120),
                backgroundColor: ancestorStyle.backgroundColor,
              });
            }
            return [
              selector,
              {
                found: true,
                text: element.textContent?.trim().slice(0, 180),
                color: style.color,
                backgroundColor: style.backgroundColor,
                effectiveBackground: `rgb(${background.join(" ")})`,
                adjacentBackground: `rgb(${adjacentBackground.join(" ")})`,
                fillContrast: ratio(background, adjacentBackground),
                textContrast: ratio(effectiveForeground, background),
                placeholderColor,
                placeholderContrast: placeholderColor
                  ? ratio(rgba(placeholderColor).slice(0, 3), background)
                  : null,
                backgroundLayers: ancestors,
                borderColor: style.borderColor,
                borderContrast:
                  border[3] === 0
                    ? null
                    : ratio(composite(border, adjacentBackground), adjacentBackground),
                borderOnFillContrast:
                  border[3] === 0 ? null : ratio(composite(border, background), background),
                outline: style.outline,
                outlineColor: style.outlineColor,
                outlineContrast:
                  outline[3] === 0
                    ? null
                    : ratio(composite(outline, adjacentBackground), adjacentBackground),
                boxShadow: style.boxShadow,
                disabled: "disabled" in element ? element.disabled : undefined,
                ariaDisabled: element.getAttribute("aria-disabled"),
                ariaLabel: element.getAttribute("aria-label"),
                ariaLive: element.getAttribute("aria-live"),
              },
            ];
          }),
        );
        return {
          label,
          viewport: {
            width: innerWidth,
            height: innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
          },
          mode: document.documentElement.classList.contains("dark") ? "dark" : "light",
          focus: document.activeElement?.outerHTML.slice(0, 400),
          checks: bySelector,
          liveRegions: [
            ...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'),
          ].map((node) => ({
            role: node.getAttribute("role"),
            live: node.getAttribute("aria-live"),
            text: node.textContent?.trim(),
          })),
        };
      },
      { label, selectors },
    ),
  );
}

try {
  for (const mode of ["light", "dark"]) {
    await page.goto(baseURL);
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      mode,
    );
    await page.getByRole("tab", { name: "Sign Up" }).click();
    await page.getByLabel("Email").focus();
    await capture(`${mode}-form`);
    await inspect(`${mode}-form-focused`, [
      "input",
      "[role=tab][aria-selected=true]",
      "button[type=submit]",
    ]);
    await page.getByLabel("Name").fill("Invalid Password Review");
    await page.getByLabel("Email").fill(`invalid-${mode}-${crypto.randomUUID()}@example.com`);
    await page.getByLabel("Password").fill("short");
    await page.getByRole("main").getByRole("button", { name: "Create account" }).click();
    await page
      .getByText("Password must be at least 8 characters", { exact: true })
      .first()
      .waitFor();
    await capture(`${mode}-form-invalid`);
    await inspect(`${mode}-form-invalid`, [
      'input[aria-invalid="true"]',
      '[data-slot="field-error"]',
      "button[type=submit]",
    ]);
    await page.locator("button[type=submit]").hover();
    await capture(`${mode}-form-hover`, true);
    await inspect(`${mode}-form-hover`, ["button[type=submit]"]);
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^sign in$/i })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("dialog").getByLabel("Email").focus();
    await capture(`${mode}-overlay`);
    await inspect(`${mode}-overlay-focused`, [
      '[role="dialog"] input',
      '[role="dialog"] button[type=submit]',
      '[role="dialog"] [data-slot="dialog-description"]',
    ]);
    await page.getByRole("dialog").getByRole("button", { name: "Sign in", exact: true }).hover();
    await capture(`${mode}-overlay-hover`, true);
    await inspect(`${mode}-overlay-hover`, ['[role="dialog"] button[type=submit]']);
    await page.keyboard.press("Escape");

    await page
      .getByRole("banner")
      .getByRole("button", { name: /^sign up$/i })
      .click();
    await page
      .getByRole("dialog", { name: "Sign Up" })
      .getByLabel("Name")
      .fill("Invalid Overlay Review");
    await page
      .getByRole("dialog", { name: "Sign Up" })
      .getByLabel("Email")
      .fill(`invalid-overlay-${mode}-${crypto.randomUUID()}@example.com`);
    await page.getByRole("dialog", { name: "Sign Up" }).getByLabel("Password").fill("short");
    await page
      .getByRole("dialog", { name: "Sign Up" })
      .getByRole("button", { name: "Create account" })
      .click();
    await page
      .getByRole("dialog", { name: "Sign Up" })
      .locator('[data-slot="field-error"]')
      .waitFor();
    await capture(`${mode}-overlay-invalid`);
    await inspect(`${mode}-overlay-invalid`, [
      '[role="dialog"] input[aria-invalid="true"]',
      '[role="dialog"] [data-slot="field-error"]',
    ]);
    await page.keyboard.press("Escape");

    const email = `implementation-${mode}-${crypto.randomUUID()}@example.com`;
    const response = await context.request.post(`${baseURL}/api/auth/sign-up/email`, {
      headers: { Origin: baseURL },
      data: { name: "Implementation Review", email, password: "watchpoint-review-password" },
    });
    if (!response.ok())
      throw new Error(`Signup failed: ${response.status()} ${await response.text()}`);

    await page.goto(`${baseURL}/vods`);
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      mode,
    );
    await page.getByRole("heading", { name: "VOD Catalogue" }).waitFor();
    await capture(`${mode}-catalogue`);
    await inspect(`${mode}-catalogue`, ['input[type="search"]', "select", "a[href*='/vods/']"]);
    await page.getByRole("searchbox").fill("No matching replay");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByText("No matching VODs", { exact: true }).waitFor();
    await capture(`${mode}-catalogue-empty`);
    await inspect(`${mode}-catalogue-empty`, ["h2", "button"]);
    await page.getByRole("searchbox").fill("");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("link").filter({ hasText: "Shu" }).waitFor();

    await page.route("https://www.youtube.com/iframe_api", (route) =>
      route.fulfill({
        body: YOUTUBE_IFRAME_API_STUB_SCRIPT,
        contentType: "text/javascript",
      }),
    );
    await page.getByRole("main").getByRole("link").filter({ hasText: "Shu" }).click();
    await page.waitForFunction(() => globalThis.watchpointYtStub?.getSnapshot()?.isReady);
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      mode,
    );
    await page.getByRole("button", { name: "00:45", exact: true }).click();
    await page.getByRole("group", { name: "Prompt options" }).waitFor();
    await page.getByRole("button", { name: "00:45", exact: true }).hover();
    await capture(`${mode}-selected-pill-hover`, true);
    await inspect(`${mode}-selected-pill-hover`, ['button[aria-pressed="true"]']);
    const firstOption = page.locator('fieldset[aria-label="Prompt options"] button').first();
    await firstOption.hover();
    await capture(`${mode}-prompt-hover`, true);
    await inspect(`${mode}-prompt-hover`, [
      'fieldset[aria-label="Prompt options"] button:first-child',
    ]);
    await firstOption.focus();
    await capture(`${mode}-prompt`);
    await inspect(`${mode}-prompt-focused`, [
      'aside[aria-label="Checkpoint prompt"]',
      '[aria-pressed="true"]',
      'fieldset[aria-label="Prompt options"] button:first-child',
    ]);
    await firstOption.click();
    await capture(`${mode}-feedback`);
    await inspect(`${mode}-feedback`, [
      'aside[aria-label="Checkpoint prompt"]',
      'output[aria-live="polite"]',
      'fieldset[aria-label="Prompt options"] button[aria-pressed="true"]',
      'fieldset[aria-label="Prompt options"] button[aria-disabled="true"]',
    ]);
    await context.clearCookies();
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(baseURL);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const menuTrigger = page.getByRole("button", { name: "Open menu" });
  await menuTrigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: "Navigation" }).waitFor();
  await capture("dark-navigation-320x568");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Navigation" }).waitFor({ state: "hidden" });
  findings.push({
    label: "mobile-navigation-keyboard",
    viewport: { width: 320, height: 568 },
    focusRestored: await menuTrigger.evaluate((node) => node === document.activeElement),
    activeElement: await page.evaluate(() => document.activeElement?.outerHTML),
  });

  for (const mode of ["light", "dark"]) {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(baseURL);
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      mode,
    );
    await page.getByRole("button", { name: "Open menu" }).click();
    await capture(`${mode}-navigation-320x568`);
    await page
      .getByRole("dialog", { name: "Navigation" })
      .getByRole("button", { name: "Sign up", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await capture(`${mode}-signup-overlay-320x568`);
    await inspect(`${mode}-signup-overlay-320x568`, [
      '[role="dialog"] input',
      '[role="dialog"] button[type=submit]',
    ]);
  }

  const responsiveEmail = `implementation-responsive-${crypto.randomUUID()}@example.com`;
  const signupResponse = await context.request.post(`${baseURL}/api/auth/sign-up/email`, {
    headers: { Origin: baseURL },
    data: {
      name: "Responsive Review",
      email: responsiveEmail,
      password: "watchpoint-review-password",
    },
  });
  if (!signupResponse.ok()) {
    throw new Error(
      `Responsive signup failed: ${signupResponse.status()} ${await signupResponse.text()}`,
    );
  }
  for (const mode of ["light", "dark"]) {
    await context.clearCookies();
    await page.goto(baseURL);
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      mode,
    );
    await page.getByLabel("Email").fill(responsiveEmail);
    await page.getByLabel("Password").fill("watchpoint-review-password");
    let releaseRequest;
    let requestArrived;
    const arrived = new Promise((resolve) => {
      requestArrived = resolve;
    });
    const pending = new Promise((resolve) => {
      releaseRequest = resolve;
    });
    await page.route("**/api/auth/sign-in/email", async (route) => {
      requestArrived();
      await pending;
      await route.continue();
    });
    await page.getByRole("main").getByRole("button", { name: "Sign in", exact: true }).click();
    await arrived;
    await page.locator('form button[aria-busy="true"]').waitFor();
    await capture(`${mode}-signin-loading`);
    await inspect(`${mode}-signin-loading`, ['form button[aria-busy="true"]']);
    releaseRequest();
    await page.waitForURL(`${baseURL}/vods`);
    await page.unroute("**/api/auth/sign-in/email");
  }
  await context.clearCookies();
  const requestedVod = `${baseURL}/vods/shu-ana-owcs-kr-s3`;
  await page.goto(requestedVod);
  await page.waitForURL(`${baseURL}/?returnTo=%2Fvods%2Fshu-ana-owcs-kr-s3`);
  await page.getByLabel("Email").fill(responsiveEmail);
  await page.getByLabel("Password").fill("watchpoint-review-password");
  await page.getByRole("main").getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/vods" || url.pathname.startsWith("/vods/"));
  findings.push({
    label: "auth-signin-restores-requested-vod",
    requested: requestedVod,
    actual: page.url(),
    passed: page.url() === requestedVod,
  });

  await context.clearCookies();
  const unsafeReturnTo = `${baseURL}/?returnTo=${encodeURIComponent("https://example.com/account")}`;
  await page.goto(unsafeReturnTo);
  await page.getByLabel("Email").fill(responsiveEmail);
  await page.getByLabel("Password").fill("watchpoint-review-password");
  await page.getByRole("main").getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseURL}/vods`);
  findings.push({ label: "auth-rejects-external-return-to", actual: page.url() });

  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({ body: YOUTUBE_IFRAME_API_STUB_SCRIPT, contentType: "text/javascript" }),
  );
  for (const width of [320, 768, 1024, 1280]) {
    const height = width === 320 ? 568 : 720;
    await page.setViewportSize({ width, height });
    await page.goto(`${baseURL}/vods`);
    await page.waitForFunction(() => document.body.dataset.hydrated === "true");
    await capture(`responsive-catalogue-${width}`);
    findings.push({
      label: `responsive-catalogue-${width}`,
      viewport: { width, height },
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    });
    await page.goto(`${baseURL}/vods/shu-ana-owcs-kr-s3`);
    await page.waitForFunction(() => globalThis.watchpointYtStub?.getSnapshot()?.isReady);
    await page.getByRole("button", { name: "00:45", exact: true }).focus();
    const readAtPlay = await page.evaluate(() => globalThis.watchpointYtStub.play());
    await page.waitForFunction(
      (count) => globalThis.watchpointYtStub.getSnapshot().currentTimeReadCount > count,
      readAtPlay,
    );
    const readAtSeek = await page.evaluate(() => globalThis.watchpointYtStub.setCurrentTime(45));
    await page.waitForFunction(
      (count) => globalThis.watchpointYtStub.getSnapshot().currentTimeReadCount > count,
      readAtSeek,
    );
    await page.getByRole("group", { name: "Prompt options" }).waitFor();
    await capture(`responsive-player-prompt-${width}`);
    findings.push({
      label: `responsive-player-${width}`,
      viewport: { width, height },
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      promptRect: await page
        .locator('aside[aria-label="Checkpoint prompt"]')
        .evaluate((node) => node.getBoundingClientRect().toJSON()),
      focusedControl: await page.evaluate(() => document.activeElement?.textContent?.trim()),
    });
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseURL}/vods`);
  let failedLoaderRequests = 0;
  await page.route("**/_serverFn/**", async (route) => {
    if (failedLoaderRequests === 0) {
      failedLoaderRequests += 1;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.getByRole("searchbox").fill("Transient loader failure");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "This page couldn’t load" }).waitFor();
  await capture("loader-transient-error");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("heading", { name: "VOD Catalogue" }).waitFor();
  await capture("loader-retry-success");
  findings.push({
    label: "loader-transient-retry",
    failedRequests: failedLoaderRequests,
    recovered: await page.getByRole("heading", { name: "VOD Catalogue" }).isVisible(),
    actualURL: page.url(),
  });

  await page.unroute("https://www.youtube.com/iframe_api");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseURL}/vods/shu-ana-owcs-kr-s3`);
  let youtubeApiReady = false;
  try {
    await page.waitForFunction(() => Boolean(globalThis.YT?.Player), undefined, { timeout: 15000 });
    youtubeApiReady = true;
  } catch {
    youtubeApiReady = false;
  }
  await capture("real-youtube-smoke");
  findings.push({
    label: "real-youtube-smoke",
    youtubeApiReady,
    iframes: await page
      .locator("iframe")
      .evaluateAll((frames) =>
        frames.map((frame) => ({ title: frame.title, src: frame.getAttribute("src") })),
      ),
    playerErrors: await page.getByRole("alert").allTextContents(),
  });
} finally {
  await writeFile(`${output}/findings.json`, JSON.stringify(findings, null, 2));
  await context.tracing.stop({ path: `${output}/trace.zip` });
  await browser.close();
}
