import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface RouteAccessibilityWaiver {
	expires: string;
	issue: string;
	owner: string;
	reason: string;
	route: string;
	ruleId: string;
	state: string;
}

export interface WaiverValidationResult {
	errors: string[];
	isValid: boolean;
	waivers: RouteAccessibilityWaiver[];
}

const waiverFields = [
	"route",
	"state",
	"ruleId",
	"reason",
	"owner",
	"issue",
	"expires",
] as const;

const issueUrlPattern =
	/^https:\/\/github\.com\/jackmaders\/watchpoint\/issues\/\d+$/;
const expiryPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function validateExpiry(expires: string, index: number, now: Date): string[] {
	const match = expiryPattern.exec(expires);
	const expiry = match ? new Date(`${expires}T23:59:59.999Z`) : null;
	if (
		!expiry ||
		Number.isNaN(expiry.valueOf()) ||
		expiry.toISOString().slice(0, 10) !== expires
	) {
		return [`waiver ${index + 1} has an invalid expiry date`];
	}
	return expiry.getTime() < now.getTime()
		? [`waiver ${index + 1} expired on ${expires}`]
		: [];
}

function validateIssue(issue: string, index: number): string[] {
	return issueUrlPattern.test(issue)
		? []
		: [
				`waiver ${index + 1} issue must match https://github.com/jackmaders/watchpoint/issues/<id>`,
			];
}

function validateSingleWaiver(
	item: unknown,
	index: number,
	now: Date,
): { errors: string[]; waiver?: RouteAccessibilityWaiver } {
	if (!item || typeof item !== "object") {
		return { errors: [`waiver ${index + 1} must be an object`] };
	}

	const waiver = item as Partial<RouteAccessibilityWaiver>;
	const missingFields = waiverFields.filter(
		(field) => typeof waiver[field] !== "string" || waiver[field].trim() === "",
	);

	const errors: string[] = [];
	if (missingFields.length > 0) {
		errors.push(
			`waiver ${index + 1} is missing fields: ${missingFields.join(", ")}`,
		);
	}

	if (typeof waiver.expires === "string") {
		errors.push(...validateExpiry(waiver.expires, index, now));
	}

	if (typeof waiver.issue === "string") {
		errors.push(...validateIssue(waiver.issue, index));
	}

	if (errors.length === 0) {
		return { errors: [], waiver: waiver as RouteAccessibilityWaiver };
	}

	return { errors };
}

export function validateRouteAccessibilityWaivers(
	waivers: unknown[],
	now = new Date(),
): WaiverValidationResult {
	const errors: string[] = [];
	const validatedWaivers: RouteAccessibilityWaiver[] = [];

	for (let i = 0; i < waivers.length; i++) {
		const result = validateSingleWaiver(waivers[i], i, now);
		if (result.errors.length > 0) {
			errors.push(...result.errors);
		}
		if (result.waiver) {
			validatedWaivers.push(result.waiver);
		}
	}

	return {
		errors,
		isValid: errors.length === 0,
		waivers: validatedWaivers,
	};
}

export interface CheckWaiverOptions {
	now?: Date;
	readFile?: (path: string) => string;
}

export function checkWaiverFile(
	filePath: string,
	options: CheckWaiverOptions = {},
): WaiverValidationResult {
	const readFile =
		options.readFile ?? ((path: string) => readFileSync(path, "utf-8"));
	const now = options.now ?? new Date();

	try {
		const raw = readFile(filePath);
		const parsed = JSON.parse(raw);
		if (
			!parsed ||
			typeof parsed !== "object" ||
			!Array.isArray(parsed.waivers)
		) {
			return {
				errors: ["Waiver file must contain a top-level 'waivers' array"],
				isValid: false,
				waivers: [],
			};
		}
		return validateRouteAccessibilityWaivers(parsed.waivers, now);
	} catch (error) {
		return {
			errors: [
				`Failed to read waiver file at ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			],
			isValid: false,
			waivers: [],
		};
	}
}

function main() {
	const defaultPath = resolve(process.cwd(), "e2e/accessibility-waivers.json");
	if (!existsSync(defaultPath)) {
		console.error(`Waiver file not found at ${defaultPath}`);
		process.exit(1);
	}

	const result = checkWaiverFile(defaultPath);
	if (!result.isValid) {
		console.error("Accessibility waiver validation failed:");
		for (const err of result.errors) {
			console.error(` - ${err}`);
		}
		process.exit(1);
	}

	console.log(
		`Accessibility waivers verified successfully (${result.waivers.length} active waivers).`,
	);
}

if (import.meta.main) {
	main();
}
