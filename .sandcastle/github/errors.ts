export interface GithubCliErrorOptions {
	readonly command?: string;
	readonly exitCode: number;
	readonly stderr?: string;
	readonly stdout?: string;
	readonly message?: string;
}

export class GithubCliError extends Error {
	readonly command?: string;
	readonly exitCode: number;
	readonly stderr: string;
	readonly stdout: string;

	constructor(options: GithubCliErrorOptions) {
		const stderr = options.stderr ?? "";
		const stdout = options.stdout ?? "";
		let message = options.message;

		if (!message) {
			const details = stderr || stdout || "no output";
			if (options.command) {
				message = `Command '${options.command}' failed with exit code ${options.exitCode}: ${details}`;
			} else {
				message = `GitHub CLI command failed with exit code ${options.exitCode}: ${details}`;
			}
		}

		super(message);
		this.name = "GithubCliError";
		this.command = options.command;
		this.exitCode = options.exitCode;
		this.stderr = stderr;
		this.stdout = stdout;
	}
}

export class IssueNotFoundError extends Error {
	readonly issueNumber: number;

	constructor(issueNumber: number) {
		super(`Issue #${issueNumber} not found`);
		this.name = "IssueNotFoundError";
		this.issueNumber = issueNumber;
	}
}

export class IssueAlreadyClaimedError extends Error {
	readonly issueNumber: number;
	readonly assignees: readonly string[];

	constructor(issueNumber: number, assignees: readonly string[] = []) {
		const assigneeText =
			assignees.length > 0
				? ` by ${assignees.map((a) => (a.startsWith("@") ? a : `@${a}`)).join(", ")}`
				: "";
		super(`Issue #${issueNumber} is already claimed${assigneeText}`);
		this.name = "IssueAlreadyClaimedError";
		this.issueNumber = issueNumber;
		this.assignees = assignees;
	}
}

export class ClaimVerificationError extends Error {
	readonly issueNumber: number;
	readonly reason: string;

	constructor(issueNumber: number, reason: string) {
		super(`Claim verification failed for issue #${issueNumber}: ${reason}`);
		this.name = "ClaimVerificationError";
		this.issueNumber = issueNumber;
		this.reason = reason;
	}
}
