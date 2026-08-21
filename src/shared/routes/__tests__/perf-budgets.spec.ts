import { describe, expect, it } from "vitest";
import {
	DEFAULT_PERF_BUDGETS,
	evaluateMetricBudget,
	isExceptionActive,
	type PerfBudgetException,
	validatePerfExceptions,
} from "../perf-budgets";

describe("Performance Budget & Exception Engine", () => {
	it("defines standard performance metric budgets", () => {
		// Arrange
		const expected = {
			cls: 0.1,
			fcp: 1800,
			inp: 200,
			lcp: 2500,
			tbt: 200,
		};

		// Act
		const budgets = DEFAULT_PERF_BUDGETS;

		// Assert
		expect(budgets).toEqual(expected);
	});

	it("passes when metric value is within standard budget", () => {
		// Arrange
		const route = "/vods/";
		const metric = "lcp";
		const value = 2100;
		const exceptions: PerfBudgetException[] = [];

		// Act
		const result = evaluateMetricBudget({
			exceptions,
			metric,
			route,
			value,
		});

		// Assert
		expect(result.passed).toBe(true);
		expect(result.budgetLimit).toBe(2500);
		expect(result.appliedException).toBeNull();
	});

	it("fails when metric value exceeds budget without exception", () => {
		// Arrange
		const route = "/vods/";
		const metric = "lcp";
		const value = 2900;
		const exceptions: PerfBudgetException[] = [];

		// Act
		const result = evaluateMetricBudget({
			exceptions,
			metric,
			route,
			value,
		});

		// Assert
		expect(result.passed).toBe(false);
		expect(result.budgetLimit).toBe(2500);
		expect(result.appliedException).toBeNull();
	});

	it("allows higher limit when a valid exception is active", () => {
		// Arrange
		const now = new Date("2026-08-21T00:00:00Z");
		const route = "/vods/$id/session";
		const metric = "lcp";
		const value = 3200;
		const exceptions: PerfBudgetException[] = [
			{
				budgetLimit: 3500,
				expiresAt: "2026-09-01",
				issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
				justification: "Interactive player video asset hydration overhead",
				metric: "lcp",
				owner: "@jackmaders",
				route: "/vods/$id/session",
			},
		];

		// Act
		const result = evaluateMetricBudget({
			exceptions,
			metric,
			now,
			route,
			value,
		});

		// Assert
		expect(result.passed).toBe(true);
		expect(result.budgetLimit).toBe(3500);
		expect(result.appliedException).not.toBeNull();
	});

	it("fails when metric exceeds even the exception budget limit", () => {
		// Arrange
		const now = new Date("2026-08-21T00:00:00Z");
		const route = "/vods/$id/session";
		const metric = "lcp";
		const value = 3900;
		const exceptions: PerfBudgetException[] = [
			{
				budgetLimit: 3500,
				expiresAt: "2026-09-01",
				issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
				justification: "Interactive player video asset hydration overhead",
				metric: "lcp",
				owner: "@jackmaders",
				route: "/vods/$id/session",
			},
		];

		// Act
		const result = evaluateMetricBudget({
			exceptions,
			metric,
			now,
			route,
			value,
		});

		// Assert
		expect(result.passed).toBe(false);
		expect(result.budgetLimit).toBe(3500);
	});

	it("validates exception files and reports expired or malformed exceptions", () => {
		// Arrange
		const now = new Date("2026-08-21T00:00:00Z");
		const payload = {
			exceptions: [
				{
					budgetLimit: 3500,
					expiresAt: "2026-08-01", // Expired
					issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
					justification: "Hydration overhead",
					metric: "lcp",
					owner: "@jackmaders",
					route: "/vods/$id/session",
				},
				{
					budgetLimit: 300,
					expiresAt: "2026-09-01",
					issueUrl: "https://external.com/issue/1", // Invalid issue link
					justification: "Lag",
					metric: "inp",
					owner: "@jackmaders",
					route: "/vods/",
				},
				{
					budgetLimit: -5, // Invalid budget limit
					expiresAt: "2026-09-01",
					issueUrl: "https://github.com/jackmaders/watchpoint/issues/301",
					justification: "",
					metric: "cls",
					owner: "",
					route: "",
				},
			],
		};

		// Act
		const errors = validatePerfExceptions(payload, now);

		// Assert
		expect(errors).toContain("exception 1 has expired");
		expect(errors).toContain(
			"exception 2 must link to a Watchpoint issue (https://github.com/jackmaders/watchpoint/issues/<number>)",
		);
		expect(errors).toContain("exception 3 is missing route");
		expect(errors).toContain("exception 3 is missing owner");
		expect(errors).toContain("exception 3 is missing justification");
		expect(errors).toContain(
			"exception 3 must have a positive budgetLimit number",
		);
	});

	it("validates non-array or non-object payloads cleanly", () => {
		// Arrange
		const expectedNull = ["exception file must contain an exceptions array"];
		const expectedNonArray = [
			"exception file must contain an exceptions array",
		];
		const expectedNonObject = ["exception 1 must be an object"];

		// Act
		const resultNull = validatePerfExceptions(null);
		const resultNonArray = validatePerfExceptions({ exceptions: "not-array" });
		const resultNonObject = validatePerfExceptions({
			exceptions: ["not-an-object"],
		});

		// Assert
		expect(resultNull).toEqual(expectedNull);
		expect(resultNonArray).toEqual(expectedNonArray);
		expect(resultNonObject).toEqual(expectedNonObject);
	});

	it("validates invalid expiry date formats and missing fields cleanly", () => {
		// Arrange
		const payload = {
			exceptions: [
				{
					budgetLimit: 3500,
					expiresAt: "invalid-date",
					issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
					justification: "Hydration overhead",
					metric: "lcp",
					owner: "@jackmaders",
					route: "/vods/$id/session",
				},
				{
					budgetLimit: 3500,
					expiresAt: "9999-99-99",
					issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
					justification: "Hydration overhead",
					metric: "lcp",
					owner: "@jackmaders",
					route: "/vods/$id/session",
				},
				{
					budgetLimit: 3500,
					issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
					justification: "Hydration overhead",
					metric: "invalid-metric",
					owner: "@jackmaders",
					route: "/vods/$id/session",
				},
			],
		};

		// Act
		const errors = validatePerfExceptions(payload);

		// Assert
		expect(errors).toContain(
			"exception 1 has an invalid expiry date format (expected YYYY-MM-DD)",
		);
		expect(errors).toContain(
			"exception 2 has an invalid expiry date format (expected YYYY-MM-DD)",
		);
		expect(errors).toContain("exception 3 is missing expiresAt");
		expect(errors).toContain(
			"exception 3 must have a valid metric (lcp, inp, cls, fcp, tbt)",
		);
	});

	it("evaluates isExceptionActive for edge cases", () => {
		// Arrange
		const now = new Date("2026-08-21T00:00:00Z");
		const malformedFormat: PerfBudgetException = {
			budgetLimit: 3000,
			expiresAt: "invalid-format",
			issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
			justification: "Test",
			metric: "lcp",
			owner: "@test",
			route: "/",
		};
		const impossibleDate: PerfBudgetException = {
			budgetLimit: 3000,
			expiresAt: "9999-99-99",
			issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
			justification: "Test",
			metric: "lcp",
			owner: "@test",
			route: "/",
		};
		const active: PerfBudgetException = {
			budgetLimit: 3000,
			expiresAt: "2026-09-01",
			issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
			justification: "Test",
			metric: "lcp",
			owner: "@test",
			route: "/",
		};

		// Act
		const malformedActive = isExceptionActive(malformedFormat, now);
		const impossibleActive = isExceptionActive(impossibleDate, now);
		const properlyActive = isExceptionActive(active, now);

		// Assert
		expect(malformedActive).toBe(false);
		expect(impossibleActive).toBe(false);
		expect(properlyActive).toBe(true);
	});

	it("ignores expired exceptions during evaluation", () => {
		// Arrange
		const now = new Date("2026-08-21T00:00:00Z");
		const route = "/vods/$id/session";
		const metric = "lcp";
		const value = 2800;
		const exceptions: PerfBudgetException[] = [
			{
				budgetLimit: 3500,
				expiresAt: "2026-08-01", // Expired
				issueUrl: "https://github.com/jackmaders/watchpoint/issues/300",
				justification: "Expired exception",
				metric: "lcp",
				owner: "@jackmaders",
				route: "/vods/$id/session",
			},
		];

		// Act
		const result = evaluateMetricBudget({
			exceptions,
			metric,
			now,
			route,
			value,
		});

		// Assert
		expect(result.passed).toBe(false);
		expect(result.budgetLimit).toBe(2500); // Fell back to default budget
		expect(result.appliedException).toBeNull();
	});
});
