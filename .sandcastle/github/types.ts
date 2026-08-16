export interface IssueDependenciesSummary {
	readonly blockedBy: number;
}

export interface CandidateIssue {
	readonly number: number;
	readonly title: string;
	readonly body: string;
	readonly labels: readonly string[];
	readonly assignees: readonly string[];
	readonly issueDependenciesSummary: IssueDependenciesSummary;
	readonly createdAt?: string;
	readonly url?: string;
}

export interface MockIssueSpec {
	readonly number: number;
	readonly title?: string;
	readonly body?: string;
	readonly labels?: readonly string[];
	readonly assignees?: readonly string[];
	readonly blockedBy?: number | readonly number[];
	readonly createdAt?: string;
	readonly url?: string;
}

export interface ProcessExecResult {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

export type ProcessRunner = (
	command: readonly string[],
	options?: {
		cwd?: string;
		env?: Record<string, string | undefined>;
		signal?: AbortSignal;
	},
) => Promise<ProcessExecResult>;

export interface GithubClientOptions {
	readonly owner?: string;
	readonly repo?: string;
	readonly runner?: ProcessRunner;
	readonly cwd?: string;
}

export interface CreatePullRequestOptions {
	readonly title: string;
	readonly body: string;
	readonly head: string;
	readonly base?: string;
	readonly labels?: readonly string[];
	readonly draft?: boolean;
}

export interface PullRequestResult {
	readonly url: string;
	readonly number: number;
}

export interface GithubClient {
	listCandidateIssues(): Promise<CandidateIssue[]>;
	getIssue(issueNumber: number): Promise<CandidateIssue>;
	claimIssue(
		issueNumber: number,
		expectedAssignee?: string,
	): Promise<CandidateIssue>;
	releaseClaim(issueNumber: number): Promise<void>;
	updateLabels(
		issueNumber: number,
		options: {
			readonly add?: readonly string[];
			readonly remove?: readonly string[];
		},
	): Promise<void>;
	addComment(issueNumber: number, body: string): Promise<void>;
	createPullRequest(
		options: CreatePullRequestOptions,
	): Promise<PullRequestResult>;
}
