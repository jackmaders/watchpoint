import { DefaultGithubClient } from "../github/client";
import { IssueAlreadyClaimedError } from "../github/errors";
import { resolveFrontier } from "../github/frontier";
import type { CandidateIssue, GithubClient } from "../github/types";
import type { AgentType } from "../types";
import { MockAgentRunner } from "../workflow/agent-runner";
import type { ExecutionResult } from "../workflow/types";
import { executeTicketWorkflow } from "../workflow/workflow";
import { renderInteractivePicker } from "./picker";
import type { PickCliArgs, PickCommandOptions } from "./types";

const VALID_AGENTS: readonly AgentType[] = ["agy", "gemini", "codex", "claude"];
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";

export function defaultPickLogger(msg: string): void {
	console.log(msg);
}

function parseAgent(val: string): AgentType {
	const candidate = val as AgentType;
	if (!VALID_AGENTS.includes(candidate)) {
		throw new Error(
			`Unsupported agent: ${candidate}. Expected one of: ${VALID_AGENTS.join(", ")}`,
		);
	}
	return candidate;
}

function parseMaxAttempts(val: string): number {
	const parsed = Number.parseInt(val, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		throw new Error(
			`Invalid max-attempts: ${val}. Must be a positive integer.`,
		);
	}
	return parsed;
}

interface MutablePickArgs {
	agent: AgentType;
	model?: string;
	maxAttempts: number;
	dryRun: boolean;
	pr: boolean;
	localOnly: boolean;
	branch?: string;
	help: boolean;
}

function applyValueFlag(
	state: MutablePickArgs,
	arg: string,
	nextVal?: string,
): number {
	if (!nextVal) return 0;
	if (arg === "--agent") {
		state.agent = parseAgent(nextVal);
		return 1;
	}
	if (arg === "--model") {
		state.model = nextVal;
		return 1;
	}
	if (
		arg === "--max-attempts" ||
		arg === "--retries" ||
		arg === "--max-retries"
	) {
		state.maxAttempts = parseMaxAttempts(nextVal);
		return 1;
	}
	if (arg === "--branch") {
		state.branch = nextVal;
		return 1;
	}
	return 0;
}

function applyBooleanFlag(state: MutablePickArgs, arg: string): void {
	if (arg === "--help" || arg === "-h") {
		state.help = true;
	} else if (arg === "--dry-run") {
		state.dryRun = true;
	} else if (arg === "--local-only") {
		state.localOnly = true;
		state.pr = false;
	} else if (arg === "--no-pr") {
		state.pr = false;
	} else if (arg === "--pr") {
		state.pr = true;
		state.localOnly = false;
	}
}

export function parsePickCliArgs(argv: string[]): PickCliArgs {
	const state: MutablePickArgs = {
		agent: "agy",
		dryRun: false,
		help: false,
		localOnly: false,
		maxAttempts: 3,
		pr: true,
	};

	for (let i = 0; i < argv.length; i++) {
		const consumed = applyValueFlag(state, argv[i], argv[i + 1]);
		if (consumed > 0) {
			i += consumed;
		} else {
			applyBooleanFlag(state, argv[i]);
		}
	}

	return state;
}

export function formatPickHelp(): string {
	return `
${BOLD}${CYAN}Sandcastle Frontier Picker${RESET}
Interactive ticket picker for unblocked ready-for-agent frontier issues.

${BOLD}USAGE:${RESET}
  bun run sandcastle:pick [options]
  bun scripts/sandcastle.ts pick [options]

${BOLD}KEYBINDINGS:${RESET}
  ↑ / ↓, k / j       Navigate candidate tickets
  1 - 9              Jump directly to ticket by index
  Enter / Space      Confirm selection and launch Sandcastle execution workflow
  q / Esc / Ctrl+C   Cancel and exit picker cleanly

${BOLD}OPTIONS:${RESET}
  --agent <name>       Agent provider (agy, gemini, codex, claude) [default: agy]
  --model <name>       Model name override for agent provider
  --max-attempts <n>   Maximum self-healing attempts before failure [default: 3]
  --branch <name>      Target git branch override
  --dry-run            Preview target ticket and prompt without running execution
  --no-pr              Skip automatic pull request creation
  --local-only         Run locally without remote pushes or PR creation
  --help, -h           Show this help documentation
`.trim();
}

function isClaimContention(err: unknown): boolean {
	if (err instanceof IssueAlreadyClaimedError) {
		return true;
	}
	if (
		typeof err === "string" &&
		err.toLowerCase().includes("already claimed")
	) {
		return true;
	}
	if (
		err instanceof Error &&
		err.message.toLowerCase().includes("already claimed")
	) {
		return true;
	}
	return false;
}

