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

export const READY_FOR_SPEC_LABEL = "ready-for-spec";
export const SPEC_READY_LABEL = "spec-ready";

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export function determineSkillPath(
	labels: Array<string | { name?: string }>,
): string {
	const labelNames = labels.map((l) =>
		typeof l === "string" ? l : (l.name ?? ""),
	);

	if (labelNames.includes(READY_FOR_SPEC_LABEL)) {
		return ".github/skills/to-spec.md";
	}

	return ".github/skills/grill-me.md";
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

	let conversation = `User Context (Issue Body): \n${issue.body}\n\n`;
	for (const comment of comments) {
		const role = comment.user?.type === "Bot" ? "Agent" : "User";
		conversation += `${role}: ${comment.body}\n\n`;
	}

	return { comments, conversation, issue };
}

export async function generateAgentResponse(
	ai: GoogleGenAI,
	systemInstruction: string,
	conversation: string,
): Promise<string> {
	const response = await ai.models.generateContent({
		config: {
			systemInstruction,
			thinkingConfig: {
				thinkingBudget: 2048,
			},
		},
		contents: conversation,
		model: "gemini-3.6-flash",
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
	const labelNames = labels.map((l) =>
		typeof l === "string" ? l : (l.name ?? ""),
	);

	if (labelNames.includes(labelToRemove)) {
		try {
			await octokit.rest.issues.removeLabel({
				issue_number: issueNumber,
				name: labelToRemove,
				owner,
				repo,
			});
		} catch {
			// Ignore 404 if label was not present
		}
	}
}

export async function executeSpecPublishing(
	octokit: OctokitClient,
	specText: string,
	issueLabels: Array<string | { name?: string }>,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	await octokit.rest.issues.update({
		body: specText,
		issue_number: issueNumber,
		owner,
		repo,
	});

	await removeLabelIfPresent(
		octokit,
		issueLabels,
		READY_FOR_SPEC_LABEL,
		issueNumber,
		owner,
		repo,
	);

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

	if (responseText.includes("All requirements clarified!")) {
		await octokit.rest.issues.addLabels({
			issue_number: issueNumber,
			labels: [READY_FOR_SPEC_LABEL],
			owner,
			repo,
		});
	}
}

export async function run() {
	const issueNumber = parseInt(process.env.ISSUE_NUMBER ?? "0", 10);
	const owner = github.context.repo.owner;
	const repo = github.context.repo.repo;

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	try {
		const { conversation, issue } = await fetchIssueContext(
			octokit,
			issueNumber,
			owner,
			repo,
		);

		const skillPath = determineSkillPath(issue.labels);
		const systemInstruction = await readFile(skillPath, "utf-8");
		const responseText = await generateAgentResponse(
			ai,
			systemInstruction,
			conversation,
		);

		const isSpecPath = skillPath.endsWith("to-spec.md");
		if (isSpecPath) {
			await executeSpecPublishing(
				octokit,
				responseText,
				issue.labels,
				issueNumber,
				owner,
				repo,
			);
		} else {
			await executeGrilling(
				octokit,
				responseText,
				issue.labels,
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
