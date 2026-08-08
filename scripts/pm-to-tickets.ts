import { readFile } from "node:fs/promises";
import * as github from "@actions/github";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

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

export const SPEC_READY_LABEL = "spec-ready";
export const READY_FOR_DEV_LABEL = "ready-for-dev";

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export interface IssueContext {
	octokit: OctokitClient;
	issueNumber: number;
	owner: string;
	repo: string;
}

export const TicketSchema = z.object({
	acceptanceCriteria: z.array(z.string()),
	blockers: z.array(z.string()),
	existingNumber: z.number().nullable().optional(),
	id: z.string(),
	title: z.string(),
	whatToBuild: z.string(),
});

export const TicketBreakdownSchema = z.object({
	tickets: z.array(TicketSchema),
});

export type Ticket = z.infer<typeof TicketSchema>;
export type TicketBreakdown = z.infer<typeof TicketBreakdownSchema>;

export function extractLabelNames(
	labels: Array<string | { name?: string }>,
): string[] {
	return labels.map((l) => (typeof l === "string" ? l : (l.name ?? "")));
}

export function formatChildIssueBody(params: {
	parentNumber: number;
	whatToBuild: string;
	acceptanceCriteria: string[];
	blockers: string[];
}): string {
	const { parentNumber, whatToBuild, acceptanceCriteria, blockers } = params;

	const criteriaList = acceptanceCriteria.map((c) => `- [ ] ${c}`).join("\n");
	const blockersList =
		blockers.length > 0
			? blockers.map((b) => `- ${b}`).join("\n")
			: "None — can start immediately";

	return `Parent: #${parentNumber}

## What to build

${whatToBuild}

## Acceptance criteria

${criteriaList || "- [ ] Complete implementation as specified"}

## Blocked by

${blockersList}
`;
}

export async function getOrCreateMilestone(
	ctx: IssueContext,
	milestoneTitle: string,
): Promise<number> {
	const { octokit, owner, repo } = ctx;

	const milestones = await octokit.rest.issues.listMilestones({
		owner,
		repo,
		state: "open",
	});

	const existing = milestones.data.find((m) => m.title === milestoneTitle);
	if (existing) {
		return existing.number;
	}

	const created = await octokit.rest.issues.createMilestone({
		owner,
		repo,
		title: milestoneTitle,
	});

	return created.data.number;
}

