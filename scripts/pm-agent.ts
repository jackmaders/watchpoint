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

const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const issueNumber = parseInt(process.env.ISSUE_NUMBER, 10);
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;

async function run() {
	const { data: issue } = await octokit.rest.issues.get({
		issue_number: issueNumber,
		owner,
		repo,
	});
	const { data: comments } = await octokit.rest.issues.listComments({
		issue_number: issueNumber,
		owner,
		repo,
	});

	let conversation = `User Context (Issue Body): \n${issue.body}\n\n`;
	for (const comment of comments) {
		const role = comment.user?.type === "Bot" ? "Agent" : "User";
		conversation += `${role}: ${comment.body}\n\n`;
	}

	const hasToSpecTrigger = conversation.includes("/to-spec");
	const lastComment =
		comments.length > 0 ? (comments[comments.length - 1]?.body ?? "") : "";
	const isGrillingComplete = lastComment.includes(
		"All requirements clarified!",
	);

	const skillPath =
		hasToSpecTrigger || isGrillingComplete
			? ".github/skills/to-spec.md"
			: ".github/skills/grill-me.md";

	const systemInstruction = await Bun.file(skillPath).text();

	const response = await ai.models.generateContent({
		config: {
			systemInstruction,
			thinkingConfig: {
				thinkingBudget: 1024,
			},
		},
		contents: conversation,
		model: "gemini-3.6-flash",
	});

	if (response.text) {
		await octokit.rest.issues.createComment({
			body: response.text,
			issue_number: issueNumber,
			owner,
			repo,
		});
	}
}

run().catch(console.error);
