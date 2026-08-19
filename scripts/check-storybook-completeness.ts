import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface AccessibilityWaiver {
	expires: string;
	issue: string;
	owner: string;
	reason: string;
	ruleId: string;
	story: string;
}

const waiverFields = [
	"story",
	"ruleId",
	"reason",
	"owner",
	"issue",
	"expires",
] as const;

function validateWaiver(value: unknown, index: number, now: Date): string[] {
	if (!value || typeof value !== "object")
		return [`waiver ${index + 1} must be an object`];
	const waiver = value as Partial<AccessibilityWaiver>;
	const errors = waiverFields
		.filter(
			(field) =>
				typeof waiver[field] !== "string" || waiver[field].trim() === "",
		)
		.map((field) => `waiver ${index + 1} is missing ${field}`);
	if (typeof waiver.expires === "string") {
		const expiry = new Date(`${waiver.expires}T23:59:59.999Z`);
		if (Number.isNaN(expiry.valueOf()))
			errors.push(`waiver ${index + 1} has an invalid expiry date`);
		else if (expiry < now) errors.push(`waiver ${index + 1} has expired`);
	}
	if (
		typeof waiver.issue === "string" &&
		!/^https:\/\/github\.com\/jackmaders\/watchpoint\/issues\/\d+$/.test(
			waiver.issue,
		)
	) {
		errors.push(`waiver ${index + 1} must link to a Watchpoint issue`);
	}
	return errors;
}

export function validateWaivers(value: unknown, now = new Date()): string[] {
	if (
		!value ||
		typeof value !== "object" ||
		!Array.isArray((value as { waivers?: unknown }).waivers)
	) {
		return ["waiver file must contain a waivers array"];
	}
	return (value as { waivers: unknown[] }).waivers.flatMap((waiver, index) =>
		validateWaiver(waiver, index, now),
	);
}

export function checkCompleteness(root = process.cwd()): string[] {
	const uiRoot = join(root, "src/shared/ui");
	const storyRoot = join(uiRoot, "__stories__");
	const surface = readFileSync(join(uiRoot, "index.ts"), "utf8");
	const stories = readdirSync(storyRoot).filter((file) =>
		file.endsWith(".stories.tsx"),
	);
	const errors = validateVisualStories(surface, stories, storyRoot);
	errors.push(...validateStoryMetadata(stories, storyRoot, root));
	const waiverPath = join(root, "storybook/accessibility-waivers.json");
	if (existsSync(waiverPath))
		errors.push(
			...validateWaivers(JSON.parse(readFileSync(waiverPath, "utf8"))),
		);
	return errors;
}

function validateVisualStories(
	surface: string,
	stories: string[],
	storyRoot: string,
): string[] {
	const visualExports = [...surface.matchAll(/export \{([^}]+)\}/g)]
		.flatMap((match) =>
			match[1].split(",").map((item) => item.trim().split(" as ")[0]),
		)
		.filter(
			(name) => /^[A-Z][A-Za-z0-9]*$/.test(name) && name !== "buttonVariants",
		);
	return visualExports.flatMap((component) => {
		const matching = stories.filter((file) =>
			readFileSync(join(storyRoot, file), "utf8").includes(
				`component: ${component}`,
			),
		);
		if (matching.length === 0)
			return [`visual export ${component} has no matching story`];
		return matching.flatMap((file) => {
			const source = readFileSync(join(storyRoot, file), "utf8");
			const errors: string[] = [];
			if (!source.includes(`title: "Shared UI / ${component}"`))
				errors.push(`${file} must be grouped under Shared UI / ${component}`);
			if (!/export const Default\s*:\s*Story/.test(source))
				errors.push(`${file} must expose a Default story`);
			return errors;
		});
	});
}

function validateStoryMetadata(
	stories: string[],
	storyRoot: string,
	root: string,
): string[] {
	return stories.flatMap((story) => {
		const source = readFileSync(join(storyRoot, story), "utf8");
		return /export default meta;/.test(source) && /satisfies Meta</.test(source)
			? []
			: [
					`${relative(root, join(storyRoot, story))} has invalid typed metadata`,
				];
	});
}

if (import.meta.main) {
	const errors = checkCompleteness();
	if (errors.length > 0) {
		console.error(errors.join("\n"));
		process.exit(1);
	}
	console.log("Storybook completeness check passed.");
}
