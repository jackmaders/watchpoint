import type { IssueDetails } from "./types";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function inferType(text: string): string {
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
		const inferred = inferType(options.issue.title);
		const rawSlug = slugify(options.issue.title);
		const cleanSlug = stripLeadingVerb(rawSlug, inferred);
		return `${inferred}/issue-${options.issue.number}-${cleanSlug}`;
	}

	if (options.prompt) {
		const inferred = inferType(options.prompt);
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
		const conventionalPattern = /^\w+(\([^)]+\))?:\s*.+$/;
		if (conventionalPattern.test(options.title)) {
			return options.title;
		}
		const inferred = inferType(options.title);
		const emoji = inferred === "fix" ? "🐛" : "✨";
		const issueSuffix = options.issueNumber ? ` (#${options.issueNumber})` : "";
		return `${inferred}(core): ${emoji} ${options.title.toLowerCase()}${issueSuffix}`;
	}

	const prompt = options.prompt || "automated changes";
	const inferred = inferType(prompt);
	const emoji = inferred === "fix" ? "🐛" : "✨";
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
	return {
		body: `## Summary\n\nAutomated execution for task: "${prompt}" via Sandcastle Autonomous Agent.\n\n### Execution Details\n- **Target Branch**: \`${options.branch}\`\n- **Self-healing attempts**: ${options.attempts}\n- **Verification**: \`bun run check:all\` and \`bun run test:unit\` passed.\n`,
		title: `feat(core): ✨ ${prompt}`,
	};
}