function formatClaimWarning(issueNumber: number, err: unknown): string {
	const assigneeList =
		err instanceof IssueAlreadyClaimedError && err.assignees.length > 0
			? err.assignees
			: [];
	const assigneeText =
		assigneeList.length > 0
			? ` by ${assigneeList.map((a) => (a.startsWith("@") ? a : `@${a}`)).join(", ")}`
			: "";
	return `${YELLOW}⚠️  Issue #${issueNumber} is already claimed${assigneeText}. Refreshing frontier...${RESET}`;
}

async function fetchFrontierIssues(
	githubClient: GithubClient,
): Promise<CandidateIssue[]> {
	const candidates = await githubClient.listCandidateIssues();
	return resolveFrontier(candidates);
}

function buildDryRunResult(
	issue: CandidateIssue,
	args: PickCliArgs,
	logger: (msg: string) => void,
): ExecutionResult {
	logger(`[Dry-Run] Target issue: #${issue.number} (${issue.title})`);
	logger(
		`[Dry-Run] Agent: ${args.agent ?? "agy"}, Model: ${args.model ?? "default"}`,
	);
	return {
		attempts: 0,
		branch: args.branch ?? `dry-run/issue-${issue.number}`,
		durationMs: 0,
		issueNumber: issue.number,
		success: true,
	};
}

async function executeSelection(
	issue: CandidateIssue,
	options: PickCommandOptions,
	args: PickCliArgs,
	logger: (msg: string) => void,
	githubClient: GithubClient,
): Promise<ExecutionResult | null> {
	if (args.dryRun) {
		return buildDryRunResult(issue, args, logger);
	}

	logger(
		`Launching Sandcastle execution workflow for issue #${issue.number}: ${issue.title}...`,
	);
	const executeWorkflow = options.executeWorkflow ?? executeTicketWorkflow;

	const result = await executeWorkflow({
		agentRunner: options.agentRunner ?? new MockAgentRunner(),
		branch: args.branch,
		cwd: options.cwd,
		githubClient,
		gitRunner: options.gitRunner,
		issueNumber: issue.number,
		lockManager: options.lockManager,
		maxAttempts: args.maxAttempts,
		onProgress: (stage, detail) => {
			if (detail) {
				logger(`[${stage}] ${detail}`);
			}
		},
		signal: options.signal,
		validator: options.validator,
		worktreeManager: options.worktreeManager,
	});

	if (!result.success && result.error && isClaimContention(result.error)) {
		logger(
			`${YELLOW}⚠️  Issue #${issue.number} was claimed concurrently. Refreshing frontier...${RESET}`,
		);
		return null;
	}

	return result;
}

interface PickLoopContext {
	readonly options: PickCommandOptions;
	readonly args: PickCliArgs;
	readonly logger: (msg: string) => void;
	readonly githubClient: GithubClient;
}

type PickStepResult =
	| { readonly status: "completed"; readonly result: ExecutionResult | null }
	| { readonly status: "retry" };

async function processPickFrontierStep(
	ctx: PickLoopContext,
): Promise<PickStepResult> {
	const frontier = await fetchFrontierIssues(ctx.githubClient);
	if (frontier.length === 0) {
		ctx.logger("No unblocked ready-for-agent tickets available in queue.");
		return { result: null, status: "completed" };
	}

	const selected = await renderInteractivePicker(frontier, {
		input: ctx.options.input,
		output: ctx.options.output,
	});
	if (!selected) {
		return { result: null, status: "completed" };
	}

	try {
		const result = await executeSelection(
			selected,
			ctx.options,
			ctx.args,
			ctx.logger,
			ctx.githubClient,
		);
		if (result !== null) {
			return { result, status: "completed" };
		}
		return { status: "retry" };
	} catch (err: unknown) {
		if (isClaimContention(err)) {
			ctx.logger(formatClaimWarning(selected.number, err));
			return { status: "retry" };
		}
		throw err;
	}
}

export async function runPickCommand(
	options: PickCommandOptions = {},
): Promise<ExecutionResult | null> {
	const args = options.args ?? parsePickCliArgs(process.argv.slice(2));
	const logger = options.logger ?? defaultPickLogger;

	if (args.help) {
		logger(formatPickHelp());
		return null;
	}

	const githubClient =
		options.githubClient ?? new DefaultGithubClient({ cwd: options.cwd });
	const ctx: PickLoopContext = { args, githubClient, logger, options };

	while (!options.signal?.aborted) {
		const step = await processPickFrontierStep(ctx);
		if (step.status === "completed") {
			return step.result;
		}
	}

	return null;
}
