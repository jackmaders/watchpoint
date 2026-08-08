import { readFile } from "node:fs/promises";
import * as github from "@actions/github";
import { GoogleGenAI, Type } from "@google/genai";
import {
	APPROVED_LABEL,
	BOT_COMMENT_MARKER,
	CHANGES_REQUESTED_LABEL,
	extractLabelNames,
	type IssueContext,
	NEEDS_HUMAN_REVIEW_LABEL,
	postIssueErrorComment,
	REVIEW_ROUND_1_LABEL,
	REVIEW_ROUND_2_LABEL,
	removeLabelIfPresent,
} from "./pm-shared";

export type ReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "ESCALATE";

export interface ReviewFeedbackItem {
	category: "architectural" | "quality" | "testing" | "spec";
	description: string;
	file?: string;
	line?: number;
	severity: "blocking" | "non-blocking";
	title: string;
}

export interface ReviewDecisionData {
	decision: ReviewDecision;
	feedbackItems: ReviewFeedbackItem[];
	summary: string;
}

export function isReviewerTrigger(
	payloadAction?: string,
	latestComment?: string,
): boolean {
	const comment = latestComment ?? "";

	if (comment.includes("/review") || comment.includes("/re-review")) {
		return true;
	}

	return ["opened", "synchronize", "reopened"].includes(payloadAction ?? "");
}

export function determineReviewRound(
	labels: Array<string | { name?: string }>,
): "round-1" | "round-2" | "escalated" {
	const labelNames = extractLabelNames(labels);

	if (labelNames.includes(NEEDS_HUMAN_REVIEW_LABEL)) {
		return "escalated";
	}

	if (labelNames.includes(REVIEW_ROUND_1_LABEL)) {
		return "round-2";
	}

	return "round-1";
}

export async function fetchPRContext(ctx: IssueContext) {
	const { octokit, issueNumber, owner, repo } = ctx;

	const { data: pr } = await octokit.rest.pulls.get({
		owner,
		pull_number: issueNumber,
		repo,
	});

	const { data: files } = await octokit.rest.pulls.listFiles({
		owner,
		pull_number: issueNumber,
		repo,
	});

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		issue_number: issueNumber,
		owner,
		repo,
	});

	let conversation = `PR #${pr.number} - ${pr.title}\nBranch: ${pr.head.ref}\nBody:\n${pr.body ?? ""}\n\nChanged Files:\n`;
	for (const file of files) {
		conversation += `- ${file.filename} (${file.status})\n`;
		if (file.patch) {
			conversation += `\`\`\`diff\n${file.patch}\n\`\`\`\n`;
		}
	}

	let latestCommentText = "";
	for (const comment of comments) {
		const body = comment.body ?? "";
		const isBot =
			comment.user?.type === "Bot" || body.includes(BOT_COMMENT_MARKER);
		if (!isBot) {
			latestCommentText = body;
			conversation += `User Comment: ${body}\n\n`;
		}
	}

	return { comments, conversation, files, latestCommentText, pr };
}

export async function generateReviewDecision(
	ai: GoogleGenAI,
	systemInstruction: string,
	promptText: string,
): Promise<ReviewDecisionData> {
	const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

	const response = await ai.models.generateContent({
		config: {
			responseMimeType: "application/json",
			responseSchema: {
				properties: {
					decision: {
						enum: ["APPROVE", "REQUEST_CHANGES", "ESCALATE"],
						type: Type.STRING,
					},
					feedbackItems: {
						items: {
							properties: {
								category: {
									enum: ["architectural", "quality", "testing", "spec"],
									type: Type.STRING,
								},
								description: { type: Type.STRING },
								file: { type: Type.STRING },
								line: { type: Type.INTEGER },
								severity: {
									enum: ["blocking", "non-blocking"],
									type: Type.STRING,
								},
								title: { type: Type.STRING },
							},
							required: ["category", "title", "description", "severity"],
							type: Type.OBJECT,
						},
						type: Type.ARRAY,
					},
					summary: { type: Type.STRING },
				},
				required: ["decision", "summary", "feedbackItems"],
				type: Type.OBJECT,
			},
			systemInstruction,
			thinkingConfig: {
				thinkingBudget: 2048,
			},
		},
		contents: promptText,
		model,
	});

	if (!response.text) {
		throw new Error("Gemini returned an empty reviewer AI response.");
	}

	return JSON.parse(response.text) as ReviewDecisionData;
}

