import type { AgentProvider, SandboxProvider } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { createAgentProvider } from "./agent-providers";
import { resolveAuthMounts } from "./auth-mounts";
import { validateCodexConfiguration } from "./codex-config";
import {
	createGithubPr,
	execCommand,
	fetchGithubIssue,
	runSandcastleAgent,
} from "./exec-helpers";
import { buildPrPayload, generateBranchName } from "./git-manager";
import {
	type CommandExecOutput,
	executeSelfHealingLoop,
	runVerificationChecks,
} from "./self-healing";
import type {
	IssueDetails,
	OrchestratorOptions,
	OrchestratorResult,
	SandcastleCliArgs,
} from "./types";

export interface OrchestratorDependencies {
	fetchIssue?: (issueNumber: number) => Promise<IssueDetails>;
	runCommand?: (cmd: string, cwd?: string) => Promise<CommandExecOutput>;
	runAgentInSandbox?: (options: {
		agent: AgentProvider;
		sandbox: SandboxProvider;
		prompt: string;
		branch: string;
	}) => Promise<{ commits: { sha: string }[]; stdout: string }>;
	createPr?: (payload: {
		title: string;
		body: string;
		branch: string;
	}) => Promise<{ prUrl: string }>;
	logger?: (msg: string) => void;
}

export function buildDockerSandboxOptions(
	args: Pick<SandcastleCliArgs, "imageName">,
	authConfig: ReturnType<typeof resolveAuthMounts>,
): {
	env: typeof authConfig.env;
	imageName: string;
	mounts: typeof authConfig.mounts;
} {
	return {
		env: authConfig.env,
		imageName: args.imageName ?? "sandcastle:watchpoint",
		mounts: authConfig.mounts,
	};
}

async function resolveTaskInput(
	args: SandcastleCliArgs,
	fetchIssue: (n: number) => Promise<IssueDetails>,
	logger: (msg: string) => void,
): Promise<{ issue?: IssueDetails; initialPrompt: string }> {
	if (args.issue) {
		logger(`Fetching requirements for issue #${args.issue}...`);
		const issue = await fetchIssue(args.issue);
		return {
			initialPrompt: `Task from GitHub Issue #${issue.number}: ${issue.title}\n\n${issue.body}`,
			issue,
		};
	}
	return {
		initialPrompt: args.prompt || "",
	};
}

async function maybeCreatePr(
	args: SandcastleCliArgs,
	issue: IssueDetails | undefined,
	branch: string,
	attempts: number,
	createPr: (payload: {
		title: string;
		body: string;
		branch: string;
	}) => Promise<{ prUrl: string }>,
): Promise<string | undefined> {
	if (args.pr && !args.localOnly) {
		const prPayload = buildPrPayload({
			attempts,
			branch,
			issue,
			prompt: args.prompt,
		});
		const prResult = await createPr({
			body: prPayload.body,
			branch,
			title: prPayload.title,
		});
		return prResult.prUrl;
	}
	return undefined;
}

export async function orchestrateSandcastle(
	options: OrchestratorOptions,
	deps: OrchestratorDependencies = {},
): Promise<OrchestratorResult> {
	const { args, cwd } = options;
	const logger = deps.logger || (() => {});
	const fetchIssue = deps.fetchIssue || fetchGithubIssue;
	const runCmd = deps.runCommand || execCommand;
	const createPr = deps.createPr || createGithubPr;
	const runAgentInSandbox = deps.runAgentInSandbox || runSandcastleAgent;

	const { issue, initialPrompt } = await resolveTaskInput(
		args,
		fetchIssue,
		logger,
	);
	const branch = generateBranchName({
		customBranch: args.branch,
		issue,
		prompt: args.prompt,
	});

	if (args.dryRun) {
		logger(`[Dry-Run] Target branch: ${branch}`);
		logger(`[Dry-Run] Initial prompt: ${initialPrompt.slice(0, 100)}...`);
		return {
			attempts: 0,
			branch,
			commits: [],
			success: true,
		};
	}

	const authConfig = resolveAuthMounts({ homeDir: options.homeDir });
	if (args.agent === "codex") {
		validateCodexConfiguration(authConfig.env);
	}
	const agentProvider = createAgentProvider(args.agent, args.model);
	const sandboxProvider = docker(buildDockerSandboxOptions(args, authConfig));

	const capturedCommits: { sha: string }[] = [];

	const loopResult = await executeSelfHealingLoop({
		initialPrompt,
		maxRetries: args.maxRetries,
		onProgress: (msg) => logger(msg),
		runIteration: async (prompt, _attempt) => {
			const res = await runAgentInSandbox({
				agent: agentProvider,
				branch,
				prompt,
				sandbox: sandboxProvider,
			});
			if (res.commits.length > 0) {
				capturedCommits.push(...res.commits);
			}
		},
		verify: async () => {
			return runVerificationChecks(async (cmd) => runCmd(cmd, cwd));
		},
	});

	if (!loopResult.success) {
		return {
			attempts: loopResult.attempts,
			branch,
			commits: capturedCommits,
			error: loopResult.lastVerification.aggregatedError,
			success: false,
		};
	}

	const prUrl = await maybeCreatePr(
		args,
		issue,
		branch,
		loopResult.attempts,
		createPr,
	);

	return {
		attempts: loopResult.attempts,
		branch,
		commits: capturedCommits,
		prUrl,
		success: true,
	};
}