export async function parseTicketsFromAI(
	ai: GoogleGenAI,
	systemInstruction: string,
	promptText: string,
): Promise<TicketBreakdown> {
	const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
	const response = await ai.models.generateContent({
		config: {
			responseMimeType: "application/json",
			responseSchema: {
				properties: {
					tickets: {
						items: {
							properties: {
								acceptanceCriteria: {
									items: { type: Type.STRING },
									type: Type.ARRAY,
								},
								blockers: {
									items: { type: Type.STRING },
									type: Type.ARRAY,
								},
								existingNumber: { type: Type.INTEGER },
								id: { type: Type.STRING },
								title: { type: Type.STRING },
								whatToBuild: { type: Type.STRING },
							},
							required: [
								"id",
								"title",
								"whatToBuild",
								"acceptanceCriteria",
								"blockers",
							],
							type: Type.OBJECT,
						},
						type: Type.ARRAY,
					},
				},
				required: ["tickets"],
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

	const responseText = response.text;
	if (!responseText) {
		throw new Error("Gemini returned an empty or invalid response.");
	}

	const rawObj = JSON.parse(responseText);
	return TicketBreakdownSchema.parse(rawObj);
}

export async function createChildIssues(params: {
	ctx: IssueContext;
	parentNodeId: string;
	milestoneNumber: number;
	tickets: Ticket[];
}): Promise<
	Array<{ id: string; number: number; node_id: string; title: string }>
> {
	const { ctx, parentNodeId, milestoneNumber, tickets } = params;
	const { octokit, issueNumber, owner, repo } = ctx;

	const createdList: Array<{
		id: string;
		number: number;
		node_id: string;
		title: string;
	}> = [];
	const idToNumberMap = new Map<string, number>();

	for (const ticket of tickets) {
		const initialBlockers = ticket.blockers.map((b) => {
			const num = idToNumberMap.get(b);
			return num ? `#${num}` : b;
		});

		const initialBody = formatChildIssueBody({
			acceptanceCriteria: ticket.acceptanceCriteria,
			blockers: initialBlockers,
			parentNumber: issueNumber,
			whatToBuild: ticket.whatToBuild,
		});

		const { data: createdIssue } = await octokit.rest.issues.create({
			body: initialBody,
			labels: [READY_FOR_DEV_LABEL],
			milestone: milestoneNumber,
			owner,
			repo,
			title: ticket.title,
		});

		idToNumberMap.set(ticket.id, createdIssue.number);
		createdList.push({
			id: ticket.id,
			node_id: createdIssue.node_id,
			number: createdIssue.number,
			title: createdIssue.title,
		});

		// Native GraphQL sub-issue relationship mutation
		try {
			await octokit.graphql(
				`mutation($issueId: ID!, $subIssueId: ID!) {
					addSubIssue(input: { issueId: $issueId, subIssueId: $subIssueId }) {
						issue { id }
						subIssue { id }
					}
				}`,
				{
					headers: {
						"GraphQL-Features": "sub_issues",
					},
					issueId: parentNodeId,
					subIssueId: createdIssue.node_id,
				},
			);
		} catch (graphqlErr) {
			console.warn(
				"GraphQL addSubIssue failed (may not be supported on repo):",
				graphqlErr,
			);
		}
	}

	// Update ticket descriptions with finalized blocking issue numbers
	for (const created of createdList) {
		const originalTicket = tickets.find((t) => t.id === created.id);
		if (!originalTicket) continue;

		const mappedBlockers = originalTicket.blockers.map((b) => {
			const num = idToNumberMap.get(b);
			return num ? `#${num}` : b;
		});

		const finalBody = formatChildIssueBody({
			acceptanceCriteria: originalTicket.acceptanceCriteria,
			blockers: mappedBlockers,
			parentNumber: issueNumber,
			whatToBuild: originalTicket.whatToBuild,
		});

		await octokit.rest.issues.update({
			body: finalBody,
			issue_number: created.number,
			owner,
			repo,
		});
	}

	return createdList;
}

export function findMatchingChildIssue<
	T extends { number: number; title: string },
>(
	existingChildIssues: T[],
	matchedNumbers: Set<number>,
	ticket: Ticket,
): T | undefined {
	return (
		existingChildIssues.find(
			(existing) =>
				!matchedNumbers.has(existing.number) &&
				ticket.existingNumber === existing.number,
		) ??
		existingChildIssues.find(
			(existing) =>
				!matchedNumbers.has(existing.number) &&
				existing.title.toLowerCase().trim() ===
					ticket.title.toLowerCase().trim(),
		)
	);
}

export async function closeObsoleteChildIssues(
	ctx: IssueContext,
	existingChildIssues: Array<{ number: number; state?: string }>,
	matchedNumbers: Set<number>,
) {
	const { octokit, owner, repo } = ctx;
	for (const existing of existingChildIssues) {
		if (!matchedNumbers.has(existing.number) && existing.state !== "closed") {
			await octokit.rest.issues.createComment({
				body: "ℹ️ **Notice:** This ticket is obsolete based on the latest specification update and has been closed.",
				issue_number: existing.number,
				owner,
				repo,
			});

			await octokit.rest.issues.update({
				issue_number: existing.number,
				owner,
				repo,
				state: "closed",
				state_reason: "not_planned",
			});
		}
	}
}

export async function reviewAndUpdateChildIssues(params: {
	ctx: IssueContext;
	parentNodeId: string;
	milestoneNumber: number;
	existingChildIssues: Array<{
		number: number;
		title: string;
		body?: string | null;
		node_id: string;
		state?: string;
	}>;
	newTickets: Ticket[];
}) {
	const {
		ctx,
		parentNodeId,
		milestoneNumber,
		existingChildIssues,
		newTickets,
	} = params;
	const { octokit, issueNumber, owner, repo } = ctx;

	const matchedNumbers = new Set<number>();
	const updatedList: Array<{
		id: string;
		number: number;
		node_id: string;
		title: string;
	}> = [];
	const idToNumberMap = new Map<string, number>();

	for (const ticket of newTickets) {
		const match = findMatchingChildIssue(
			existingChildIssues,
			matchedNumbers,
			ticket,
		);

		const mappedBlockers = ticket.blockers.map((b) => {
			const num = idToNumberMap.get(b);
			return num ? `#${num}` : b;
		});

		const bodyContent = formatChildIssueBody({
			acceptanceCriteria: ticket.acceptanceCriteria,
			blockers: mappedBlockers,
			parentNumber: issueNumber,
			whatToBuild: ticket.whatToBuild,
		});

		if (match) {
			matchedNumbers.add(match.number);
			idToNumberMap.set(ticket.id, match.number);

			await octokit.rest.issues.update({
				body: bodyContent,
				issue_number: match.number,
				labels: [READY_FOR_DEV_LABEL],
				milestone: milestoneNumber,
				owner,
				repo,
				state: "open",
				title: ticket.title,
			});

			updatedList.push({
				id: ticket.id,
				node_id: match.node_id,
				number: match.number,
				title: ticket.title,
			});
		} else {
			const { data: createdIssue } = await octokit.rest.issues.create({
				body: bodyContent,
				labels: [READY_FOR_DEV_LABEL],
				milestone: milestoneNumber,
				owner,
				repo,
				title: ticket.title,
			});

			idToNumberMap.set(ticket.id, createdIssue.number);
			updatedList.push({
				id: ticket.id,
				node_id: createdIssue.node_id,
				number: createdIssue.number,
				title: createdIssue.title,
			});

			try {
				await octokit.graphql(
					`mutation($issueId: ID!, $subIssueId: ID!) {
						addSubIssue(input: { issueId: $issueId, subIssueId: $subIssueId }) {
							issue { id }
							subIssue { id }
						}
					}`,
					{
						headers: { "GraphQL-Features": "sub_issues" },
						issueId: parentNodeId,
						subIssueId: createdIssue.node_id,
					},
				);
			} catch (graphqlErr) {
				console.warn("GraphQL addSubIssue failed:", graphqlErr);
			}
		}
	}

	await closeObsoleteChildIssues(ctx, existingChildIssues, matchedNumbers);
	return updatedList;
}

export async function closeParentIssueIfSafe(params: {
	ctx: IssueContext;
	parentIssueNumber: number;
	childIssues: Array<{ number: number; title: string }>;
	milestoneTitle: string;
}) {
	const { ctx, parentIssueNumber, childIssues, milestoneTitle } = params;
	const { octokit, owner, repo } = ctx;

	const childLinks = childIssues
		.map((c) => `- #${c.number} (${c.title})`)
		.join("\n");

	const commentBody = `🎯 **Specification Breakdown Complete!**

All ${childIssues.length} child issues created/updated and linked under milestone **${milestoneTitle}**:

${childLinks}

Parent specification ticket will now be closed.`;

	await octokit.rest.issues.createComment({
		body: commentBody,
		issue_number: parentIssueNumber,
		owner,
		repo,
	});

	await octokit.rest.issues.update({
		issue_number: parentIssueNumber,
		owner,
		repo,
		state: "closed",
		state_reason: "completed",
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
		const { data: issue } = await octokit.rest.issues.get({
			issue_number: issueNumber,
			owner,
			repo,
		});

		const labels = extractLabelNames(issue.labels);
		if (!labels.includes(SPEC_READY_LABEL)) {
			console.log(
				"Issue does not have spec-ready label. Skipping to-tickets workflow.",
			);
			return;
		}

		const milestoneTitle = `[Spec] ${issue.title}`;
		const milestoneNumber = await getOrCreateMilestone(ctx, milestoneTitle);

		const skillInstruction = await readFile(
			".github/skills/to-tickets.md",
			"utf-8",
		);
		const promptText = `Specification Document (Issue #${issue.number} - ${issue.title}):\n\n${issue.body ?? ""}`;

		const breakdown = await parseTicketsFromAI(
			ai,
			skillInstruction,
			promptText,
		);

		// Check for existing child issues under milestone or parent ref
		const { data: existingIssues } = await octokit.rest.issues.listForRepo({
			milestone: `${milestoneNumber}`,
			owner,
			repo,
			state: "all",
		});

		const existingChildIssues = existingIssues.filter(
			(i) =>
				i.number !== issueNumber &&
				(i.body ?? "").includes(`Parent: #${issueNumber}`),
		);

		let resultChildIssues: Array<{ number: number; title: string }>;

		if (existingChildIssues.length > 0) {
			resultChildIssues = await reviewAndUpdateChildIssues({
				ctx,
				existingChildIssues,
				milestoneNumber,
				newTickets: breakdown.tickets,
				parentNodeId: issue.node_id,
			});
		} else {
			resultChildIssues = await createChildIssues({
				ctx,
				milestoneNumber,
				parentNodeId: issue.node_id,
				tickets: breakdown.tickets,
			});
		}

		await closeParentIssueIfSafe({
			childIssues: resultChildIssues,
			ctx,
			milestoneTitle,
			parentIssueNumber: issueNumber,
		});
	} catch (error) {
		console.error("to-tickets agent execution error:", error);
		try {
			await octokit.rest.issues.createComment({
				body: "⚠️ **To-Tickets Agent Error:** An error occurred while generating child tickets. Please try again.",
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

if (process.env.NODE_ENV !== "test") {
	run();
}
