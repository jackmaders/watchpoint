export const PERF_METRICS = ["lcp", "inp", "cls", "fcp", "tbt"] as const;

export type PerfMetric = (typeof PERF_METRICS)[number];

export const DEFAULT_PERF_BUDGETS: Record<PerfMetric, number> = {
	cls: 0.1,
	fcp: 1800,
	inp: 200,
	lcp: 2500,
	tbt: 200,
};

export interface PerfBudgetException {
	budgetLimit: number;
	expiresAt: string;
	issueUrl: string;
	justification: string;
	metric: PerfMetric;
	owner: string;
	route: string;
}

export interface PerfExceptionsPayload {
	exceptions: PerfBudgetException[];
}

const ISSUE_URL_PATTERN =
	/^https:\/\/github\.com\/jackmaders\/watchpoint\/issues\/\d+$/;
const EXPIRY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validatePerfExceptions(
	value: unknown,
	now = new Date(),
): string[] {
	if (
		!value ||
		typeof value !== "object" ||
		!Array.isArray((value as { exceptions?: unknown }).exceptions)
	) {
		return ["exception file must contain an exceptions array"];
	}

	const exceptions = (value as { exceptions: unknown[] }).exceptions;
	return exceptions.flatMap((item, index) =>
		validateSingleException(item, index, now),
	);
}

function validateRequiredStrings(
	exception: Partial<PerfBudgetException>,
	index: number,
): string[] {
	const stringFields: Array<keyof PerfBudgetException> = [
		"route",
		"owner",
		"justification",
	];
	return stringFields
		.filter(
			(field) =>
				typeof exception[field] !== "string" ||
				(exception[field] as string).trim() === "",
		)
		.map((field) => `exception ${index + 1} is missing ${field}`);
}

function validateMetricAndBudget(
	exception: Partial<PerfBudgetException>,
	index: number,
): string[] {
	const errors: string[] = [];
	if (
		!exception.metric ||
		!PERF_METRICS.includes(exception.metric as PerfMetric)
	) {
		errors.push(
			`exception ${index + 1} must have a valid metric (${PERF_METRICS.join(", ")})`,
		);
	}
	if (
		typeof exception.budgetLimit !== "number" ||
		Number.isNaN(exception.budgetLimit) ||
		exception.budgetLimit <= 0
	) {
		errors.push(
			`exception ${index + 1} must have a positive budgetLimit number`,
		);
	}
	return errors;
}

function validateIssueUrl(
	exception: Partial<PerfBudgetException>,
	index: number,
): string[] {
	if (
		typeof exception.issueUrl !== "string" ||
		!ISSUE_URL_PATTERN.test(exception.issueUrl.trim())
	) {
		return [
			`exception ${index + 1} must link to a Watchpoint issue (https://github.com/jackmaders/watchpoint/issues/<number>)`,
		];
	}
	return [];
}

export function parseExpiryDate(expiresAt: string): Date | null {
	const match = EXPIRY_PATTERN.exec(expiresAt);
	if (!match) return null;
	const expiryDate = new Date(`${expiresAt}T23:59:59.999Z`);
	if (Number.isNaN(expiryDate.getTime())) return null;
	return expiryDate;
}

function validateExpiryDate(
	exception: Partial<PerfBudgetException>,
	index: number,
	now: Date,
): string[] {
	if (typeof exception.expiresAt !== "string") {
		return [`exception ${index + 1} is missing expiresAt`];
	}
	const expiryDate = parseExpiryDate(exception.expiresAt);
	if (!expiryDate) {
		return [
			`exception ${index + 1} has an invalid expiry date format (expected YYYY-MM-DD)`,
		];
	}
	if (expiryDate.getTime() < now.getTime()) {
		return [`exception ${index + 1} has expired`];
	}
	return [];
}

function validateSingleException(
	value: unknown,
	index: number,
	now: Date,
): string[] {
	if (!value || typeof value !== "object") {
		return [`exception ${index + 1} must be an object`];
	}

	const exception = value as Partial<PerfBudgetException>;
	return [
		...validateRequiredStrings(exception, index),
		...validateMetricAndBudget(exception, index),
		...validateIssueUrl(exception, index),
		...validateExpiryDate(exception, index, now),
	];
}

export interface EvaluateMetricBudgetOptions {
	exceptions?: readonly PerfBudgetException[];
	metric: PerfMetric;
	now?: Date;
	route: string;
	value: number;
}

export interface MetricEvaluationResult {
	appliedException: PerfBudgetException | null;
	budgetLimit: number;
	metric: PerfMetric;
	passed: boolean;
	route: string;
	value: number;
}

export function isExceptionActive(
	exception: PerfBudgetException,
	now: Date,
): boolean {
	const expiryDate = parseExpiryDate(exception.expiresAt);
	if (!expiryDate) return false;
	return expiryDate.getTime() >= now.getTime();
}

export function evaluateMetricBudget(
	options: EvaluateMetricBudgetOptions,
): MetricEvaluationResult {
	const { exceptions = [], metric, now = new Date(), route, value } = options;

	const matchingException = exceptions.find(
		(ex) =>
			ex.route === route && ex.metric === metric && isExceptionActive(ex, now),
	);

	const defaultBudget = DEFAULT_PERF_BUDGETS[metric];
	const budgetLimit = matchingException
		? matchingException.budgetLimit
		: defaultBudget;

	const passed = value <= budgetLimit;

	return {
		appliedException: matchingException ?? null,
		budgetLimit,
		metric,
		passed,
		route,
		value,
	};
}