export async function postPRReviewAndLabels(
	ctx: IssueContext,
	reviewData: ReviewDecisionData,
	round: "round-1" | "round-2" | "escalated",
	initialLabels?: Array<string | { name?: string }>,
) {
	const { octokit, issueNumber, owner, repo } = ctx;
	const currentLabels =
		initialLabels ??
		(
			await octokit.rest.issues.get({
				issue_number: issueNumber,
				owner,
				repo,
			})
		).data.labels;

	const isEscalating =
		round === "escalated" ||
		reviewData.decision === "ESCALATE" ||
		(round === "round-2" && reviewData.decision === "REQUEST_CHANGES");

	if (isEscalating) {
		await removeLabelIfPresent(ctx, currentLabels, CHANGES_REQUESTED_LABEL);
		await removeLabelIfPresent(ctx, currentLabels, REVIEW_ROUND_1_LABEL);
		await removeLabelIfPresent(ctx, currentLabels, REVIEW_ROUND_2_LABEL);

		await octokit.rest.issues.addLabels({
			issue_number: issueNumber,
			labels: [NEEDS_HUMAN_REVIEW_LABEL],
			owner,
			repo,
		});

		const escalationBody = `${BOT_COMMENT_MARKER}
⚠️ **Reviewer AI Escalation: Human Review Required**

Automated code review iteration limit reached (2 rounds completed). Remaining blocking issues require human maintainer intervention.

### Summary
${reviewData.summary}

### Feedback Items
${reviewData.feedbackItems
	.map(
		(item) =>
			`- **[${item.severity.toUpperCase()}] ${item.title}** (${item.category}): ${item.description}`,
	)
	.join("\n")}
`;

		await octokit.rest.pulls.createReview({
			body: escalationBody,
			event: "COMMENT",
			owner,
			pull_number: issueNumber,
			repo,
		});
		return;
	}

	if (reviewData.decision === "REQUEST_CHANGES") {
		const nextRoundLabel =
			round === "round-1" ? REVIEW_ROUND_1_LABEL : REVIEW_ROUND_2_LABEL;

		await octokit.rest.issues.addLabels({
			issue_number: issueNumber,
			labels: [nextRoundLabel, CHANGES_REQUESTED_LABEL],
			owner,
			repo,
		});

		const reviewBody = `${BOT_COMMENT_MARKER}
🔍 **Reviewer AI Agent - Changes Requested (${round.toUpperCase()})**

### Summary
${reviewData.summary}

### Feedback & Action Items
${reviewData.feedbackItems
	.map(
		(item) =>
			`- **[${item.severity.toUpperCase()}] ${item.title}** (${item.category})${item.file ? ` at \`${item.file}\`` : ""}: ${item.description}`,
	)
	.join("\n")}
`;

		await octokit.rest.pulls.createReview({
			body: reviewBody,
			event: "REQUEST_CHANGES",
			owner,
			pull_number: issueNumber,
			repo,
		});
		return;
	}

	// APPROVE branch
	await removeLabelIfPresent(ctx, currentLabels, CHANGES_REQUESTED_LABEL);
	await removeLabelIfPresent(ctx, currentLabels, REVIEW_ROUND_1_LABEL);
	await removeLabelIfPresent(ctx, currentLabels, REVIEW_ROUND_2_LABEL);
	await removeLabelIfPresent(ctx, currentLabels, NEEDS_HUMAN_REVIEW_LABEL);

	await octokit.rest.issues.addLabels({
		issue_number: issueNumber,
		labels: [APPROVED_LABEL],
		owner,
		repo,
	});

	const approvalBody = `${BOT_COMMENT_MARKER}
✅ **Reviewer AI Agent - Pull Request Approved!**

### Summary
${reviewData.summary}

* Feature-Sliced Design Architecture: **Pass**
* Thermo-Nuclear Code Quality: **Pass**
* Test Standards & Coverage: **Pass**
`;

	await octokit.rest.pulls.createReview({
		body: approvalBody,
		event: "APPROVE",
		owner,
		pull_number: issueNumber,
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

		if (!isReviewerTrigger(action, payloadComment)) {
			console.log(
				"Trigger conditions not met. Skipping Reviewer AI Agent execution.",
			);
			return;
		}

		const { conversation, pr } = await fetchPRContext(ctx);
		const round = determineReviewRound(pr.labels);

		const skillInstruction = await readFile(
			".github/skills/reviewer-agent.md",
			"utf-8",
		);

		const reviewData = await generateReviewDecision(
			ai,
			skillInstruction,
			conversation,
		);

		await postPRReviewAndLabels(ctx, reviewData, round, pr.labels);
	} catch (error) {
		console.error("Reviewer AI Agent execution error:", error);
		await postIssueErrorComment(ctx, "Reviewer AI Agent", error);
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	run();
}
