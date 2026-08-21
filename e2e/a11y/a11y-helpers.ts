import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";
import {
	checkWaiverFile,
	type RouteAccessibilityWaiver,
} from "../../scripts/check-accessibility-waivers";

export interface AxeAuditOptions {
	route: string;
	state: string;
	waivers?: RouteAccessibilityWaiver[];
}

export function loadActiveWaivers(): RouteAccessibilityWaiver[] {
	const defaultPath = resolve(process.cwd(), "e2e/accessibility-waivers.json");
	return checkWaiverFile(defaultPath).waivers;
}

export async function checkRouteAccessibility(
	page: Page,
	options: AxeAuditOptions,
) {
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
		.analyze();

	const waivers = options.waivers ?? loadActiveWaivers();
	const activeWaivers = waivers.filter(
		(w) =>
			w.route === options.route &&
			(w.state === options.state || w.state === "*"),
	);

	const waivedRuleIds = new Set(activeWaivers.map((w) => w.ruleId));
	const unhandledViolations = results.violations.filter(
		(v) => !waivedRuleIds.has(v.id),
	);

	expect(
		unhandledViolations,
		`Accessibility violations found on ${options.route} (${options.state} state):\n` +
			JSON.stringify(unhandledViolations, null, 2),
	).toEqual([]);
}

export async function assertNoHorizontalOverflow(page: Page) {
	const overflowInfo = await page.evaluate(() => {
		const doc = document.documentElement;
		const body = document.body;
		const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
		const clientWidth = Math.max(doc.clientWidth, body.clientWidth);
		return {
			clientWidth,
			hasOverflow: scrollWidth > clientWidth + 1, // allow 1px rounding buffer
			scrollWidth,
		};
	});

	expect(
		overflowInfo.hasOverflow,
		`Horizontal overflow detected: scrollWidth (${overflowInfo.scrollWidth}px) exceeds clientWidth (${overflowInfo.clientWidth}px)`,
	).toBe(false);
}

export async function assertControlReachability(locator: Locator) {
	await expect(locator).toBeVisible();
	const box = await locator.boundingBox();
	expect(box).not.toBeNull();
	if (box) {
		expect(box.width).toBeGreaterThan(0);
		expect(box.height).toBeGreaterThan(0);
	}
}

export async function assertVisibleFocus(locator: Locator) {
	await locator.focus();
	const isFocused = await locator.evaluate(
		(element) =>
			document.activeElement === element ||
			element.contains(document.activeElement),
	);
	expect(isFocused).toBe(true);

	const focusStyles = await locator.evaluate((element) => {
		const style = window.getComputedStyle(element);
		return {
			boxShadow: style.boxShadow,
			outlineColor: style.outlineColor,
			outlineStyle: style.outlineStyle,
			outlineWidth: style.outlineWidth,
		};
	});

	const hasOutline =
		focusStyles.outlineStyle !== "none" &&
		focusStyles.outlineWidth !== "0px" &&
		focusStyles.outlineWidth !== "";

	const hasBoxShadow =
		focusStyles.boxShadow !== "none" &&
		focusStyles.boxShadow !== "" &&
		!focusStyles.boxShadow.includes("0px 0px 0px 0px");

	expect(
		hasOutline || hasBoxShadow,
		`Element does not show visible focus outline or focus shadow: ${JSON.stringify(focusStyles)}`,
	).toBe(true);
}

export async function assertModalFocusTrapping(
	page: Page,
	dialogLocator: Locator,
) {
	await expect(dialogLocator).toBeVisible();
	const initialFocusInDialog = await dialogLocator.evaluate((dialog) =>
		dialog.contains(document.activeElement),
	);
	expect(
		initialFocusInDialog,
		"Active element should be within dialog on open",
	).toBe(true);

	// Tab through multiple controls and verify focus remains trapped in the modal
	for (let i = 0; i < 5; i++) {
		await page.keyboard.press("Tab");
		const inDialog = await dialogLocator.evaluate((dialog) =>
			dialog.contains(document.activeElement),
		);
		expect(inDialog, "Focus escaped dialog during Tab navigation").toBe(true);
	}

	// Press Escape and verify dialog dismisses
	await page.keyboard.press("Escape");
	await expect(dialogLocator).toBeHidden();
}
