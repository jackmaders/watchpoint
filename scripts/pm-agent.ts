import { readFile } from "node:fs/promises";
import * as github from "@actions/github";
import { GoogleGenAI } from "@google/genai";
import {
	extractLabelNames,
	fetchIssueContext,
	type IssueContext,
	postIssueErrorComment,
	removeLabelIfPresent,
	SPEC_NEEDED_LABEL,
	SPEC_READY_LABEL,
	transitionState,
} from "./pm-shared";

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

export const TO_SPEC_TRIGGER_REGEX = /<!--\s*Trigger:\s*["']to-spec["']\s*-->/i;

export type AgentAction =
	| { type: "GRILL"; responseText: string }
	| { type: "PUBLISH_SPEC"; specText: string };

export function determineSkillPath(
	labels: Array<string | { name?: string }>,
	latestUserComment?: string,
): string | null {
	const labelNames = extractLabelNames(labels);
	const commentText = latestUserComment ?? "";

	if (commentText.includes("/to-spec") || commentText.includes("/spec")) {
		return ".github/skills/to-spec.md";
	}

	if (commentText.includes("/grill")) {
		return ".github/skills/grill-me.md";
	}

	if (labelNames.includes(SPEC_NEEDED_LABEL)) {
		return ".github/skills/grill-me.md";
	}

	return null;
}

export function extractOriginalProposal(body?: string | null): string {
	if (!body) return "";
	const detailsMatch = body.match(
		/<details>\s*<summary>📜 Original Issue Proposal<\/summary>\s*([\s\S]*?)\s*<\/details>/i,
	);
	if (detailsMatch?.[1]) {
		return detailsMatch[1].trim();
	}
	return body.trim();
}

export function parseAgentAction(responseText: string): AgentAction {
	if (TO_SPEC_TRIGGER_REGEX.test(responseText)) {
		const specText = responseText.replace(TO_SPEC_TRIGGER_REGEX, "").trim();
		return { specText, type: "PUBLISH_SPEC" };
	}
	return { responseText, type: "GRILL" };
}

export async function generateAgentResponse(
	ai: GoogleGenAI,
	systemInstruction: string,
	conversation: string,
): Promise<string> {
	const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
	const response = await ai.models.generateContent({
		config: {
			systemInstruction,
			thinkingConfig: {
				thinkingBudget: 2048,
			},
		},
		contents: conversation,
		model,
	});

	if (!response.text) {
		throw new Error("Gemini returned an empty response.");
	}

	return response.text;
}

export async function executeSpecPublishing(
	ctx: IssueContext,
	specText: string,
	originalBody?: string | null,
) {
	const { octokit, issueNumber, owner, repo } = ctx;
	const cleanProposal = extractOriginalProposal(originalBody);
	let bodyToPublish = specText;
	if (cleanProposal.length > 0) {
		bodyToPublish = `${specText}\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\n\n${cleanProposal}\n</details>`;
	}

	await octokit.rest.issues.update({
		body: bodyToPublish,
		issue_number: issueNumber,
		owner,
		repo,
	});

	await transitionState(ctx, [], {
		add: [SPEC_READY_LABEL],
		remove: [SPEC_NEEDED_LABEL],
	});

	await octokit.rest.issues.createComment({
		body: "✅ **Feature Specification Published!**\n\nI have synthesized our discussion and updated the issue description above with the formal feature specification. Applied the `spec-ready` label.",
		issue_number: issueNumber,
		owner,
		repo,
	});
}

export async function executeGrilling(
	ctx: IssueContext,
	responseText: string,
	issueLabels: Array<string | { name?: string }>,
) {
	await removeLabelIfPresent(ctx, issueLabels, SPEC_READY_LABEL);

	await ctx.octokit.rest.issues.createComment({
		body: responseText,
		issue_number: ctx.issueNumber,
		owner: ctx.owner,
		repo: ctx.repo,
	});
}

export async function executeAction(
	ctx: IssueContext,
	ai: GoogleGenAI,
	action: AgentAction,
	issue: { body?: string | null; labels: Array<string | { name?: string }> },
	conversation: string,
) {
	if (action.type === "PUBLISH_SPEC") {
		await executeSpecPublishing(ctx, action.specText, issue.body);
		return;
	}

	await executeGrilling(ctx, action.responseText, issue.labels);

	const isCompleted = TO_SPEC_TRIGGER_REGEX.test(action.responseText);

	if (isCompleted) {
		const toSpecInstruction = await readFile(
			".github/skills/to-spec.md",
			"utf-8",
		);
		const updatedConversation = `${conversation}\nAgent: ${action.responseText}\n\n`;
		const specText = await generateAgentResponse(
			ai,
			toSpecInstruction,
			updatedConversation,
		);

		await executeSpecPublishing(ctx, specText, issue.body);
	}
}

export async function run() {
	const issueNumber = parseInt(process.env.ISSUE_NUMBER ?? "0", 10);
	const owner = github.context.repo.owner;
	const repo = github.context.repo.repo;

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	const ctx: IssueContext = { issueNumber, octokit, owner, repo };

	try {
		const { conversation, issue, latestUserComment } =
			await fetchIssueContext(ctx);

		const skillPath = determineSkillPath(issue.labels, latestUserComment);
		if (!skillPath) {
			console.log(
				"Issue has spec-ready label and no override command. Skipping PM agent grilling.",
			);
			return;
		}

		const systemInstruction = await readFile(skillPath, "utf-8");
		const responseText = await generateAgentResponse(
			ai,
			systemInstruction,
			conversation,
		);

		if (skillPath.endsWith("to-spec.md")) {
			await executeSpecPublishing(ctx, responseText, issue.body);
		} else {
			const action = parseAgentAction(responseText);
			await executeAction(ctx, ai, action, issue, conversation);
		}
	} catch (error) {
		console.error("PM Agent execution error:", error);
		await postIssueErrorComment(ctx, "PM Agent", error);
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	run();
}
