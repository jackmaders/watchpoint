import { readFile } from "node:fs/promises";
import * as github from "@actions/github";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
	BOT_COMMENT_MARKER,
	extractLabelNames,
	fetchIssueContext,
	type IssueContext,
	postIssueErrorComment,
	READY_FOR_DEV_LABEL,
	REFINED_LABEL,
	removeLabelIfPresent,
	SPEC_READY_LABEL,
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

export const TicketSchema = z.object({
	acceptanceCriteria: z.array(z.string()),
	blockers: z.array(z.string()),
	existingNumber: z.number().nullable().optional(),
	id: z.string(),
	implementationSteps: z.array(z.string()).optional(),
	targetFiles: z.array(z.string()).optional(),
	technicalConstraints: z.array(z.string()).optional(),
	title: z.string(),
	whatToBuild: z.string(),
});

export const TicketBreakdownSchema = z.object({
	tickets: z.array(TicketSchema),
});

export type Ticket = z.infer<typeof TicketSchema>;
export type TicketBreakdown = z.infer<typeof TicketBreakdownSchema>;

function unwrapZodType(val: z.ZodTypeAny): {
	unwrapped: z.ZodTypeAny;
	isOptional: boolean;
} {
	let unwrapped = val;
	let isOptional = false;

	while (
		unwrapped instanceof z.ZodDefault ||
		unwrapped instanceof z.ZodOptional ||
		unwrapped instanceof z.ZodNullable
	) {
		if (
			unwrapped instanceof z.ZodOptional ||
			unwrapped instanceof z.ZodNullable
		) {
			isOptional = true;
		}
		unwrapped = (unwrapped as unknown as { _def: { innerType: z.ZodTypeAny } })
			._def.innerType;
	}

	return { isOptional, unwrapped };
}

function getObjectGeminiProperties(shape: Record<string, z.ZodTypeAny>) {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];

	for (const [key, value] of Object.entries(shape)) {
		const { unwrapped, isOptional } = unwrapZodType(value);
		properties[key] = zodToGeminiSchema(unwrapped);
		if (!isOptional) {
			required.push(key);
		}
	}

	return { properties, required };
}

export function zodToGeminiSchema(schema: z.ZodTypeAny): unknown {
	if (schema instanceof z.ZodObject) {
		const { properties, required } = getObjectGeminiProperties(schema.shape);
		return {
			properties,
			type: Type.OBJECT,
			...(required.length > 0 ? { required } : {}),
		};
	}

	if (schema instanceof z.ZodArray) {
		const element = (schema as unknown as { element: z.ZodTypeAny }).element;
		return {
			items: zodToGeminiSchema(element),
			type: Type.ARRAY,
		};
	}

	if (schema instanceof z.ZodString) return { type: Type.STRING };
	if (schema instanceof z.ZodNumber) return { type: Type.INTEGER };
	if (schema instanceof z.ZodBoolean) return { type: Type.BOOLEAN };

	return { type: Type.STRING };
}

export function formatChildIssueBody(params: {
	parentNumber: number;
	ticketId?: string;
	whatToBuild: string;
	targetFiles?: string[];
	technicalConstraints?: string[];
	implementationSteps?: string[];
	acceptanceCriteria: string[];
	blockers: string[];
}): string {
	const {
		parentNumber,
		ticketId,
		whatToBuild,
		targetFiles = [],
		technicalConstraints = [],
		implementationSteps = [],
		acceptanceCriteria,
		blockers,
	} = params;

	const targetFilesList =
		targetFiles.length > 0
			? targetFiles.map((f) => `* ${f}`).join("\n")
			: "* `src/_pages/` implementation files and corresponding tests";

	const constraintsList =
		technicalConstraints.length > 0
			? technicalConstraints.map((c) => `* ${c}`).join("\n")
			: "* Follow Red -> Green -> Refactor TDD workflow\n* No inline business logic or UI rendering in `app/` routes";

	const stepsList =
		implementationSteps.length > 0
			? implementationSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")
			: "1. **Red (Test First):** Write failing test for slice functionality.\n2. **Implementation:** Implement schema, logic, and UI.\n3. **Green & Refactor:** Verify tests pass and clean up code.";

	const criteriaList = acceptanceCriteria.map((c) => `- [ ] ${c}`).join("\n");
	const blockersList =
		blockers.length > 0
			? blockers.map((b) => `* ${b}`).join("\n")
			: "None — can start immediately";

	const keyComment = ticketId ? `\n<!-- spec-ticket-key: ${ticketId} -->` : "";

	return `Parent: #${parentNumber}${keyComment}

## 1. Goal & Context ("What to Build")

${whatToBuild}

## 2. Target File Scope & FSD Architecture

${targetFilesList}

## 3. Technical Constraints & Contracts

${constraintsList}

## 4. Step-by-Step Implementation Guide

${stepsList}

## 5. Acceptance Criteria & Definition of Done

${criteriaList || "- [ ] Complete implementation as specified"}
- [ ] FSD architecture check passes (\`bun run check:architecture\`)
- [ ] 100% test coverage threshold met (\`bun run test:coverage\`)

## 6. Blocked By

${blockersList}

## 7. Verification Commands
\`\`\`bash
bun run check:architecture
bun run test:coverage
\`\`\`
`;
}

