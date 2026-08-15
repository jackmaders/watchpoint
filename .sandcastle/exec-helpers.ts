import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
	type AgentProvider,
	type RunOptions,
	type RunResult,
	run,
	type SandboxProvider,
} from "@ai-hero/sandcastle";
import type { CommandExecOutput } from "./self-healing";
import type { IssueDetails } from "./types";

const execAsync = promisify(exec);

export async function execCommand(
	cmd: string,
	cwd?: string,
	executor = execAsync,
): Promise<CommandExecOutput> {
	try {
		const { stdout, stderr } = await executor(cmd, { cwd });
		return {
			exitCode: 0,
			stderr: stderr ? stderr.toString() : "",
			stdout: stdout ? stdout.toString() : "",
		};
	} catch (err: unknown) {
		const error = err as {
			code?: number;
			stdout?: string | Buffer;
			stderr?: string | Buffer;
		};
		return {
			exitCode: typeof error.code === "number" ? error.code : 1,
			stderr: error.stderr ? error.stderr.toString() : String(err),
			stdout: error.stdout ? error.stdout.toString() : "",
		};
	}
}

export async function fetchGithubIssue(
	issueNumber: number,
	runner = execCommand,
): Promise<IssueDetails> {
	const res = await runner(
		`gh issue view ${issueNumber} --json number,title,body`,
	);
	if (res.exitCode !== 0) {
		throw new Error(`Failed to fetch issue #${issueNumber}: ${res.stderr}`);
	}
	const parsed = JSON.parse(res.stdout);
	return {
		body: parsed.body || "",
		number: parsed.number,
		title: parsed.title,
	};
}

export async function createGithubPr(
	payload: { title: string; body: string; branch: string },
	runner = execCommand,
): Promise<{ prUrl: string }> {
	const pushRes = await runner(`git push -u origin ${payload.branch}`);
	if (pushRes.exitCode !== 0) {
		throw new Error(
			`Failed to push branch ${payload.branch}: ${pushRes.stderr}`,
		);
	}
	const titleArg = `"${payload.title.replace(/(["\\$`])/g, "\\$1")}"`;
	const bodyArg = `"${payload.body.replace(/(["\\$`])/g, "\\$1")}"`;
	const prRes = await runner(
		`gh pr create --draft --title ${titleArg} --body ${bodyArg}`,
	);
	if (prRes.exitCode !== 0) {
		throw new Error(`Failed to create PR: ${prRes.stderr}`);
	}
	return { prUrl: prRes.stdout.trim() };
}

export async function runSandcastleAgent(
	options: {
		agent: AgentProvider;
		sandbox: SandboxProvider;
		prompt: string;
		branch: string;
		cwd?: string;
	},
	runner: (opts: RunOptions<AgentProvider>) => Promise<RunResult> = run,
): Promise<{ commits: { sha: string }[]; stdout: string }> {
	const result = await runner({
		agent: options.agent,
		branchStrategy: {
			branch: options.branch,
			type: "branch",
		},
		cwd: options.cwd,
		prompt: options.prompt,
		sandbox: options.sandbox,
	});
	return {
		commits: result.commits.map((c) => ({ sha: c.sha })),
		stdout: result.stdout,
	};
}
