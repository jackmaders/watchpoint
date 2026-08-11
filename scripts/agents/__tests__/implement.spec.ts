import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecFn } from "../exec";
import { RunAgentError } from "../failure";
import type { IssueContext } from "../github";
import {
	buildPullRequestBody,
	findExistingPullRequest,
	findShapeGuardRefusal,
	run as implementRun,
	runImplementation,
} from "../implement";
import type { RunAgentResult } from "../run-agent";
import type { Implement } from "../schemas";

vi.mock("@actions/github");
vi.mock("../logger");
vi.mock("../run-agent");

/** Sets `AGENT_PAT` for the duration of `fn`, restoring the prior value (present or absent) afterwards — the one idiom every AGENT_PAT-branching test in this file uses, rather than each hand-rolling its own try/finally or env snapshot. */
async function withAgentPat<T>(
	value: string | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	const original = process.env.AGENT_PAT;
	if (value === undefined) {
		Reflect.deleteProperty(process.env, "AGENT_PAT");
	} else {
		process.env.AGENT_PAT = value;
	}
	try {
		return await fn();
	} finally {
		if (original === undefined) {
			Reflect.deleteProperty(process.env, "AGENT_PAT");
		} else {
			process.env.AGENT_PAT = original;
		}
	}
}

function fakeImplementOutput(overrides: Partial<Implement> = {}): Implement {
	return {
		pr: {
			description: "do the thing",
			emoji: "🎫",
			scope: "agents",
			template: "feature.md",
			type: "feat",
		},
		summary: "Built the thing.",
		...overrides,
	};
}

function fakeResult(output: Implement): RunAgentResult<Implement> {
	return {
		output,
		raw: "",
		sessionId: "sess_1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function buildCtx(): IssueContext {
	return {
		issueNumber: 57,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function mockIssue(
	ctx: IssueContext,
	{
		body = "The ticket.",
		labelNames = [],
		title = "09 — Implementation agent",
		subIssuesTotal = 0,
		blockedBy = 0,
	}: {
		body?: string;
		labelNames?: string[];
		title?: string;
		subIssuesTotal?: number;
		blockedBy?: number;
	},
): void {
	vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
		data: {
			body,
			issue_dependencies_summary: { blocked_by: blockedBy },
			labels: labelNames.map((name) => ({ name })),
			number: 57,
			sub_issues_summary: { total: subIssuesTotal },
			title,
		},
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
}

/** `[]` for every `paginate` call — every open-PR test that isn't asserting on the PR list itself just needs comments and pulls both empty. */
function mockOpenPulls(
	ctx: IssueContext,
	pulls: Array<{ number: number; body: string | null }> = [],
): void {
	vi.mocked(ctx.octokit.paginate).mockImplementation((async (
		method: unknown,
	) => {
		if (method === ctx.octokit.rest.pulls.list) return pulls;
		return [];
	}) as unknown as typeof ctx.octokit.paginate);
}

function mockCreatedPull(ctx: IssueContext, number: number): void {
	vi.mocked(ctx.octokit.rest.pulls.create).mockResolvedValue({
		data: { number },
	} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.create>>);
}

interface StubResult {
	exitCode: number;
	stdout?: string;
	stderr?: string;
}

type ExecStep = "revParseHead" | "revList" | "validate" | "push" | "other";

/** Routes a `git`/`bun` invocation to a named step, so every fake exec below is a flat lookup table rather than a branching if-chain. */
function execStep(command: string, args: string[]): ExecStep {
	if (command === "bun") return "validate";
	if (command !== "git") return "other";
	if (args.join(" ") === "rev-parse HEAD") return "revParseHead";
	if (args[0] === "rev-list") return "revList";
	if (args[0] === "push") return "push";
	return "other";
}

function execFake(routes: Partial<Record<ExecStep, StubResult>>): ExecFn {
	return vi.fn(async (command, args) => {
		const result = routes[execStep(command, args)] ?? { exitCode: 0 };
		return {
			exitCode: result.exitCode,
			stderr: result.stderr ?? "",
			stdout: result.stdout ?? "",
		};
	});
}

/** A happy-path exec double: every git op and `bun run validate` succeed. */
function happyExec(overrides: { commitCount?: string } = {}): ExecFn {
	return execFake({
		revList: { exitCode: 0, stdout: overrides.commitCount ?? "1\n" },
		revParseHead: { exitCode: 0, stdout: "abc123\n" },
	});
}

describe("buildPullRequestBody", () => {
	it("puts a deterministic Closes # line first, then the summary, then the template", () => {
		// Arrange
		// Act
		const body = buildPullRequestBody(57, "Built the thing.", "## Template");

		// Assert
		expect(body).toBe("Closes #57\n\nBuilt the thing.\n\n---\n\n## Template");
	});
});

describe("findExistingPullRequest", () => {
	it("finds an open PR whose body closes the issue", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, [
			{ body: "Some unrelated PR.", number: 10 },
			{ body: "This closes #57 once merged.", number: 11 },
		]);

		// Act
		const result = await findExistingPullRequest(ctx, 57);

		// Assert
		expect(result?.number).toBe(11);
	});

	it("matches fixes and resolves as well as closes", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, [{ body: "Fixes #57", number: 12 }]);

		// Act
		const result = await findExistingPullRequest(ctx, 57);

		// Assert
		expect(result?.number).toBe(12);
	});

	it("does not match a bare mention of the issue number without a closing keyword", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, [{ body: "See #57 for context.", number: 13 }]);

		// Act
		const result = await findExistingPullRequest(ctx, 57);

		// Assert
		expect(result).toBeNull();
	});

	it("does not match a different issue number", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, [{ body: "Closes #570", number: 14 }]);

		// Act
		const result = await findExistingPullRequest(ctx, 57);

		// Assert
		expect(result).toBeNull();
	});

	it("returns null when there are no open PRs at all", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, []);

		// Act
		const result = await findExistingPullRequest(ctx, 57);

		// Assert
		expect(result).toBeNull();
	});

	it("treats a bodyless open PR as unmatched rather than throwing", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, [{ body: null, number: 15 }]);

		// Act
		const result = await findExistingPullRequest(ctx, 57);

		// Assert
		expect(result).toBeNull();
	});
});

