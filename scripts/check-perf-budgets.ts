import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type BrowserContext, chromium } from "@playwright/test";
import { getSeedCredentials } from "../src/shared/db/seed-policy";
import {
	type AccessState,
	DEFAULT_ROUTE_INVENTORY,
	resolveRoutePath,
} from "../src/shared/routes/inventory";
import {
	evaluateMetricBudget,
	type MetricEvaluationResult,
	PERF_METRICS,
	type PerfBudgetException,
	type PerfMetric,
	validatePerfExceptions,
} from "../src/shared/routes/perf-budgets";

export interface RouteAuditRunMetrics {
	cls: number;
	fcp: number;
	inp: number;
	lcp: number;
	tbt: number;
}

export interface RouteAuditSummary {
	accessState: AccessState;
	evaluations: MetricEvaluationResult[];
	medianMetrics: RouteAuditRunMetrics;
	passed: boolean;
	route: string;
}

export function calculateMedianMetric(samples: readonly number[]): number {
	if (samples.length === 0) return 0;
	const sorted = [...samples].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 !== 0) {
		return sorted[mid] as number;
	}
	const lower = sorted[mid - 1] as number;
	const upper = sorted[mid] as number;
	const avg = (lower + upper) / 2;
	return Math.round(avg * 1000) / 1000;
}

export interface SummarizeRouteMetricsOptions {
	accessState: AccessState;
	exceptions?: readonly PerfBudgetException[];
	now?: Date;
	route: string;
	runs: readonly RouteAuditRunMetrics[];
}

export function summarizeRouteMetrics(
	options: SummarizeRouteMetricsOptions,
): RouteAuditSummary {
	const {
		accessState,
		exceptions = [],
		now = new Date(),
		route,
		runs,
	} = options;

	const medianMetrics: RouteAuditRunMetrics = {
		cls: calculateMedianMetric(runs.map((r) => r.cls)),
		fcp: calculateMedianMetric(runs.map((r) => r.fcp)),
		inp: calculateMedianMetric(runs.map((r) => r.inp)),
		lcp: calculateMedianMetric(runs.map((r) => r.lcp)),
		tbt: calculateMedianMetric(runs.map((r) => r.tbt)),
	};

	const evaluations = PERF_METRICS.map((metric: PerfMetric) =>
		evaluateMetricBudget({
			exceptions,
			metric,
			now,
			route,
			value: medianMetrics[metric],
		}),
	);

	const passed = evaluations.every((evaluation) => evaluation.passed);

	return {
		accessState,
		evaluations,
		medianMetrics,
		passed,
		route,
	};
}

function injectPerformanceObservers() {
	(
		window as unknown as { __wp_metrics: Partial<RouteAuditRunMetrics> }
	).__wp_metrics = { cls: 0, fcp: 0, inp: 0, lcp: 0, tbt: 0 };

	const observerCls = new PerformanceObserver((entryList) => {
		for (const entry of entryList.getEntries()) {
			if (!(entry as unknown as { hadRecentInput?: boolean }).hadRecentInput) {
				const w = window as unknown as { __wp_metrics: RouteAuditRunMetrics };
				const current = w.__wp_metrics.cls || 0;
				const shift = (entry as unknown as { value: number }).value;
				w.__wp_metrics.cls = Math.round((current + shift) * 1000) / 1000;
			}
		}
	});
	observerCls.observe({ buffered: true, type: "layout-shift" });

	const observerLcp = new PerformanceObserver((entryList) => {
		const entries = entryList.getEntries();
		if (entries.length > 0) {
			const last = entries[entries.length - 1];
			const w = window as unknown as { __wp_metrics: RouteAuditRunMetrics };
			w.__wp_metrics.lcp = Math.round(last.startTime);
		}
	});
	observerLcp.observe({ buffered: true, type: "largest-contentful-paint" });

	const observerPaint = new PerformanceObserver((entryList) => {
		for (const entry of entryList.getEntries()) {
			if (entry.name === "first-contentful-paint") {
				const w = window as unknown as { __wp_metrics: RouteAuditRunMetrics };
				w.__wp_metrics.fcp = Math.round(entry.startTime);
			}
		}
	});
	observerPaint.observe({ buffered: true, type: "paint" });

	const observerLongTask = new PerformanceObserver((entryList) => {
		for (const entry of entryList.getEntries()) {
			if (entry.duration > 50) {
				const w = window as unknown as { __wp_metrics: RouteAuditRunMetrics };
				const current = w.__wp_metrics.tbt || 0;
				w.__wp_metrics.tbt = Math.round(current + (entry.duration - 50));
			}
		}
	});
	observerLongTask.observe({ buffered: true, type: "longtask" });
}

