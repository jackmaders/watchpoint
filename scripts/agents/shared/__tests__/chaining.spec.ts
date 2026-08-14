import * as github from "@actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../../github";
import { LABELS } from "../../github";
import { chainLabel, chainLabels, resolvePatContext } from "../chaining";

vi.mock("@actions/github");

const ORIGINAL_ENV = process.env;

function createIssueContext(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

describe("resolvePatContext", () => {
	afterEach(() => {
		process.env = ORIGINAL_ENV;
	});

	it("returns hasPat true and uses PAT octokit client when AGENT_PAT is present", () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV, AGENT_PAT: "pat-secret" };
		const ctx = createIssueContext();

		// Act
		const { context, hasPat } = resolvePatContext(ctx);

		// Assert
		expect(hasPat).toBe(true);
		expect(context.octokit).toBeDefined();
	});

	it("returns hasPat false and uses standard context when AGENT_PAT is absent", () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV };
		delete process.env.AGENT_PAT;
		const ctx = createIssueContext();

		// Act
		const { context, hasPat } = resolvePatContext(ctx);

		// Assert
		expect(hasPat).toBe(false);
		expect(context).toBe(ctx);
	});
});

describe("chainLabel", () => {
	afterEach(() => {
		process.env = ORIGINAL_ENV;
	});

	it("adds label using PAT octokit and returns true when AGENT_PAT is present", async () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV, AGENT_PAT: "pat-secret" };
		const ctx = createIssueContext();
		const mockAddLabels = vi.fn().mockResolvedValue({});
		vi.mocked(github.getOctokit).mockReturnValue({
			...ctx.octokit,
			rest: {
				...ctx.octokit.rest,
				issues: {
					...ctx.octokit.rest.issues,
					addLabels: mockAddLabels,
				},
			},
		} as unknown as ReturnType<typeof github.getOctokit>);

		// Act
		const chained = await chainLabel(ctx, {
			fallbackMessage: "Please add label manually",
			label: LABELS.reviewNeeded,
		});

		// Assert
		expect(chained).toBe(true);
		expect(mockAddLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: [LABELS.reviewNeeded],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("uses explicit issueNumber when provided", async () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV, AGENT_PAT: "pat-secret" };
		const ctx = createIssueContext();
		const mockAddLabels = vi.fn().mockResolvedValue({});
		vi.mocked(github.getOctokit).mockReturnValue({
			...ctx.octokit,
			rest: {
				...ctx.octokit.rest,
				issues: {
					...ctx.octokit.rest.issues,
					addLabels: mockAddLabels,
				},
			},
		} as unknown as ReturnType<typeof github.getOctokit>);

		// Act
		const chained = await chainLabel(ctx, {
			fallbackMessage: "Please add label manually",
			issueNumber: 99,
			label: LABELS.devNeeded,
		});

		// Assert
		expect(chained).toBe(true);
		expect(mockAddLabels).toHaveBeenCalledWith({
			issue_number: 99,
			labels: [LABELS.devNeeded],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("posts fallback comment and returns false when AGENT_PAT is missing", async () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV };
		delete process.env.AGENT_PAT;
		const ctx = createIssueContext();
		const mockCreateComment = vi.fn().mockResolvedValue({});
		vi.mocked(ctx.octokit.rest.issues.createComment).mockImplementation(
			mockCreateComment,
		);

		// Act
		const chained = await chainLabel(ctx, {
			fallbackMessage: "Please add label manually",
			label: LABELS.reviewNeeded,
		});

		// Assert
		expect(chained).toBe(false);
		expect(mockCreateComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "<!-- bot-comment -->\nPlease add label manually",
				issue_number: 42,
			}),
		);
	});
});

describe("chainLabels", () => {
	afterEach(() => {
		process.env = ORIGINAL_ENV;
	});

	it("adds label across all issueNumbers using PAT octokit and returns true when AGENT_PAT is present", async () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV, AGENT_PAT: "pat-secret" };
		const ctx = createIssueContext();
		const mockAddLabels = vi.fn().mockResolvedValue({});
		vi.mocked(github.getOctokit).mockReturnValue({
			...ctx.octokit,
			rest: {
				...ctx.octokit.rest,
				issues: {
					...ctx.octokit.rest.issues,
					addLabels: mockAddLabels,
				},
			},
		} as unknown as ReturnType<typeof github.getOctokit>);

		// Act
		const chained = await chainLabels(ctx, {
			fallbackMessage: "Please add labels manually",
			issueNumbers: [101, 102],
			label: LABELS.devNeeded,
		});

		// Assert
		expect(chained).toBe(true);
		expect(mockAddLabels).toHaveBeenCalledTimes(2);
		expect(mockAddLabels).toHaveBeenCalledWith({
			issue_number: 101,
			labels: [LABELS.devNeeded],
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(mockAddLabels).toHaveBeenCalledWith({
			issue_number: 102,
			labels: [LABELS.devNeeded],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("posts fallback comment and returns false when AGENT_PAT is missing", async () => {
		// Arrange
		process.env = { ...ORIGINAL_ENV };
		delete process.env.AGENT_PAT;
		const ctx = createIssueContext();
		const mockCreateComment = vi.fn().mockResolvedValue({});
		vi.mocked(ctx.octokit.rest.issues.createComment).mockImplementation(
			mockCreateComment,
		);

		// Act
		const chained = await chainLabels(ctx, {
			fallbackMessage: "Please add labels manually",
			issueNumbers: [101, 102],
			label: LABELS.devNeeded,
		});

		// Assert
		expect(chained).toBe(false);
		expect(mockCreateComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "<!-- bot-comment -->\nPlease add labels manually",
				issue_number: 42,
			}),
		);
	});
});
