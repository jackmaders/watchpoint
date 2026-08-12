import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecFn } from "../exec";
import { defaultExec } from "../exec";
import type { IssueContext } from "../github";
import {
	appendWayfinderDecision,
	buildResearchArtifact,
	buildResearchBranchName,
	buildResearchFilePath,
	buildResearchResolutionComment,
	run as researchRun,
	runResearchTicket,
} from "../research";
import type { RunAgentResult } from "../run-agent";
import type { Research } from "../schemas";
import { extractWayfinderMapNumber } from "../wiring";

vi.mock("@actions/github");
vi.mock("../logger");
vi.mock("../run-agent");
vi.mock("../exec");

const research: Research = {
	findingsMarkdown:
		"The authoritative answer is documented in the API reference.",
	sources: [{ title: "API reference", url: "https://example.com/api" }],
};

function buildCtx(): IssueContext {
	return {
		issueNumber: 63,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function result(): RunAgentResult<Research> {
	return {
		output: research,
		raw: "",
		sessionId: "session-1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function mockIssueAndMap(
	ctx: IssueContext,
	body: string | null = "<!-- wayfinder-map: 100 -->",
	withoutUrls = false,
): void {
	const issue = {
		body,
		...optionalUrl(
			"https://github.com/jackmaders/watchpoint/issues/63",
			withoutUrls,
		),
		labels: [{ name: "wayfinder:research" }, { name: "research:needed" }],
		number: 63,
		title: "Establish the authoritative API",
	};
	const map = {
		body: withoutUrls
			? undefined
			: "## Decisions so far\n\n<!-- wayfinder-decisions -->\n\n## Not yet specified\n\n- Fog",
		...optionalUrl(
			"https://github.com/jackmaders/watchpoint/issues/100",
			withoutUrls,
		),
		labels: [{ name: "wayfinder:map" }],
		number: 100,
		title: "Wayfinder — A settled destination",
	};

	vi.mocked(ctx.octokit.rest.issues.get).mockImplementation((async ({
		issue_number,
	}: {
		issue_number: number;
	}) => ({
		data: issue_number === 63 ? issue : map,
	})) as unknown as typeof ctx.octokit.rest.issues.get);
	vi.mocked(ctx.octokit.paginate).mockResolvedValue([]);
}

function optionalUrl(url: string, omit: boolean): { html_url?: string } {
	return omit ? {} : { html_url: url };
}

function fakeExec(): ExecFn {
	return vi.fn(async (command, args) => {
		if (command === "git" && args[0] === "rev-parse") {
			return { exitCode: 0, stderr: "", stdout: "base-sha\n" };
		}
		return { exitCode: 0, stderr: "", stdout: "" };
	});
}

describe("research artifact helpers", () => {
	it("builds a bounded research branch and file path from the ticket title", () => {
		// Arrange
		const title = "Which API should we use?";

		// Act
		const branch = buildResearchBranchName(63, title);
		const path = buildResearchFilePath(63, title);

		// Assert
		expect(branch).toBe("research/issue-63-which-api-should-we-use");
		expect(path).toBe("research/63-which-api-should-we-use.md");
	});

	it("uses a safe fallback for punctuation-only titles", () => {
		// Arrange
		// Act
		const branch = buildResearchBranchName(63, "!!!");
		const path = buildResearchFilePath(63, "!!!");

		// Assert
		expect(branch).toBe("research/issue-63-ticket");
		expect(path).toBe("research/63-ticket.md");
	});

	it("renders findings and a deterministic source list", () => {
		// Arrange
		// Act
		const artifact = buildResearchArtifact(
			"Establish the authoritative API",
			research,
		);

		// Assert
		expect(artifact).toContain("# Establish the authoritative API");
		expect(artifact).toContain(research.findingsMarkdown);
		expect(artifact).toContain(
			"## Sources\n\n- [API reference](https://example.com/api)",
		);
	});

	it("renders a title-linked answer without a bare issue reference", () => {
		// Arrange
		// Act
		const comment = buildResearchResolutionComment(
			"Establish the authoritative API",
			"https://github.com/jackmaders/watchpoint/issues/63",
			research,
			"https://github.com/jackmaders/watchpoint/blob/research/issue-63-api/research/63-api.md",
		);

		// Assert
		expect(comment).toContain(
			"[Establish the authoritative API](https://github.com/jackmaders/watchpoint/issues/63)",
		);
		expect(comment).toContain(
			"[Findings file](https://github.com/jackmaders/watchpoint/blob/research/issue-63-api/research/63-api.md)",
		);
		expect(comment).not.toMatch(/#[0-9]+/);
	});

	it("extracts a map number only from the hidden map marker", () => {
		// Arrange
		// Act
		const found = extractWayfinderMapNumber("text <!-- wayfinder-map: 100 -->");
		const missing = extractWayfinderMapNumber("text without a map");

		// Assert
		expect(found).toBe(100);
		expect(missing).toBeNull();
	});

	it("appends one idempotent title-linked pointer to the map", () => {
		// Arrange
		const body =
			"## Decisions so far\n\n<!-- wayfinder-decisions -->\n\n## Fog";

		// Act
		const pointer = appendWayfinderDecision(
			body,
			"Establish the authoritative API",
			"https://github.com/jackmaders/watchpoint/issues/63",
			"https://example.com/findings",
		);
		const repeated = appendWayfinderDecision(
			pointer,
			"Establish the authoritative API",
			"https://github.com/jackmaders/watchpoint/issues/63",
			"https://example.com/findings",
		);

		// Assert
		expect(pointer).toContain(
			"- [Establish the authoritative API](https://github.com/jackmaders/watchpoint/issues/63) — [Research findings](https://example.com/findings)",
		);
		expect(repeated).toBe(pointer);
		expect(pointer).not.toMatch(/#[0-9]+/);
	});

	it("creates the decisions section when the map has no marker", () => {
		const pointer = appendWayfinderDecision(
			"## Not yet specified\n\n- Fog",
			"Establish the authoritative API",
			"https://github.com/jackmaders/watchpoint/issues/63",
			"https://example.com/findings",
		);

		expect(pointer).toContain("## Decisions so far");
	});
});

describe("runResearchTicket", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Reflect.deleteProperty(process.env, "AGENT_PAT");
	});

	it("claims first, publishes findings, resolves the ticket, and updates the map", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueAndMap(ctx);
		const runner = vi.fn(async () => result());
		const exec = fakeExec();
		const writes: Array<{ path: string; contents: string }> = [];
		const writeArtifact = vi.fn((path: string, contents: string) => {
			writes.push({ contents, path });
		});

		// Act
		await runResearchTicket(ctx, runner, exec, writeArtifact);

		// Assert
		expect(ctx.octokit.rest.issues.addAssignees).toHaveBeenCalledWith({
			assignees: ["watchpoint-agent"],
			issue_number: 63,
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(
			(
				ctx.octokit.rest.issues.addAssignees as unknown as {
					mock: { invocationCallOrder: number[] };
				}
			).mock.invocationCallOrder[0],
		).toBeLessThan(
			(
				ctx.octokit.rest.issues.addLabels as unknown as {
					mock: { invocationCallOrder: number[] };
				}
			).mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
		);
		expect(writes).toEqual([
			{
				contents: expect.stringContaining("The authoritative answer"),
				path: "research/63-establish-the-authoritative-api.md",
			},
		]);
		expect(exec).toHaveBeenCalledWith("git", [
			"add",
			"--",
			"research/63-establish-the-authoritative-api.md",
		]);
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Research resolved"),
			}),
		);
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 63,
				state: "closed",
				state_reason: "completed",
			}),
		);
		expect(ctx.octokit.rest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Research findings"),
				issue_number: 100,
			}),
		);
	});

	it("fails after claiming when the ticket has no map marker", async () => {
		// Arrange
		const ctx = buildCtx();
		mockIssueAndMap(ctx, null);
		const runner = vi.fn(async () => result());

		// Act
		const act = runResearchTicket(ctx, runner, fakeExec(), vi.fn());

		// Assert
		await expect(act).rejects.toThrow("does not identify a Wayfinder map");
		expect(ctx.octokit.rest.issues.addAssignees).toHaveBeenCalledOnce();
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Research Error"),
			}),
		);
	});

	it("reports a git failure after creating the research branch", async () => {
		const ctx = buildCtx();
		mockIssueAndMap(ctx);
		const exec = vi.fn(async (command: string, args: string[]) => {
			if (command === "git" && args[0] === "add") {
				return { exitCode: 1, stderr: "", stdout: "rejected" };
			}
			return { exitCode: 0, stderr: "", stdout: "base-sha\n" };
		});

		await expect(
			runResearchTicket(ctx, async () => result(), exec, vi.fn()),
		).rejects.toThrow("git add");
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Research Error"),
			}),
		);
	});

	it("uses issue URLs derived from the repository when GitHub omits them", async () => {
		const ctx = buildCtx();
		mockIssueAndMap(ctx, "<!-- wayfinder-map: 100 -->", true);
		await runResearchTicket(ctx, async () => result(), fakeExec(), vi.fn());

		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining(
					"https://github.com/jackmaders/watchpoint/issues/63",
				),
			}),
		);
	});
});

describe("run", () => {
	it("builds its context from the workflow environment", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "63";
		const octokit = github.getOctokit("fake-token");
		mockIssueAndMap({
			issueNumber: 63,
			octokit,
			owner: "jackmaders",
			repo: "watchpoint",
		});
		const mockedRunAgent = vi.mocked((await import("../run-agent")).runAgent);
		mockedRunAgent.mockResolvedValue(result() as never);
		vi.mocked(defaultExec).mockImplementation(fakeExec());

		// Act
		await researchRun();

		// Assert
		expect(mockedRunAgent).toHaveBeenCalled();
	});
});