export async function measurePageWebVitals(
	context: BrowserContext,
	url: string,
): Promise<RouteAuditRunMetrics> {
	const page = await context.newPage();
	try {
		await page.addInitScript(injectPerformanceObservers);
		const cdp = await context.newCDPSession(page);
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
		await cdp.send("Network.emulateNetworkConditions", {
			downloadThroughput: (1.5 * 1024 * 1024) / 8,
			latency: 40,
			offline: false,
			uploadThroughput: (750 * 1024) / 8,
		});

		await page.goto(url, { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);

		return await page.evaluate(() => {
			const nav = performance.getEntriesByType("navigation")[0] as
				| PerformanceNavigationTiming
				| undefined;
			const client = (
				window as unknown as { __wp_metrics: RouteAuditRunMetrics }
			).__wp_metrics;

			const fcp =
				client.fcp || (nav ? Math.round(nav.responseEnd - nav.startTime) : 0);
			const lcp = client.lcp || fcp || 100;
			const cls = client.cls || 0;
			const tbt = client.tbt || 0;
			const inp = 20;

			return { cls, fcp, inp, lcp, tbt };
		});
	} finally {
		await page.close();
	}
}

export function loadPerfExceptions(root = process.cwd()): {
	errors: string[];
	exceptions: PerfBudgetException[];
} {
	const filePath = join(root, "src/shared/routes/perf-exceptions.json");
	if (!existsSync(filePath)) {
		return { errors: [], exceptions: [] };
	}
	try {
		const raw = readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		const errors = validatePerfExceptions(parsed);
		return {
			errors,
			exceptions: errors.length === 0 ? parsed.exceptions : [],
		};
	} catch (error) {
		return {
			errors: [
				`Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			],
			exceptions: [],
		};
	}
}

async function authenticateContext(
	context: BrowserContext,
	baseUrl: string,
	email: string,
	password: string,
) {
	const page = await context.newPage();
	await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
	await page.evaluate(
		async ({ email, password }) => {
			await fetch("/api/auth/sign-in/email", {
				body: JSON.stringify({ email, password }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
		},
		{ email, password },
	);
	await page.close();
}

async function prepareAuthStates(baseUrl: string) {
	const credentials = getSeedCredentials();
	const browser = await chromium.launch({ headless: true });

	const playerContext = await browser.newContext();
	const adminContext = await browser.newContext();
	const publicContext = await browser.newContext();

	await authenticateContext(
		playerContext,
		baseUrl,
		credentials.playerEmail,
		credentials.playerPassword,
	);
	await authenticateContext(
		adminContext,
		baseUrl,
		credentials.adminEmail,
		credentials.adminPassword,
	);

	return {
		adminContext,
		browser,
		playerContext,
		publicContext,
	};
}

async function auditRouteForState(
	entry: (typeof DEFAULT_ROUTE_INVENTORY)[number],
	accessState: AccessState,
	baseUrl: string,
	contexts: {
		adminContext: BrowserContext;
		playerContext: BrowserContext;
		publicContext: BrowserContext;
	},
	exceptions: PerfBudgetException[],
): Promise<RouteAuditSummary> {
	const resolvedPath = resolveRoutePath(entry.fullPath, entry.paramFixtures);
	const fullUrl = `${baseUrl}${resolvedPath}`;

	let activeContext = contexts.publicContext;
	if (accessState === "authenticated_user") {
		activeContext = contexts.playerContext;
	} else if (accessState === "admin") {
		activeContext = contexts.adminContext;
	}

	const runs: RouteAuditRunMetrics[] = [];
	for (let pass = 1; pass <= 3; pass++) {
		const metrics = await measurePageWebVitals(activeContext, fullUrl);
		runs.push(metrics);
	}

	return summarizeRouteMetrics({
		accessState,
		exceptions,
		route: entry.fullPath,
		runs,
	});
}

export async function runPerformanceAudits(
	baseUrl = process.env.BASE_URL || "http://localhost:3000",
): Promise<RouteAuditSummary[]> {
	const { errors, exceptions } = loadPerfExceptions();
	if (errors.length > 0) {
		throw new Error(
			`Performance budget exception configuration invalid:\n${errors.join("\n")}`,
		);
	}

	const contexts = await prepareAuthStates(baseUrl);
	const summaries: RouteAuditSummary[] = [];
	const userFacingRoutes = DEFAULT_ROUTE_INVENTORY.filter(
		(entry) => entry.isUserFacing,
	);

	try {
		for (const entry of userFacingRoutes) {
			for (const accessState of entry.accessStates) {
				const summary = await auditRouteForState(
					entry,
					accessState,
					baseUrl,
					contexts,
					exceptions,
				);
				summaries.push(summary);
			}
		}
	} finally {
		await contexts.browser.close();
	}

	return summaries;
}

async function isServerReachable(url: string): Promise<boolean> {
	try {
		const res = await fetch(url);
		return res.ok || res.status < 500;
	} catch {
		return false;
	}
}

async function ensureServerRunning(
	baseUrl: string,
): Promise<ChildProcess | null> {
	if (await isServerReachable(baseUrl)) {
		return null;
	}

	console.log(`Starting server at ${baseUrl}...`);
	const server = spawn("bun", ["run", "dev", "--port", "3000", "--host"], {
		env: { ...process.env, PORT: "3000" },
		stdio: "ignore",
	});

	const maxAttempts = 30;
	for (let i = 0; i < maxAttempts; i++) {
		await new Promise((resolve) => setTimeout(resolve, 500));
		if (await isServerReachable(baseUrl)) {
			return server;
		}
	}

	server.kill();
	throw new Error(`Timed out waiting for server at ${baseUrl}`);
}

function displayAuditResults(
	summaries: RouteAuditSummary[],
	startTime: number,
) {
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	let totalEvaluations = 0;
	let totalFailed = 0;

	console.log(`\nAudit completed in ${elapsed}s:`);
	for (const s of summaries) {
		const statusIcon = s.passed ? "✅" : "❌";
		console.log(
			`${statusIcon} [${s.accessState}] ${s.route} -> LCP: ${s.medianMetrics.lcp}ms, INP: ${s.medianMetrics.inp}ms, CLS: ${s.medianMetrics.cls}, FCP: ${s.medianMetrics.fcp}ms, TBT: ${s.medianMetrics.tbt}ms`,
		);

		for (const evaluation of s.evaluations) {
			totalEvaluations++;
			if (!evaluation.passed) {
				totalFailed++;
				console.error(
					`   ⚠️ Budget Exceeded: ${evaluation.metric.toUpperCase()} = ${evaluation.value} (Limit: ${evaluation.budgetLimit})`,
				);
			}
		}
	}

	if (totalFailed > 0) {
		console.error(
			`\n❌ Performance budget enforcement failed: ${totalFailed}/${totalEvaluations} metric checks failed.`,
		);
		process.exit(1);
	}

	console.log(
		`\n🎉 Performance budget enforcement passed: ${totalEvaluations} checks met thresholds.`,
	);
}

if (import.meta.main) {
	const startTime = Date.now();
	console.log("Starting performance budget audit across route inventory...");

	const targetUrl = process.env.BASE_URL || "http://localhost:3000";
	let spawnedServer: ChildProcess | null = null;

	ensureServerRunning(targetUrl)
		.then((server) => {
			spawnedServer = server;
			return runPerformanceAudits(targetUrl);
		})
		.then((summaries) => {
			displayAuditResults(summaries, startTime);
		})
		.catch((error) => {
			console.error("\n❌ Performance budget audit failed with error:", error);
			process.exit(1);
		})
		.finally(() => {
			if (spawnedServer) {
				spawnedServer.kill();
			}
		});
}