export function topologicalSortTickets(tickets: Ticket[]): Ticket[] {
	const result: Ticket[] = [];
	const visited = new Set<string>();
	const ticketMap = new Map<string, Ticket>(tickets.map((t) => [t.id, t]));

	function visit(ticket: Ticket, ancestors = new Set<string>()) {
		if (visited.has(ticket.id)) return;
		if (ancestors.has(ticket.id)) {
			return;
		}

		ancestors.add(ticket.id);

		for (const blockerId of ticket.blockers) {
			const blockerTicket = ticketMap.get(blockerId);
			if (blockerTicket && !visited.has(blockerTicket.id)) {
				visit(blockerTicket, new Set(ancestors));
			}
		}

		ancestors.delete(ticket.id);
		visited.add(ticket.id);
		result.push(ticket);
	}

	for (const ticket of tickets) {
		if (!visited.has(ticket.id)) {
			visit(ticket);
		}
	}

	return result;
}

export async function getOrCreateMilestone(
	ctx: IssueContext,
	parentIssueNumber: number,
	parentIssueTitle: string,
): Promise<number> {
	const { octokit, owner, repo } = ctx;
	const milestoneTitle = `[Spec #${parentIssueNumber}] ${parentIssueTitle}`;
	const prefix = `[Spec #${parentIssueNumber}]`;

	const milestones = await octokit.rest.issues.listMilestones({
		owner,
		repo,
		state: "open",
	});

	const existing = milestones.data.find(
		(m) => m.title === milestoneTitle || m.title.startsWith(prefix),
	);
	if (existing) {
		if (existing.title !== milestoneTitle) {
			await octokit.rest.issues.updateMilestone({
				milestone_number: existing.number,
				owner,
				repo,
				title: milestoneTitle,
			});
		}
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
			responseSchema: zodToGeminiSchema(TicketBreakdownSchema) as Record<
				string,
				unknown
			>,
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

export function findMatchingChildIssue<
	T extends { number: number; title: string; body?: string | null },
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
				Boolean(
					existing.body?.includes(`<!-- spec-ticket-key: ${ticket.id} -->`),
				),
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
	const sortedTickets = topologicalSortTickets(newTickets);

	for (const ticket of sortedTickets) {
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
			implementationSteps: ticket.implementationSteps,
			parentNumber: issueNumber,
			targetFiles: ticket.targetFiles,
			technicalConstraints: ticket.technicalConstraints,
			ticketId: ticket.id,
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

export async function createChildIssues(params: {
	ctx: IssueContext;
	parentNodeId: string;
	milestoneNumber: number;
	tickets: Ticket[];
}): Promise<
	Array<{ id: string; number: number; node_id: string; title: string }>
> {
	return reviewAndUpdateChildIssues({
		ctx: params.ctx,
		existingChildIssues: [],
		milestoneNumber: params.milestoneNumber,
		newTickets: params.tickets,
		parentNodeId: params.parentNodeId,
	});
}

export async function postBreakdownSummaryComment(params: {
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

	const commentBody = `${BOT_COMMENT_MARKER}\n🎯 **Specification Breakdown Complete!**

All ${childIssues.length} child issues created/updated and linked under milestone **${milestoneTitle}**:

${childLinks}`;

	await octokit.rest.issues.createComment({
		body: commentBody,
		issue_number: parentIssueNumber,
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
		const { conversation, issue } = await fetchIssueContext(ctx);

		const labels = extractLabelNames(issue.labels);

		// Handle issue reopening: strip spec-ready label to prevent auto-close loop
		if (github.context.payload?.action === "reopened") {
			if (labels.includes(SPEC_READY_LABEL)) {
				await removeLabelIfPresent(ctx, issue.labels, SPEC_READY_LABEL);
				await octokit.rest.issues.createComment({
					body: `${BOT_COMMENT_MARKER}\n` + "ℹ️ **Issue Reopened:** Removed `spec-ready` label so the specification can be edited and refined. Re-apply `spec-ready` when ready to generate updated child tickets.",
					issue_number: issueNumber,
					owner,
					repo,
				});
			}
			return;
		}

		if (!labels.includes(SPEC_READY_LABEL)) {
			console.log(
				"Issue does not have spec-ready label. Skipping to-tickets workflow.",
			);
			return;
		}

		const milestoneTitle = `[Spec #${issue.number}] ${issue.title}`;
		const milestoneNumber = await getOrCreateMilestone(
			ctx,
			issue.number,
			issue.title,
		);

		// Check for existing child issues prior to AI generation
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

		let existingContext = "";
		if (existingChildIssues.length > 0) {
			existingContext = `\nExisting Child Issues currently linked to this spec:\n${existingChildIssues.map((i) => `- Issue #${i.number}: "${i.title}"`).join("\n")}\nIf a ticket corresponds to an existing child issue, specify its issue number as existingNumber integer.\n`;
		}

		const skillInstruction = await readFile(
			".github/skills/to-tickets.md",
			"utf-8",
		);
		const promptText = `Specification Document & Conversation (Issue #${issue.number} - ${issue.title}):\n\n${conversation}${existingContext}`;

		const breakdown = await parseTicketsFromAI(
			ai,
			skillInstruction,
			promptText,
		);

		const resultChildIssues = await reviewAndUpdateChildIssues({
			ctx,
			existingChildIssues,
			milestoneNumber,
			newTickets: breakdown.tickets,
			parentNodeId: issue.node_id,
		});

		await postBreakdownSummaryComment({
			childIssues: resultChildIssues,
			ctx,
			milestoneTitle,
			parentIssueNumber: issueNumber,
		});

		// Transition labels: remove spec-ready and add refined
		await removeLabelIfPresent(ctx, issue.labels, SPEC_READY_LABEL);
		await octokit.rest.issues.addLabels({
			issue_number: issueNumber,
			labels: [REFINED_LABEL],
			owner,
			repo,
		});
	} catch (error) {
		console.error("to-tickets agent execution error:", error);
		await postIssueErrorComment(ctx, "Spec-to-Tickets Agent", error);
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	run();
}
