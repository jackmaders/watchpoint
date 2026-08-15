import {
	ClaimVerificationError,
	GithubCliError,
	IssueAlreadyClaimedError,
	IssueNotFoundError,
} from "./errors";
import type {
	CandidateIssue,
	GithubClient,
	GithubClientOptions,
	ProcessRunner,
} from "./types";

interface RawIssueNode {
	number: number;
	title: string;
	body?: string | null;
	createdAt?: string | null;
	url?: string | null;
	labels?: { nodes?: Array<{ name: string }> } | null;
	assignees?: { nodes?: Array<{ login: string }> } | null;
	issueDependenciesSummary?: {
		blockedBy?: number | null;
	} | null;
}

interface RawGraphQLResponse<T> {
	data?: T;
	errors?: Array<{ message: string }>;
}

interface RawIssuesData {
	repository?: {
		issues?: {
			nodes?: RawIssueNode[];
		};
	};
}

interface RawIssueData {
	repository?: {
		issue?: RawIssueNode | null;
	};
}

function mapRawIssueNode(node: RawIssueNode): CandidateIssue {
	const labels = (node.labels?.nodes ?? []).map((l) => l.name);
	const assignees = (node.assignees?.nodes ?? []).map((a) => a.login);
	const blockedBy = node.issueDependenciesSummary?.blockedBy ?? 0;

	return {
		assignees,
		body: node.body ?? "",
		createdAt: node.createdAt ?? undefined,
		issueDependenciesSummary: {
			blockedBy,
		},
		labels,
		number: node.number,
		title: node.title,
		url: node.url ?? undefined,
	};
}

function parseGraphQLResponse<T>(
	rawStdout: string,
	command: string,
	exitCode: number,
	stderr: string,
	issueNumber: number,
): T {
	let parsed: RawGraphQLResponse<T>;
	try {
		parsed = JSON.parse(rawStdout);
	} catch {
		throw new GithubCliError({
			command,
			exitCode,
			message: `Failed to parse GraphQL response: ${rawStdout}`,
			stderr,
			stdout: rawStdout,
		});
	}

	if (parsed.errors && !parsed.data) {
		const errorMsg = parsed.errors.map((e) => e.message).join(", ");
		const isNotFound =
			errorMsg.toLowerCase().includes("not found") ||
			errorMsg.toLowerCase().includes("could not resolve to an issue");
		if (isNotFound) {
			throw new IssueNotFoundError(issueNumber);
		}
		throw new GithubCliError({
			command,
			exitCode: 1,
			message: `GraphQL query failed: ${errorMsg}`,
			stderr: errorMsg,
			stdout: rawStdout,
		});
	}

	return parsed.data as T;
}

