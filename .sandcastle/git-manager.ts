import type { IssueDetails } from "./types";

export type CommitType =
	| "feat"
	| "fix"
	| "refactor"
	| "test"
	| "docs"
	| "chore";

const TYPE_EMOJIS: Record<CommitType, string> = {
	chore: "🔧",
	docs: "📝",
	feat: "✨",
	fix: "🐛",
	refactor: "♻️",
	test: "🧪",
};

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function inferCommitType(text: string): CommitType {
	const lower = text.toLowerCase();
	if (lower.startsWith("fix") || lower.includes("bug")) {
		return "fix";
	}
	if (lower.startsWith("refactor")) {
		return "refactor";
	}
	if (lower.startsWith("test")) {
		return "test";
	}
	if (lower.startsWith("docs")) {
		return "docs";
	}
	if (lower.startsWith("chore")) {
		return "chore";
	}
	return "feat";
}

function stripLeadingVerb(slug: string, verb: string): string {
	if (slug.startsWith(`${verb}-`)) {
		return slug.slice(verb.length + 1);
	}
	return slug;
}

export function generateBranchName(options: {
	issue?: { number: number; title: string };
	prompt?: string;
	customBranch?: string;
}): string {
	if (options.customBranch) {
		return options.customBranch;
	}

	if (options.issue) {
		const match = options.issue.title.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
		if (match) {
			const type = match[1].toLowerCase();
			const desc = match[3];
			const slug = slugify(desc);
			return `${type}/issue-${options.issue.number}-${slug}`;
		}
		const inferred = inferCommitType(options.issue.title);
		const rawSlug = slugify(options.issue.title);
		const cleanSlug = stripLeadingVerb(rawSlug, inferred);
		return `${inferred}/issue-${options.issue.number}-${cleanSlug}`;
	}

	if (options.prompt) {
		const inferred = inferCommitType(options.prompt);
		const rawSlug = slugify(options.prompt);
		const cleanSlug = stripLeadingVerb(rawSlug, inferred);
		return `${inferred}/${cleanSlug}`;
	}

	return `feat/agent-task-${Date.now()}`;
}

export function formatCommitMessage(options: {
	title?: string;
	prompt?: string;
	issueNumber?: number;
}): string {
	if (options.title) {
		const match = options.title.match(
			/^(\w+)(?:\(([^)]+)\))?:\s*(?:[^\p{L}\p{N}\s]+\s*)?(.+)$/u,
		);
		if (match) {
			const type = inferCommitType(match[1]);
			const scope = match[2] || "core";
			const desc = match[3].trim();
			const emoji = TYPE_EMOJIS[type];
			return `${type}(${scope}): ${emoji} ${desc}`;
		}
		const inferred = inferCommitType(options.title);
		const emoji = TYPE_EMOJIS[inferred];
		const issueSuffix = options.issueNumber ? ` (#${options.issueNumber})` : "";
		return `${inferred}(core): ${emoji} ${options.title.toLowerCase()}${issueSuffix}`;
	}

	const prompt = options.prompt || "automated changes";
	const inferred = inferCommitType(prompt);
	const emoji = TYPE_EMOJIS[inferred];
	return `${inferred}(core): ${emoji} ${prompt.toLowerCase()}`;
}

export function buildPrPayload(options: {
	issue?: IssueDetails;
	prompt?: string;
	branch: string;
	attempts: number;
}): { title: string; body: string } {
	if (options.issue) {
		return {
			body: `## Summary\n\nAutomated resolution for #${options.issue.number} via Sandcastle Autonomous Agent.\n\nCloses #${options.issue.number}\n\n### Execution Details\n- **Target Branch**: \`${options.branch}\`\n- **Self-healing attempts**: ${options.attempts}\n- **Verification**: \`bun run check:all\` and \`bun run test:unit\` passed.\n`,
			title: options.issue.title,
		};
	}

	const prompt = options.prompt || "Autonomous task execution";
	const inferred = inferCommitType(prompt);
	const emoji = TYPE_EMOJIS[inferred];
	return {
		body: `## Summary\n\nAutomated execution for task: "${prompt}" via Sandcastle Autonomous Agent.\n\n### Execution Details\n- **Target Branch**: \`${options.branch}\`\n- **Self-healing attempts**: ${options.attempts}\n- **Verification**: \`bun run check:all\` and \`bun run test:unit\` passed.\n`,
		title: `${inferred}(core): ${emoji} ${prompt}`,
	};
}
