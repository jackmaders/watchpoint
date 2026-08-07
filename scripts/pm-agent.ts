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

const SPEC_READY_LABEL = "spec-ready";

interface CommentData {
	body?: string;
	user?: {
		type?: string;
		login?: string;
	} | null;
}

type OctokitClient = ReturnType<typeof github.getOctokit>;

function determineSkillPath(comments: CommentData[]): string {
	const userComments = comments.filter((c) => c.user?.type !== "Bot");
	const botComments = comments.filter((c) => c.user?.type === "Bot");

	const lastUserComment =
		userComments.length > 0 ? userComments[userComments.length - 1] : null;
	const lastBotComment =
		botComments.length > 0 ? botComments[botComments.length - 1] : null;

	const hasToSpecTrigger = lastUserComment?.body
		? /\b\/to-spec\b/i.test(lastUserComment.body)
		: false;

	const isGrillingComplete = lastBotComment?.body
		? lastBotComment.body.includes("All requirements clarified!")
		: false;

	const userRespondedAfterCompletion =
		isGrillingComplete &&
		lastUserComment &&
		lastBotComment &&
		comments.indexOf(lastUserComment) > comments.indexOf(lastBotComment);

	if (hasToSpecTrigger || userRespondedAfterCompletion) {
		return ".github/skills/to-spec.md";
	}

	return ".github/skills/grill-me.md";
}

async function fetchIssueContext(
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

async function generateAgentResponse(
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

async function executeSpecPublishing(
	octokit: OctokitClient,
	specText: string,
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

async function removeSpecReadyLabelIfPresent(
	octokit: OctokitClient,
	labels: Array<string | { name?: string }>,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	const labelNames = labels.map((l) =>
		typeof l === "string" ? l : (l.name ?? ""),
	);

	if (labelNames.includes(SPEC_READY_LABEL)) {
		try {
			await octokit.rest.issues.removeLabel({
				issue_number: issueNumber,
				name: SPEC_READY_LABEL,
				owner,
				repo,
			});
		} catch {
			// Ignore 404 if label was not present
		}
	}
}

async function executeGrilling(
	octokit: OctokitClient,
	responseText: string,
	issueLabels: Array<string | { name?: string }>,
	issueNumber: number,
	owner: string,
	repo: string,
) {
	await removeSpecReadyLabelIfPresent(
		octokit,
		issueLabels,
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

async function run() {
	const issueNumber = parseInt(process.env.ISSUE_NUMBER, 10);
	const owner = github.context.repo.owner;
	const repo = github.context.repo.repo;

	const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	try {
		const { comments, conversation, issue } = await fetchIssueContext(
			octokit,
			issueNumber,
			owner,
			repo,
		);

		const skillPath = determineSkillPath(comments);
		const systemInstruction = await Bun.file(skillPath).text();
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

run();