export const defaultBunSpawnRunner: ProcessRunner = async (
	command,
	options,
) => {
	const proc = Bun.spawn(command as string[], {
		cwd: options?.cwd,
		env: options?.env ? { ...process.env, ...options.env } : process.env,
		stderr: "pipe",
		stdout: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	return { exitCode, stderr, stdout };
};

const LIST_CANDIDATES_QUERY = `query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues(first: 100, states: [OPEN], labels: ["ready-for-agent"], orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes {
        number
        title
        body
        createdAt
        url
        labels(first: 20) {
          nodes {
            name
          }
        }
        assignees(first: 10) {
          nodes {
            login
          }
        }
        issueDependenciesSummary {
          blockedBy
        }
      }
    }
  }
}`;

const GET_ISSUE_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number
      title
      body
      createdAt
      url
      labels(first: 20) {
        nodes {
          name
        }
      }
      assignees(first: 10) {
        nodes {
          login
        }
      }
      issueDependenciesSummary {
        blockedBy
      }
    }
  }
}`;

export class DefaultGithubClient implements GithubClient {
	private readonly owner: string;
	private readonly repo: string;
	private readonly runner: ProcessRunner;
	private readonly cwd?: string;

	constructor(options: GithubClientOptions = {}) {
		this.owner = options.owner ?? ":owner";
		this.repo = options.repo ?? ":repo";
		this.runner = options.runner ?? defaultBunSpawnRunner;
		this.cwd = options.cwd;
	}

	private async executeGraphQL<T>(
		query: string,
		variables: Record<string, string | number>,
	): Promise<T> {
		const args = ["gh", "api", "graphql"];
		for (const [key, val] of Object.entries(variables)) {
			args.push("-F", `${key}=${val}`);
		}
		args.push("-f", `query=${query}`);

		const res = await this.runner(args, { cwd: this.cwd });
		if (res.exitCode !== 0) {
			throw new GithubCliError({
				command: args.join(" "),
				exitCode: res.exitCode,
				stderr: res.stderr,
				stdout: res.stdout,
			});
		}

		const issueNum =
			typeof variables.number === "number" ? variables.number : 0;
		return parseGraphQLResponse<T>(
			res.stdout,
			args.join(" "),
			res.exitCode,
			res.stderr,
			issueNum,
		);
	}

	async listCandidateIssues(): Promise<CandidateIssue[]> {
		const data = await this.executeGraphQL<RawIssuesData>(
			LIST_CANDIDATES_QUERY,
			{
				owner: this.owner,
				repo: this.repo,
			},
		);

		const nodes = data?.repository?.issues?.nodes ?? [];
		return nodes.map(mapRawIssueNode);
	}

	async getIssue(issueNumber: number): Promise<CandidateIssue> {
		const data = await this.executeGraphQL<RawIssueData>(GET_ISSUE_QUERY, {
			number: issueNumber,
			owner: this.owner,
			repo: this.repo,
		});

		const issueNode = data?.repository?.issue;
		if (!issueNode) {
			throw new IssueNotFoundError(issueNumber);
		}

		return mapRawIssueNode(issueNode);
	}

	async claimIssue(
		issueNumber: number,
		expectedAssignee?: string,
	): Promise<CandidateIssue> {
		const existingIssue = await this.getIssue(issueNumber);
		if (existingIssue.assignees.length > 0) {
			throw new IssueAlreadyClaimedError(issueNumber, existingIssue.assignees);
		}

		const cmd = [
			"gh",
			"issue",
			"edit",
			String(issueNumber),
			"--add-assignee",
			"@me",
		];
		const editRes = await this.runner(cmd, { cwd: this.cwd });
		if (editRes.exitCode !== 0) {
			throw new GithubCliError({
				command: cmd.join(" "),
				exitCode: editRes.exitCode,
				stderr: editRes.stderr,
				stdout: editRes.stdout,
			});
		}

		const verifiedIssue = await this.getIssue(issueNumber);
		if (verifiedIssue.assignees.length === 0) {
			throw new ClaimVerificationError(
				issueNumber,
				"expected assignee after claim, but assignees list is empty",
			);
		}

		if (
			expectedAssignee &&
			!verifiedIssue.assignees.includes(expectedAssignee) &&
			!verifiedIssue.assignees.includes("@me")
		) {
			throw new IssueAlreadyClaimedError(issueNumber, verifiedIssue.assignees);
		}

		return verifiedIssue;
	}

	async releaseClaim(issueNumber: number): Promise<void> {
		const cmd = [
			"gh",
			"issue",
			"edit",
			String(issueNumber),
			"--remove-assignee",
			"@me",
		];
		const res = await this.runner(cmd, { cwd: this.cwd });
		if (res.exitCode !== 0) {
			throw new GithubCliError({
				command: cmd.join(" "),
				exitCode: res.exitCode,
				stderr: res.stderr,
				stdout: res.stdout,
			});
		}
	}
}

export class MockGithubClient implements GithubClient {
	private issues: Map<number, CandidateIssue>;
	private simulatedVerificationFailures = new Map<number, string>();

	constructor(initialIssues: readonly CandidateIssue[] = []) {
		this.issues = new Map(initialIssues.map((i) => [i.number, { ...i }]));
	}

	setIssues(issues: readonly CandidateIssue[]): void {
		this.issues = new Map(issues.map((i) => [i.number, { ...i }]));
	}

	addIssue(issue: CandidateIssue): void {
		this.issues.set(issue.number, { ...issue });
	}

	simulateClaimVerificationFailure(issueNumber: number, reason: string): void {
		this.simulatedVerificationFailures.set(issueNumber, reason);
	}

	async listCandidateIssues(): Promise<CandidateIssue[]> {
		return Array.from(this.issues.values()).filter((issue) =>
			issue.labels.includes("ready-for-agent"),
		);
	}

	async getIssue(issueNumber: number): Promise<CandidateIssue> {
		const issue = this.issues.get(issueNumber);
		if (!issue) {
			throw new IssueNotFoundError(issueNumber);
		}
		return { ...issue };
	}

	async claimIssue(
		issueNumber: number,
		expectedAssignee?: string,
	): Promise<CandidateIssue> {
		const issue = await this.getIssue(issueNumber);
		if (issue.assignees.length > 0) {
			throw new IssueAlreadyClaimedError(issueNumber, issue.assignees);
		}

		const failureReason = this.simulatedVerificationFailures.get(issueNumber);
		if (failureReason) {
			throw new ClaimVerificationError(issueNumber, failureReason);
		}

		const assignee = expectedAssignee ?? "@me";
		const updated: CandidateIssue = {
			...issue,
			assignees: [assignee],
		};
		this.issues.set(issueNumber, updated);
		return { ...updated };
	}

	async releaseClaim(issueNumber: number): Promise<void> {
		const issue = await this.getIssue(issueNumber);
		const updated: CandidateIssue = {
			...issue,
			assignees: issue.assignees.filter((a) => a !== "@me"),
		};
		this.issues.set(issueNumber, updated);
	}
}
