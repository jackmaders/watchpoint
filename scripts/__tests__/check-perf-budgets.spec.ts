import { describe, expect, it } from "vitest";
import {
	calculateMedianMetric,
	type RouteAuditRunMetrics,
	type RouteAuditSummary,
	summarizeRouteMetrics,
} from "../check-perf-budgets";

describe("Performance Budget Audit Summary and Median Calculations", () => {
	it("calculates the median metric correctly for odd and even number of samples", () => {
		// Arrange
		const oddSamples = [2100, 2500, 2300];
		const evenSamples = [100, 200, 300, 400];

		// Act
		const medianOdd = calculateMedianMetric(oddSamples);
		const medianEven = calculateMedianMetric(evenSamples);

		// Assert
		expect(medianOdd).toBe(2300);
		expect(medianEven).toBe(250);
	});

	it("handles decimal precision metrics like CLS accurately", () => {
		// Arrange
		const clsSamples = [0.05, 0.08, 0.02];

		// Act
		const medianCls = calculateMedianMetric(clsSamples);

		// Assert
		expect(medianCls).toBe(0.05);
	});

	it("summarizes multi-pass run metrics into route audit summary evaluated against budgets", () => {
		// Arrange
		const runs: RouteAuditRunMetrics[] = [
			{ cls: 0.02, fcp: 1200, inp: 50, lcp: 2100, tbt: 80 },
			{ cls: 0.04, fcp: 1400, inp: 60, lcp: 2300, tbt: 100 },
			{ cls: 0.03, fcp: 1300, inp: 55, lcp: 2200, tbt: 90 },
		];

		// Act
		const summary: RouteAuditSummary = summarizeRouteMetrics({
			accessState: "public",
			exceptions: [],
			route: "/vods/",
			runs,
		});

		// Assert
		expect(summary.route).toBe("/vods/");
		expect(summary.accessState).toBe("public");
		expect(summary.passed).toBe(true);
		expect(summary.medianMetrics).toEqual({
			cls: 0.03,
			fcp: 1300,
			inp: 55,
			lcp: 2200,
			tbt: 90,
		});
		expect(summary.evaluations).toHaveLength(5);
		expect(summary.evaluations.every((e) => e.passed)).toBe(true);
	});

	it("marks summary as failed when any metric exceeds its budget threshold", () => {
		// Arrange
		const runs: RouteAuditRunMetrics[] = [
			{ cls: 0.02, fcp: 1200, inp: 50, lcp: 2800, tbt: 80 },
			{ cls: 0.04, fcp: 1400, inp: 60, lcp: 3000, tbt: 100 },
			{ cls: 0.03, fcp: 1300, inp: 55, lcp: 2900, tbt: 90 },
		];

		// Act
		const summary = summarizeRouteMetrics({
			accessState: "public",
			exceptions: [],
			route: "/vods/",
			runs,
		});

		// Assert
		expect(summary.passed).toBe(false);
		const lcpEval = summary.evaluations.find((e) => e.metric === "lcp");
		expect(lcpEval?.passed).toBe(false);
		expect(lcpEval?.value).toBe(2900);
	});
});
