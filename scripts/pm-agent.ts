import { readFile } from "node:fs/promises";
import * as github from "@actions/github";
import { GoogleGenAI } from "@google/genai";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GITHUB_TOKEN: string;
			GEMINI_API_KEY: string;
			ISSUE_NUMBER: string;
		}
	}
}

export const SPEC_READY_LABEL = "spec-ready";
export const TO_SPEC_TRIGGER_REGEX = /<!--\s*Trigger:\s*["']to-spec["']\s*-->/i;

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export function extractLabelNames(
	labels: Array<string | { name?: string }>,
): string[] {
	return labels.map((l) => (typeof l === "string" ? l : (l.name ?? "")));
}

export function determineSkillPath(
	labels: Array<string | { name?: string }>,
	latestUserComment?: string,
): string | null {
	const labelNames = extractLabelNames(labels);
	const commentText = latestUserComment ?? "";

	if (commentText.includes("/to-spec")) {
		return ".github/skills/to-spec.md";
	}

	if (commentText.includes("/grill")) {
		return ".github/skills/grill-me.md";
	}

	if (labelNames.includes(SPEC_READY_LABEL)) {
		return null;
	}

	return ".github/skills/grill-me.md";
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

export async function fetchIssueContext(
	octokit: OctokitClient,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	const { data: issue } = await octokit.rest.issues.get({
		issue_number: issueNumber,
		owner,
		repo,
	});

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		issue_number: issueNumber,
		owner,
		repo,
	});

	const issueBodyText = issue.body ?? "";
	let conversation = `User Context (Issue Body): \n${issueBodyText}\n\n`;
	let latestUserComment = "";

	for (const comment of comments) {
		const commentBody = comment.body ?? "";
		if (
			commentBody.includes("PM Agent Error") ||
			commentBody.includes("Feature Specification Published!") ||
			commentBody.includes("synthesized our discussion")
		) {
			continue;
		}

		const isBot = comment.user?.type === "Bot";
		const role = isBot ? "Agent" : "User";
		if (!isBot) {
			latestUserComment = commentBody;
		}
		conversation += `${role}: ${commentBody}\n\n`;
	}

	return { comments, conversation, issue, latestUserComment };
}

export async function generateAgentResponse(
	ai: GoogleGenAI,
	systemInstruction: string,
	conversation: string,
): Promise<string> {
	const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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

export async function removeLabelIfPresent(
	octokit: OctokitClient,
	labels: Array<string | { name?: string }>,
	labelToRemove: string,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	const labelNames = extractLabelNames(labels);

	if (labelNames.includes(labelToRemove)) {
		try {
			await octokit.rest.issues.removeLabel({
				issue_number: issueNumber,
				name: labelToRemove,
				owner,
				repo,
			});
		} catch (error: unknown) {
			if (
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				(error as { status?: number }).status === 404
			) {
				return;
			}
			// Rethrow error if not 404
			throw error;
		}
	}
}

export async function executeSpecPublishing(
	octokit: OctokitClient,
	specText: string,
	issueNumber: number,
	owner: string,
	repo: string,
	originalBody?: string | null,
) {
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

	await octokit.rest.issues.addLabels({
		issue_number: issueNumber,
		labels: [SPEC_READY_LABEL],
		owner,
		repo,
	});

	await octokit.rest.issues.createComment({
		body: "✅ **Feature Specification Published!**\n\nI have synthesized our discussion and updated the issue description above with the formal feature specification. Applied the `spec-ready` label.",
		issue_number: issueNumber,
		owner,
		repo,
	});
}

export async function executeGrilling(
	octokit: OctokitClient,
	responseText: string,
	issueLabels: Array<string | { name?: string }>,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	await removeLabelIfPresent(
		octokit,
		issueLabels,
		SPEC_READY_LABEL,
		issueNumber,
		owner,
		repo,
	);

	await octokit.rest.issues.createComment({
		body: responseText,
		issue_number: issueNumber,
		owner,
		repo,
	});
}

export async function handleGrillingFlow(
	octokit: OctokitClient,
	ai: GoogleGenAI,
	responseText: string,
	issue: { body?: string | null; labels: Array<string | { name?: string }> },
	conversation: string,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	await executeGrilling(
		octokit,
		responseText,
		issue.labels,
		issueNumber,
		owner,
		repo,
	);

	const isCompleted =
		TO_SPEC_TRIGGER_REGEX.test(responseText) ||
		responseText.includes("All requirements clarified");

	if (isCompleted) {
		const toSpecInstruction = await readFile(
			".github/skills/to-spec.md",
			"utf-8",
		);
		const updatedConversation = `${conversation}\nAgent: ${responseText}\n\n`;
		const specText = await generateAgentResponse(
			ai,
			toSpecInstruction,
			updatedConversation,
		);

		await executeSpecPublishing(
			octokit,
			specText,
			issueNumber,
			owner,
			repo,
			issue.body,
		);
	}
}

export async function run() {
	const issueNumber = parseInt(process.env.ISSUE_NUMBER ?? "0", 10);
	const owner = github.context.repo.owner;
	const repo = github.context.repo.repo;

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	try {
		const { conversation, issue, latestUserComment } = await fetchIssueContext(
			octokit,
			issueNumber,
			owner,
			repo,
		);

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
			await executeSpecPublishing(
				octokit,
				responseText,
				issueNumber,
				owner,
				repo,
				issue.body,
			);
		} else {
			await handleGrillingFlow(
				octokit,
				ai,
				responseText,
				issue,
				conversation,
				issueNumber,
				owner,
				repo,
			);
		}
	} catch (error) {
		console.error("PM Agent execution error:", error);
		try {
			await octokit.rest.issues.createComment({
				body: "⚠️ **PM Agent Error:** An error occurred while processing this ideation step. Please try again.",
				issue_number: issueNumber,
				owner,
				repo,
			});
		} catch (commentError) {
			console.error("Failed to post error comment:", commentError);
		}
		process.exit(1);
	}
}

if (!process.env.VITEST) {
	run();
}