describe("findShapeGuardRefusal", () => {
	it("refuses an issue that has sub-issues — a spec, not a ticket", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx);
		const issue = {
			issue_dependencies_summary: { blocked_by: 0 },
			number: 57,
			sub_issues_summary: { total: 2 },
		};

		// Act
		const refusal = await findShapeGuardRefusal(ctx, issue);

		// Assert
		expect(refusal).toContain("sub-issue");
	});

	it("refuses a ticket with open blockers — not on the frontier", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx);
		const issue = {
			issue_dependencies_summary: { blocked_by: 1 },
			number: 57,
			sub_issues_summary: { total: 0 },
		};

		// Act
		const refusal = await findShapeGuardRefusal(ctx, issue);

		// Assert
		expect(refusal).toContain("blocker");
	});

	it("refuses when an open PR already closes this issue", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx, [{ body: "Closes #57", number: 99 }]);
		const issue = {
			issue_dependencies_summary: { blocked_by: 0 },
			number: 57,
			sub_issues_summary: { total: 0 },
		};

		// Act
		const refusal = await findShapeGuardRefusal(ctx, issue);

		// Assert
		expect(refusal).toContain("#99");
	});

	it("returns null when the ticket is a valid, unblocked, PR-less frontier item", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx);
		const issue = {
			issue_dependencies_summary: { blocked_by: 0 },
			number: 57,
			sub_issues_summary: { total: 0 },
		};

		// Act
		const refusal = await findShapeGuardRefusal(ctx, issue);

		// Assert
		expect(refusal).toBeNull();
	});

	it("refuses, rather than defaulting to zero, when GitHub's response omits sub_issues_summary and issue_dependencies_summary", async () => {
		// Arrange — a response missing either summary is an API-shape anomaly
		// (every repo this pipeline runs against has sub-issues and issue
		// dependencies enabled), not evidence the ticket has zero of either.
		// Defaulting it to zero would silently implement a ticket the guard
		// could not actually prove was unblocked.
		const ctx = buildCtx();
		mockOpenPulls(ctx);
		const issue = { number: 57 };

		// Act
		const refusal = await findShapeGuardRefusal(ctx, issue);

		// Assert
		expect(refusal).toContain("missing its sub-issue or blocker summary");
	});

	it("refuses when only one of the two summaries is present", async () => {
		// Arrange
		const ctx = buildCtx();
		mockOpenPulls(ctx);
		const issue = { number: 57, sub_issues_summary: { total: 0 } };

		// Act
		const refusal = await findShapeGuardRefusal(ctx, issue);

		// Assert
		expect(refusal).toContain("missing its sub-issue or blocker summary");
	});
});

