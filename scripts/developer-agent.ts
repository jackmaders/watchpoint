import { readFile } from "node:fs/promises";
import * as github from "@actions/github";
import { GoogleGenAI } from "@google/genai";
import {
	BOT_COMMENT_MARKER,
	DEV_IN_PROGRESS_LABEL,
	DEV_NEEDED_LABEL,
	extractLabelNames,
	fetchIssueContext,
	type IssueContext,
	postIssueErrorComment,
	transitionState,
} from "./pm-shared";

export { DEV_IN_PROGRESS_LABEL, DEV_NEEDED_LABEL };

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GITHUB_TOKEN: string;
			GEMINI_API_KEY: string;
			ISSUE_NUMBER: string;
			GEMINI_MODEL?: string;
		}
	}
}

export function isDeveloperTrigger(
	labels: Array<string | { name?: string }>,
	payloadAction?: string,
	latestUserComment?: string,
): boolean {
	const labelNames = extractLabelNames(labels);
	const commentText = latestUserComment ?? "";

	if (commentText.includes("/dev") || commentText.includes("/implement")) {
		return true;
	}

	if (payloadAction === "assigned") {
		return true;
	}

	return labelNames.includes(DEV_NEEDED_LABEL);
}

export function extractTargetSliceName(body?: string | null): string {
	if (!body) return "feature";
	const match = body.match(/(?:src|@)\/_pages\/([a-zA-Z0-9_-]+)/);
	return match?.[1] ?? "feature";
}

export function sanitizeBranchName(
	title: string,
	issueNumber: number,
	body?: string | null,
): string {
	const slice = extractTargetSliceName(body);
	const cleanTitle = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.slice(0, 30)
		.replace(/^-+|-+$/g, "");
	return `dev/issue-${issueNumber}-${slice}-${cleanTitle}`;
}

export async function generateDeveloperImplementation(
	ai: GoogleGenAI,
	systemInstruction: string,
	promptText: string,
): Promise<string> {
	const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
	const response = await ai.models.generateContent({
		config: {
			systemInstruction,
			thinkingConfig: {
				thinkingBudget: 2048,
			},
		},
		contents: promptText,
		model,
	});

	if (!response.text) {
		throw new Error(
			"Gemini returned an empty developer implementation response.",
		);
	}

	return response.text;
}

export async function postDeveloperCompletedComment(
	ctx: IssueContext,
	implementationSummary: string,
	branchName: string,
) {
	const { octokit, issueNumber, owner, repo } = ctx;

	const body = `${BOT_COMMENT_MARKER}
✅ **Developer AI Agent Implementation Ready!**

### Implementation Summary
${implementationSummary}

* **Target Branch:** \`${branchName}\`
* **Architecture:** Feature-Sliced Design (\`src/_pages/\`)
* **Verification Command:** \`bun run validate\`
`;

	await octokit.rest.issues.createComment({
		body,
		issue_number: issueNumber,
		owner,
		repo,
	});
}

export async function run() {
	const issueNumber = parseInt(process.env.ISSUE_NUMBER ?? "0", 10);
	const owner = github.context.repo.owner;
	const repo = github.context.repo.repo;

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	const ctx: IssueContext = { issueNumber, octokit, owner, repo };

	try {
		const action = github.context.payload?.action;
		const payloadComment = (
			github.context.payload?.comment as { body?: string } | undefined
		)?.body;
		const payloadLabels = (
			github.context.payload?.issue as
				| { labels?: Array<string | { name?: string }> }
				| undefined
		)?.labels;

		if (!isDeveloperTrigger(payloadLabels ?? [], action, payloadComment)) {
			console.log(
				"Issue is not ready for development. Skipping developer agent.",
			);
			return;
		}

		const { conversation, issue } = await fetchIssueContext(ctx);

		const branchName = sanitizeBranchName(issue.title, issueNumber, issue.body);

		// Quiet state transition: remove dev-needed, add dev-in-progress (no noise comment)
		await transitionState(ctx, issue.labels, {
			add: [DEV_IN_PROGRESS_LABEL],
			remove: [DEV_NEEDED_LABEL],
		});

		const skillInstruction = await readFile(
			".github/skills/developer-agent.md",
			"utf-8",
		);

		const promptText = `Developer Ticket (Issue #${issue.number} - ${issue.title}):\n\n${conversation}`;

		const implementationSummary = await generateDeveloperImplementation(
			ai,
			skillInstruction,
			promptText,
		);

		await postDeveloperCompletedComment(ctx, implementationSummary, branchName);
	} catch (error) {
		console.error("Developer Agent execution error:", error);
		await postIssueErrorComment(ctx, "Developer Agent", error);
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	run();
}
