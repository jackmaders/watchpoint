import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface AccessibilityWaiver {
	expires: string;
	issue: string;
	owner: string;
	reason: string;
	ruleId: string;
	story: string;
}

export interface CompletenessOptions {
	readFile?: (path: string) => string;
	storyFiles?: string[];
	waiverFile?: string;
}

const NON_VISUAL_EXPORTS = new Set(["buttonVariants"]);
const waiverFields = [
	"story",
	"ruleId",
	"reason",
	"owner",
	"issue",
	"expires",
] as const;
const issueUrlPattern =
	/^https:\/\/github\.com\/jackmaders\/watchpoint\/issues\/\d+$/;
const expiryPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function discoverStoryFiles(storyRoot: string): string[] {
	return readdirSync(storyRoot, { withFileTypes: true }).flatMap(
		(entry: Dirent) => {
			const path = join(storyRoot, entry.name);
			if (entry.isDirectory()) return discoverStoryFiles(path);
			return /\.stories\.(ts|tsx)$/.test(entry.name) ? [path] : [];
		},
	);
}

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
	if (typeof waiver.expires === "string")
		errors.push(...validateExpiry(waiver.expires, index, now));
	if (typeof waiver.issue === "string")
		errors.push(...validateIssue(waiver.issue, index));
	return errors;
}

function validateExpiry(expires: string, index: number, now: Date): string[] {
	const match = expiryPattern.exec(expires);
	const expiry = match ? new Date(`${expires}T23:59:59.999Z`) : null;
	if (
		!expiry ||
		Number.isNaN(expiry.valueOf()) ||
		expiry.toISOString().slice(0, 10) !== expires
	)
		return [`waiver ${index + 1} has an invalid expiry date`];
	return expiry < now ? [`waiver ${index + 1} has expired`] : [];
}

function validateIssue(issue: string, index: number): string[] {
	return issueUrlPattern.test(issue)
		? []
		: [`waiver ${index + 1} must link to a Watchpoint issue`];
}

export function validateWaivers(value: unknown, now = new Date()): string[] {
	if (
		!value ||
		typeof value !== "object" ||
		!Array.isArray((value as { waivers?: unknown }).waivers)
	)
		return ["waiver file must contain a waivers array"];
	return (value as { waivers: unknown[] }).waivers.flatMap((waiver, index) =>
		validateWaiver(waiver, index, now),
	);
}

export function checkCompleteness(
	root = process.cwd(),
	options: CompletenessOptions = {},
): string[] {
	const uiRoot = join(root, "src/shared/ui");
	const readFile =
		options.readFile ?? ((path: string) => readFileSync(path, "utf8"));
	const surface = readFile(join(uiRoot, "index.ts"));
	const storyFiles =
		options.storyFiles ?? discoverStoryFiles(join(uiRoot, "__stories__"));
	const errors = validateVisualStories(surface, storyFiles, readFile, root);
	errors.push(...validateStoryMetadata(storyFiles, readFile, root));
	const waiverPath = join(root, "storybook/accessibility-waivers.json");
	if (options.waiverFile !== undefined) {
		errors.push(...parseWaivers(options.waiverFile));
	} else if (existsSync(waiverPath)) {
		errors.push(...parseWaivers(readFile(waiverPath)));
	}
	return errors;
}

function parseWaivers(source: string): string[] {
	try {
		return validateWaivers(JSON.parse(source));
	} catch {
		return ["accessibility waiver file contains invalid JSON"];
	}
}

function publicValueExports(surface: string): string[] {
	return [...surface.matchAll(/export\s*\{([^}]+)\}/g)]
		.flatMap((match) => match[1].split(","))
		.map((item) => item.trim().split(/\s+as\s+/)[0])
		.filter(
			(name) =>
				/^[A-Z][A-Za-z0-9]*$/.test(name) && !NON_VISUAL_EXPORTS.has(name),
		);
}

function validateVisualStories(
	surface: string,
	storyFiles: string[],
	readFile: (path: string) => string,
	root: string,
): string[] {
	const visualExports = publicValueExports(surface);
	const errors = visualExports.flatMap((component) => {
		const matching = storyFiles.filter(
			(file) => metadataComponent(readFile(file)) === component,
		);
		return matching.length > 0
			? []
			: [`visual export ${component} has no matching story`];
	});
	for (const story of storyFiles) {
		const source = readFile(story);
		const referenced = visualExports.filter(
			(component) => metadataComponent(source) === component,
		);
		if (referenced.length === 0)
			errors.push(
				`${relative(root, story)} must reference a visual shared UI export`,
			);
	}
	return errors;
}

function metadataComponent(source: string): string | undefined {
	const metadata = source.match(
		/const\s+meta\s*=\s*\{([\s\S]*?)\}\s*satisfies\s+Meta\s*</,
	)?.[1];
	return metadata?.match(/\bcomponent\s*:\s*([A-Z][A-Za-z0-9]*)\b/)?.[1];
}

function validateStoryMetadata(
	stories: string[],
	readFile: (path: string) => string,
	root: string,
): string[] {
	return stories.flatMap((story) => {
		const source = readFile(story);
		const path = relative(root, story);
		const errors: string[] = [];
		if (
			!/export\s+default\s+meta\s*;/.test(source) ||
			!/satisfies\s+Meta\s*</.test(source)
		)
			errors.push(`${path} must expose a valid default metadata export`);
		const component = metadataComponent(source);
		if (
			component &&
			!new RegExp(`title\\s*:\\s*["']Shared UI / ${component}["']`).test(source)
		)
			errors.push(`${path} must be grouped under Shared UI / ${component}`);
		if (!/export\s+const\s+Default\s*:\s*Story\b/.test(source))
			errors.push(`${path} must expose a Default story`);
		return errors;
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
