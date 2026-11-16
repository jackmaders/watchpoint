import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const baseURL = "http://localhost:4194";
const outputDir = "docs/reviews/evidence/implementation";
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const findings = [];

function contrast(first, second) {
  const luminance = (color) => {
    const channels = color.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return Number(((values[0] + 0.05) / (values[1] + 0.05)).toFixed(2));
}

async function captureField(label, selector, mode) {
  await page.screenshot({
    path: `${outputDir}/${label}.png`,
    fullPage: true,
    animations: "disabled",
  });
  const value = await page.locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    const placeholder = getComputedStyle(element, "::placeholder").color;
    const surface = getComputedStyle(
      element.closest("[data-slot='card'], [role='dialog']"),
    ).backgroundColor;
    const context = document.createElement("canvas").getContext("2d");
    const rgba = (value) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const surfaceRgba = rgba(surface);
    const fillRgba = rgba(style.backgroundColor);
    const effectiveFill = fillRgba.map((value, index) =>
      index < 3
        ? Math.round((value * fillRgba[3]) / 255 + surfaceRgba[index] * (1 - fillRgba[3] / 255))
        : 255,
    );
    const borderRgba = rgba(style.borderColor);
    const effectiveBorder = borderRgba.map((value, index) =>
      index < 3
        ? Math.round((value * borderRgba[3]) / 255 + surfaceRgba[index] * (1 - borderRgba[3] / 255))
        : 255,
    );
    return {
      color: style.color,
      placeholder,
      background: style.backgroundColor,
      surface,
      effectiveFill,
      border: style.borderColor,
      effectiveBorder,
    };
  });
  const rgb = (value) =>
    value
      .match(/[\d.]+/gu)
      .slice(0, 3)
      .map(Number);
  const foreground = rgb(value.placeholder);
  const surface = rgb(value.surface);
  findings.push({
    label,
    mode,
    ...value,
    placeholderContrastVsSurface: contrast(foreground, surface),
    placeholderContrastVsEffectiveFill: contrast(foreground, value.effectiveFill.slice(0, 3)),
    borderContrastVsSurface: contrast(value.effectiveBorder.slice(0, 3), surface),
  });
}

for (const mode of ["light", "dark"]) {
  await page.goto(baseURL);
  await page.waitForFunction(() => document.body.dataset.hydrated === "true");
  await page.evaluate(
    (dark) => document.documentElement.classList.toggle("dark", dark),
    mode === "dark",
  );
  console.log(
    JSON.stringify({ mode, url: page.url(), body: await page.locator("body").innerText() }),
  );
  await page.getByRole("tab", { name: "Sign Up" }).click();
  await page.getByLabel("Name").fill("Invalid State Probe");
  await page.getByLabel("Email").fill(`invalid-card-${mode}-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("main").getByRole("button", { name: "Create account" }).click();
  await page.locator("main [data-slot='field-error']").waitFor();
  await captureField(`${mode}-invalid-card-final`, 'main input[aria-invalid="true"]', mode);

  await page
    .getByRole("banner")
    .getByRole("button", { name: /^sign up$/i })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sign Up" });
  await dialog.getByLabel("Name").fill("Invalid Overlay Probe");
  await dialog.getByLabel("Email").fill(`invalid-modal-${mode}-${crypto.randomUUID()}@example.com`);
  await dialog.getByLabel("Password").fill("short");
  await dialog.getByRole("button", { name: "Create account" }).click();
  await dialog.locator('[data-slot="field-error"]').waitFor();
  await captureField(
    `${mode}-invalid-modal-final`,
    '[role="dialog"] input[aria-invalid="true"]',
    mode,
  );
  await page.keyboard.press("Escape");

  await writeFile(
    `${outputDir}/invalid-state-probe.json`,
    `${JSON.stringify(findings, null, 2)}\n`,
  );
}

await writeFile(`${outputDir}/invalid-state-probe.json`, `${JSON.stringify(findings, null, 2)}\n`);
await browser.close();
