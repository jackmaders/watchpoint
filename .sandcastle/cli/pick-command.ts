import {
	applyCommonBooleanFlag,
	applyCommonValueFlag,
	createDefaultCommonCliState,
} from "../cli-args";
import { type CodexProvider, defaultCodexModel } from "../codex-config";
import { DefaultGithubClient } from "../github/client";
import { IssueAlreadyClaimedError, isClaimContention } from "../github/errors";
import { resolveFrontier } from "../github/frontier";
import type { CandidateIssue, GithubClient } from "../github/types";
import { DefaultAgentRunner } from "../workflow/agent-runner";
import type { ExecutionResult } from "../workflow/types";
import { executeTicketWorkflow } from "../workflow/workflow";
import { renderInteractivePicker } from "./picker";
import type { PickCliArgs, PickCommandOptions } from "./types";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";

export function defaultPickLogger(msg: string): void {
	console.log(msg);
}

export function parsePickCliArgs(argv: string[]): PickCliArgs {
	const state: PickCliArgs = createDefaultCommonCliState();

	for (let i = 0; i < argv.length; i++) {
		const consumed = applyCommonValueFlag(state, argv[i], argv[i + 1]);
		if (consumed > 0) {
			i += consumed;
		} else {
			applyCommonBooleanFlag(state, argv[i]);
		}
	}

	return {
		...state,
		model:
			state.model ??
			(state.agent === "codex"
				? defaultCodexModel(state.codexProvider as CodexProvider)
				: undefined),
	};
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
  --sandbox <name>     Sandbox execution provider (docker, none) [default: docker]
  --image <name>       Docker image override [default: sandcastle:watchpoint]
  --no-sandbox         Run agent directly on host without Docker container isolation
	--agent <name>       Agent provider (agy, gemini, codex, claude) [default: codex]
	  --codex-provider <name> Codex provider (openrouter, openai) [default: openrouter]
	  --model <name>       Model name override for agent provider
	                       Codex defaults to the selected provider; --agent agy preserves Antigravity
  --max-attempts <n>   Maximum self-healing attempts before failure [default: 3]
  --branch <name>      Target git branch override
  --dry-run            Preview target ticket and prompt without running execution
  --no-pr              Skip automatic pull request creation
  --local-only         Run locally without remote pushes or PR creation
  --help, -h           Show this help documentation
`.trim();
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
		`[Dry-Run] Agent: ${args.agent ?? "codex"}, Model: ${args.model ?? "openrouter/free"}, Sandbox: ${args.sandbox ?? "docker"}`,
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
		agentRunner:
			options.agentRunner ??
			new DefaultAgentRunner({
				agent: args.agent,
				codexProvider: args.codexProvider,
				dangerouslySkipPermissions: args.dangerouslySkipPermissions,
				imageName: args.imageName,
				model: args.model,
				processRunner: options.gitRunner,
				sandbox: args.sandbox,
			}),
		branch: args.branch,
		cwd: options.cwd,
		githubClient,
		gitRunner: options.gitRunner,
		issueNumber: issue.number,
		localOnly: args.localOnly,
		lockManager: options.lockManager,
		maxAttempts: args.maxAttempts,
		onProgress: (stage, detail) => {
			if (detail) {
				logger(`[${stage}] ${detail}`);
			}
		},
		pr: args.pr,
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