describe("runImplementation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("shape guards", () => {
		it("refuses, comments, and blocks without ever running the model or touching git", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { labelNames: ["dev:needed"], subIssuesTotal: 3 });
			mockOpenPulls(ctx);
			const runner = vi.fn();
			const exec = happyExec();

			// Act
			await runImplementation(ctx, runner, exec);

			// Assert
			expect(runner).not.toHaveBeenCalled();
			expect(exec).not.toHaveBeenCalled();
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("sub-issue"),
				}),
			);
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 57,
				labels: ["agent:blocked"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 57,
				name: "dev:needed",
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("never adds agent:in-progress on a refusal", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { blockedBy: 1, labelNames: ["dev:needed"] });
			mockOpenPulls(ctx);

			// Act
			await runImplementation(ctx, vi.fn(), happyExec());

			// Assert
			expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
				expect.objectContaining({ labels: ["agent:in-progress"] }),
			);
		});
	});

	describe("happy path", () => {
		it("transitions to in-progress, branches from main, and calls the runner with the ticket and branch", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { labelNames: ["dev:needed", "agent:blocked"] });
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await runImplementation(ctx, runner, exec);

			// Assert
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 57,
				labels: ["agent:in-progress"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(exec).toHaveBeenCalledWith("git", ["fetch", "origin", "main"]);
			expect(exec).toHaveBeenCalledWith("git", [
				"switch",
				"-c",
				"agent/issue-57-09-implementation-agent",
				"origin/main",
			]);
			expect(runner).toHaveBeenCalledWith(
				expect.objectContaining({
					expectSkill: "implement",
					promptArgs: expect.objectContaining({
						BRANCH_NAME: "agent/issue-57-09-implementation-agent",
						ISSUE_NUMBER: "57",
						TICKET: expect.stringContaining("User Context (Issue Body):"),
					}),
				}),
			);
		});

		it("runs bun run validate and pushes the branch plainly, without any force flag", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await runImplementation(ctx, runner, exec);

			// Assert
			expect(exec).toHaveBeenCalledWith("bun", ["run", "validate"]);
			expect(exec).toHaveBeenCalledWith("git", [
				"push",
				"origin",
				"agent/issue-57-09-implementation-agent",
			]);
		});

		it("opens a draft PR with Closes #, a title composed from type/scope/emoji/description, and the model-selected template", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi.fn().mockResolvedValue(
				fakeResult(
					fakeImplementOutput({
						pr: {
							description: "fix the thing",
							emoji: "🐛",
							scope: "agents",
							template: "bugfix.md",
							type: "fix",
						},
						summary: "Fixed the thing.",
					}),
				),
			);
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await runImplementation(ctx, runner, exec);

			// Assert
			expect(ctx.octokit.rest.pulls.create).toHaveBeenCalledWith(
				expect.objectContaining({
					base: "main",
					body: expect.stringContaining("Closes #57"),
					draft: true,
					head: "agent/issue-57-09-implementation-agent",
					owner: "jackmaders",
					repo: "watchpoint",
					title: "fix(agents): 🐛 fix the thing",
				}),
			);
			expect(ctx.octokit.rest.pulls.create).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("Fixed the thing."),
				}),
			);
			expect(ctx.octokit.rest.pulls.create).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("Bug Fix Overview"),
				}),
			);
		});

		it("chains review:needed onto the new PR through an AGENT_PAT-authenticated client", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await withAgentPat("pat-token", () =>
				runImplementation(ctx, runner, exec),
			);

			// Assert
			expect(github.getOctokit).toHaveBeenCalledWith("pat-token");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 200,
				labels: ["review:needed"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("carries no CI-approval notice in the PR body when AGENT_PAT is configured", async () => {
			// Arrange — the notice text itself names GITHUB_TOKEN, so its
			// absence from the body is direct evidence createDraftPullRequest
			// took the PAT branch rather than the no-PAT fallback.
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await withAgentPat("pat-token", () =>
				runImplementation(ctx, runner, exec),
			);

			// Assert
			expect(ctx.octokit.rest.pulls.create).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.not.stringContaining("GITHUB_TOKEN"),
				}),
			);
		});

		it("falls back to a comment when AGENT_PAT is absent, and notes the CI approval gate in the PR body", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await withAgentPat(undefined, () => runImplementation(ctx, runner, exec));

			// Assert
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("review:needed"),
				}),
			);
			expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
				expect.objectContaining({ labels: ["review:needed"] }),
			);
			expect(ctx.octokit.rest.pulls.create).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("waiting for a maintainer to approve"),
				}),
			);
		});

		it("removes agent:in-progress once the happy path completes", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { labelNames: ["agent:in-progress"] });
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec();
			mockCreatedPull(ctx, 200);

			// Act
			await runImplementation(ctx, runner, exec);

			// Assert
			expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 57,
				name: "agent:in-progress",
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});
	});

	describe("measured failures", () => {
		let outputDir: string;
		const originalOutputDir = process.env.OUTPUT_DIR;

		beforeEach(() => {
			outputDir = mkdtempSync(join(tmpdir(), "implement-failure-"));
			process.env.OUTPUT_DIR = outputDir;
		});

		afterEach(() => {
			if (originalOutputDir === undefined) {
				Reflect.deleteProperty(process.env, "OUTPUT_DIR");
			} else {
				process.env.OUTPUT_DIR = originalOutputDir;
			}
		});

		it("fails with no-commits when the model made zero commits, and never runs validate or pushes", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { labelNames: ["agent:in-progress"] });
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = happyExec({ commitCount: "0\n" });

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow(/No commits were made/);
			expect(exec).not.toHaveBeenCalledWith("bun", ["run", "validate"]);
			expect(ctx.octokit.rest.pulls.create).not.toHaveBeenCalled();
			const reason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(reason).toContain("no-commits");
		});

		it("falls back to stdout in the validate failure message when validate wrote nothing to stderr", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = execFake({
				revList: { exitCode: 0, stdout: "1\n" },
				revParseHead: { exitCode: 0, stdout: "abc123\n" },
				validate: { exitCode: 1, stdout: "3 tests failed" },
			});

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow(/3 tests failed/);
		});

		it("writes a failure reason for a non-Error rejection too, stringifying rather than throwing", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi.fn().mockRejectedValue("plain string rejection");
			const exec = happyExec();

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toBe("plain string rejection");
			const reason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(reason).toContain("unclassified");
			expect(reason).toContain("plain string rejection");
		});

		it("fails with validate-failed when bun run validate exits non-zero, and never pushes", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = execFake({
				revList: { exitCode: 0, stdout: "1\n" },
				revParseHead: { exitCode: 0, stdout: "abc123\n" },
				validate: { exitCode: 1, stderr: "3 tests failed" },
			});

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow(/bun run validate failed/);
			expect(exec).not.toHaveBeenCalledWith(
				"git",
				expect.arrayContaining(["push"]),
			);
			const reason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(reason).toContain("validate-failed");
			expect(reason).toContain("3 tests failed");
		});

		it("fails with push-race when the push is rejected because a previous run got further", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockResolvedValue(fakeResult(fakeImplementOutput()));
			const exec = execFake({
				push: { exitCode: 1, stderr: "! [rejected] (stale info)" },
				revList: { exitCode: 0, stdout: "1\n" },
				revParseHead: { exitCode: 0, stdout: "abc123\n" },
			});

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow(/a previous run of this ticket/);
			expect(ctx.octokit.rest.pulls.create).not.toHaveBeenCalled();
			const reason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(reason).toContain("push-race");
		});

		it("classifies a plain, non-RunAgentError rejection as unclassified, and still writes a failure reason", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi.fn().mockRejectedValue(new Error("network timeout"));
			const exec = happyExec();

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow("network timeout");
			const reason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(reason).toContain("unclassified");
			expect(reason).toContain("network timeout");
		});

		it("preserves the runner's own failure classification instead of overwriting it with unclassified", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, {});
			mockOpenPulls(ctx);
			const runner = vi
				.fn()
				.mockRejectedValue(new RunAgentError("quota", "rate limit exceeded"));
			const exec = happyExec();

			// Act
			const act = runImplementation(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow("rate limit exceeded");
			const reason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(reason).toContain("quota");
			expect(reason).not.toContain("unclassified");
		});
	});

	describe("when a step fails", () => {
		it("applies agent:blocked, posts an error comment, removes agent:in-progress, and rethrows", async () => {
			// Arrange
			const ctx = buildCtx();
			mockIssue(ctx, { labelNames: ["agent:in-progress"] });
			mockOpenPulls(ctx);
			const runner = vi.fn().mockRejectedValue(new Error("quota exceeded"));

			// Act
			const act = runImplementation(ctx, runner, happyExec());

			// Assert
			await expect(act).rejects.toThrow("quota exceeded");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 57,
				labels: ["agent:blocked"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("⚠️ **Implement Error:**"),
				}),
			);
			expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 57,
				name: "agent:in-progress",
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});
	});
});

describe("run", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("wires an IssueContext from the workflow's env vars and runs the implementation", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "57";
		const ctx = buildCtx();
		mockIssue(ctx, { subIssuesTotal: 1 });
		mockOpenPulls(ctx);

		// Act
		await implementRun();

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});

	it("defaults the issue number to 0 rather than throwing when ISSUE_NUMBER is unset", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		Reflect.deleteProperty(process.env, "ISSUE_NUMBER");
		const ctx = buildCtx();
		mockIssue(ctx, { subIssuesTotal: 1 });
		mockOpenPulls(ctx);

		// Act
		const act = implementRun();

		// Assert
		await expect(act).resolves.not.toThrow();
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
	});
});
