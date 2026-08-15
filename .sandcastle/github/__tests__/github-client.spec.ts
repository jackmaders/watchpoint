import { describe, expect, it, vi } from "vitest";
import {
	DefaultGithubClient,
	defaultBunSpawnRunner,
	MockGithubClient,
} from "../client";
import {
	ClaimVerificationError,
	GithubCliError,
	IssueAlreadyClaimedError,
	IssueNotFoundError,
} from "../errors";
import { createMockIssueDAG } from "../frontier";
import type { CandidateIssue, ProcessRunner } from "../types";

describe("GitHub Domain Errors", () => {
	describe("GithubCliError", () => {
		it("formats error message with command, exit code, and stderr", () => {
			// Arrange
			const command = "gh api graphql";
			const exitCode = 1;
			const stderr = "GraphQL error: Resource not accessible by integration";
			const stdout = "";

			// Act
			const error = new GithubCliError({
				command,
				exitCode,
				stderr,
				stdout,
			});

			// Assert
			expect(error.name).toBe("GithubCliError");
			expect(error.command).toBe(command);
			expect(error.exitCode).toBe(1);
			expect(error.stderr).toBe(stderr);
			expect(error.stdout).toBe("");
			expect(error.message).toContain(
				"Command 'gh api graphql' failed with exit code 1",
			);
			expect(error.message).toContain(stderr);
			expect(error instanceof Error).toBe(true);
		});

		it("formats error message when command is omitted and stderr is empty", () => {
			// Arrange
			const exitCode = 127;
			const stdout = "Some standard output";

			// Act
			const error = new GithubCliError({
				exitCode,
				stdout,
			});

			// Assert
			expect(error.name).toBe("GithubCliError");
			expect(error.command).toBeUndefined();
			expect(error.exitCode).toBe(127);
			expect(error.stderr).toBe("");
			expect(error.stdout).toBe(stdout);
			expect(error.message).toBe(
				"GitHub CLI command failed with exit code 127: Some standard output",
			);
		});

		it("formats error message with no output fallback when command is present", () => {
			// Arrange
			const options = { command: "gh auth", exitCode: 1 };

			// Act
			const error = new GithubCliError(options);

			// Assert
			expect(error.message).toBe(
				"Command 'gh auth' failed with exit code 1: no output",
			);
		});

		it("formats error message with no output fallback when command is absent", () => {
			// Arrange
			const options = { exitCode: 2 };

			// Act
			const error = new GithubCliError(options);

			// Assert
			expect(error.message).toBe(
				"GitHub CLI command failed with exit code 2: no output",
			);
		});

		it("formats error message when custom message is provided", () => {
			// Arrange
			const message = "Custom failure message";

			// Act
			const error = new GithubCliError({
				exitCode: 1,
				message,
			});

			// Assert
			expect(error.message).toBe(message);
		});
	});

	describe("IssueNotFoundError", () => {
		it("formats issue not found error with issue number", () => {
			// Arrange
			const issueNumber = 163;

			// Act
			const error = new IssueNotFoundError(issueNumber);

			// Assert
			expect(error.name).toBe("IssueNotFoundError");
			expect(error.issueNumber).toBe(163);
			expect(error.message).toBe("Issue #163 not found");
			expect(error instanceof Error).toBe(true);
		});
	});

	describe("IssueAlreadyClaimedError", () => {
		it("formats error with single assignee and handles pre-existing @ prefix", () => {
			// Arrange
			const issueNumber = 163;
			const assignees = ["octocat", "@hubot"];

			// Act
			const error = new IssueAlreadyClaimedError(issueNumber, assignees);

			// Assert
			expect(error.name).toBe("IssueAlreadyClaimedError");
			expect(error.issueNumber).toBe(163);
			expect(error.assignees).toEqual(["octocat", "@hubot"]);
			expect(error.message).toBe(
				"Issue #163 is already claimed by @octocat, @hubot",
			);
			expect(error instanceof Error).toBe(true);
		});

		it("formats error with empty assignee list when explicitly passed", () => {
			// Arrange
			const issueNumber = 163;

			// Act
			const error = new IssueAlreadyClaimedError(issueNumber, []);

			// Assert
			expect(error.message).toBe("Issue #163 is already claimed");
		});

		it("formats error with empty assignee list when omitted", () => {
			// Arrange
			const issueNumber = 163;

			// Act
			const error = new IssueAlreadyClaimedError(issueNumber);

			// Assert
			expect(error.message).toBe("Issue #163 is already claimed");
		});
	});

	describe("ClaimVerificationError", () => {
		it("formats verification error with details", () => {
			// Arrange
			const issueNumber = 163;
			const reason = "expected assignee '@me', got none";

			// Act
			const error = new ClaimVerificationError(issueNumber, reason);

			// Assert
			expect(error.name).toBe("ClaimVerificationError");
			expect(error.issueNumber).toBe(163);
			expect(error.reason).toBe(reason);
			expect(error.message).toBe(
				"Claim verification failed for issue #163: expected assignee '@me', got none",
			);
			expect(error instanceof Error).toBe(true);
		});
	});
});

describe("MockGithubClient", () => {
	it("lists only candidate issues with ready-for-agent label", async () => {
		// Arrange
		const issues: CandidateIssue[] = [
			{
				assignees: [],
				body: "Task 1",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 1,
				title: "Task 1",
			},
			{
				assignees: [],
				body: "Task 2",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["needs-triage"],
				number: 2,
				title: "Task 2",
			},
		];
		const client = new MockGithubClient(issues);

		// Act
		const candidates = await client.listCandidateIssues();

		// Assert
		expect(candidates).toHaveLength(1);
		expect(candidates[0].number).toBe(1);
	});

	it("gets an issue by number when it exists", async () => {
		// Arrange
		const issues = createMockIssueDAG([{ number: 42, title: "Test issue" }]);
		const client = new MockGithubClient(issues);

		// Act
		const found = await client.getIssue(42);

		// Assert
		expect(found.number).toBe(42);
		expect(found.title).toBe("Test issue");
	});

	it("throws IssueNotFoundError when getting non-existent issue", async () => {
		// Arrange
		const client = new MockGithubClient();

		// Act
		const resultPromise = client.getIssue(999);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueNotFoundError);
	});

	it("claims an unclaimed issue by assigning @me", async () => {
		// Arrange
		const issues = createMockIssueDAG([{ number: 10, title: "Unclaimed" }]);
		const client = new MockGithubClient(issues);

		// Act
		const claimed = await client.claimIssue(10);
		const refetched = await client.getIssue(10);

		// Assert
		expect(claimed.assignees).toEqual(["@me"]);
		expect(refetched.assignees).toEqual(["@me"]);
	});

	it("claims an unclaimed issue with custom expected assignee", async () => {
		// Arrange
		const issues = createMockIssueDAG([{ number: 12, title: "Custom assign" }]);
		const client = new MockGithubClient(issues);

		// Act
		const claimed = await client.claimIssue(12, "my-agent-id");

		// Assert
		expect(claimed.assignees).toEqual(["my-agent-id"]);
	});

	it("throws IssueNotFoundError when claiming non-existent issue", async () => {
		// Arrange
		const client = new MockGithubClient();

		// Act
		const resultPromise = client.claimIssue(404);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueNotFoundError);
	});

	it("throws IssueAlreadyClaimedError when claiming an issue that is already assigned", async () => {
		// Arrange
		const issues = createMockIssueDAG([
			{ assignees: ["other-agent"], number: 15, title: "Already claimed" },
		]);
		const client = new MockGithubClient(issues);

		// Act
		const resultPromise = client.claimIssue(15);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueAlreadyClaimedError);
	});

	it("throws ClaimVerificationError when simulated failure is set", async () => {
		// Arrange
		const issues = createMockIssueDAG([{ number: 20, title: "Failing claim" }]);
		const client = new MockGithubClient(issues);
		client.simulateClaimVerificationFailure(20, "simulated verification loss");

		// Act
		const resultPromise = client.claimIssue(20);

		// Assert
		await expect(resultPromise).rejects.toThrow(ClaimVerificationError);
	});

	it("releases a claim by removing @me and leaving labels intact", async () => {
		// Arrange
		const issues = createMockIssueDAG([
			{
				assignees: ["@me"],
				labels: ["ready-for-agent", "enhancement"],
				number: 30,
				title: "Release me",
			},
		]);
		const client = new MockGithubClient(issues);

		// Act
		await client.releaseClaim(30);
		const released = await client.getIssue(30);

		// Assert
		expect(released.assignees).toEqual([]);
		expect(released.labels).toEqual(["ready-for-agent", "enhancement"]);
	});

	it("throws IssueNotFoundError when releasing claim on non-existent issue", async () => {
		// Arrange
		const client = new MockGithubClient();

		// Act
		const resultPromise = client.releaseClaim(404);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueNotFoundError);
	});

	it("allows adding an issue in memory", async () => {
		// Arrange
		const client = new MockGithubClient();
		const issueA = createMockIssueDAG([{ number: 1, title: "Issue A" }])[0];

		// Act
		client.addIssue(issueA);
		const list = await client.listCandidateIssues();

		// Assert
		expect(list.map((i) => i.number)).toEqual([1]);
	});

	it("allows resetting issues in memory", async () => {
		// Arrange
		const client = new MockGithubClient();
		const issueB = createMockIssueDAG([{ number: 2, title: "Issue B" }])[0];

		// Act
		client.setIssues([issueB]);
		const list = await client.listCandidateIssues();

		// Assert
		expect(list.map((i) => i.number)).toEqual([2]);
	});
});

describe("DefaultGithubClient", () => {
	it("lists candidate issues using GraphQL API and maps response fields including null fallbacks", async () => {
		// Arrange
		const graphqlResponse = {
			data: {
				repository: {
					issues: {
						nodes: [
							{
								assignees: { nodes: [] },
								body: "Body 1",
								createdAt: "2026-08-01T10:00:00Z",
								issueDependenciesSummary: { blockedBy: 0 },
								labels: { nodes: [{ name: "ready-for-agent" }] },
								number: 101,
								title: "Issue 101",
								url: "https://github.com/org/repo/issues/101",
							},
							{
								assignees: { nodes: [{ login: "jackmaders" }] },
								body: "Body 2",
								createdAt: "2026-08-02T10:00:00Z",
								issueDependenciesSummary: { blockedBy: 2 },
								labels: {
									nodes: [{ name: "ready-for-agent" }, { name: "bug" }],
								},
								number: 102,
								title: "Issue 102",
								url: "https://github.com/org/repo/issues/102",
							},
							{
								assignees: null,
								body: null,
								createdAt: null,
								issueDependenciesSummary: null,
								labels: null,
								number: 103,
								title: "Issue 103",
								url: null,
							},
						],
					},
				},
			},
		};

		const mockRunner: ProcessRunner = async (cmd) => {
			expect(cmd[0]).toBe("gh");
			expect(cmd[1]).toBe("api");
			expect(cmd[2]).toBe("graphql");
			return {
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify(graphqlResponse),
			};
		};

		const client = new DefaultGithubClient({
			cwd: "/tmp",
			owner: "jackmaders",
			repo: "watchpoint",
			runner: mockRunner,
		});

		// Act
		const issues = await client.listCandidateIssues();

		// Assert
		expect(issues).toHaveLength(3);
		expect(issues[0]).toEqual({
			assignees: [],
			body: "Body 1",
			createdAt: "2026-08-01T10:00:00Z",
			issueDependenciesSummary: { blockedBy: 0 },
			labels: ["ready-for-agent"],
			number: 101,
			title: "Issue 101",
			url: "https://github.com/org/repo/issues/101",
		});
		expect(issues[1].assignees).toEqual(["jackmaders"]);
		expect(issues[1].issueDependenciesSummary.blockedBy).toBe(2);
		expect(issues[2]).toEqual({
			assignees: [],
			body: "",
			createdAt: undefined,
			issueDependenciesSummary: { blockedBy: 0 },
			labels: [],
			number: 103,
			title: "Issue 103",
			url: undefined,
		});
	});

	it("handles empty nodes fallback when issues nodes list is undefined", async () => {
		// Arrange
		const graphqlResponse = {
			data: {
				repository: {
					issues: {},
				},
			},
		};

		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify(graphqlResponse),
		});

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const issues = await client.listCandidateIssues();

		// Assert
		expect(issues).toEqual([]);
	});

	it("uses default options when instantiated without arguments", () => {
		// Arrange
		const options = undefined;

		// Act
		const client = new DefaultGithubClient(options);

		// Assert
		expect(client).toBeDefined();
	});

	it("throws GithubCliError when listCandidateIssues fails with non-zero exit code", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 1,
			stderr: "Could not resolve to a Repository",
			stdout: "",
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.listCandidateIssues();

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("throws GithubCliError when listCandidateIssues receives invalid JSON", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "not valid json {",
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.listCandidateIssues();

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("throws GithubCliError when listCandidateIssues returns GraphQL error object without data", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify({
				errors: [{ message: "Field 'issueDependenciesSummary' doesn't exist" }],
			}),
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.listCandidateIssues();

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("fetches single issue details via getIssue", async () => {
		// Arrange
		const graphqlResponse = {
			data: {
				repository: {
					issue: {
						assignees: { nodes: [] },
						body: "Single issue body",
						createdAt: "2026-08-10T10:00:00Z",
						issueDependenciesSummary: { blockedBy: 0 },
						labels: { nodes: [{ name: "ready-for-agent" }] },
						number: 200,
						title: "Single issue title",
						url: "https://github.com/org/repo/issues/200",
					},
				},
			},
		};

		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify(graphqlResponse),
		});

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const issue = await client.getIssue(200);

		// Assert
		expect(issue.number).toBe(200);
		expect(issue.title).toBe("Single issue title");
		expect(issue.body).toBe("Single issue body");
	});

	it("throws IssueNotFoundError when issue does not exist in getIssue", async () => {
		// Arrange
		const graphqlResponse = {
			data: {
				repository: {
					issue: null,
				},
			},
		};

		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify(graphqlResponse),
		});

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.getIssue(404);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueNotFoundError);
	});

	it("throws IssueNotFoundError when GraphQL errors indicate issue was not found", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify({
				errors: [{ message: "Could not resolve to an Issue with number 404" }],
			}),
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.getIssue(404);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueNotFoundError);
	});

	it("throws GithubCliError when getIssue receives invalid JSON", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "not valid json {",
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.getIssue(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("throws GithubCliError when getIssue returns generic GraphQL errors", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify({
				errors: [{ message: "Internal server error" }],
			}),
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.getIssue(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("throws GithubCliError when getIssue fails with exit code 1", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 1,
			stderr: "Network timeout",
			stdout: "",
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.getIssue(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("claims issue atomically by checking assignees, editing issue, and verifying claim", async () => {
		// Arrange
		let editCalled = false;
		let callCount = 0;

		const mockRunner: ProcessRunner = async (cmd) => {
			if (cmd[0] === "gh" && cmd[1] === "issue" && cmd[2] === "edit") {
				expect(cmd[3]).toBe("163");
				expect(cmd[4]).toBe("--add-assignee");
				expect(cmd[5]).toBe("@me");
				editCalled = true;
				return {
					exitCode: 0,
					stderr: "",
					stdout: "https://github.com/org/repo/issues/163",
				};
			}

			callCount += 1;
			const isPostClaim = callCount > 1;
			return {
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					data: {
						repository: {
							issue: {
								assignees: {
									nodes: isPostClaim ? [{ login: "agent-runner" }] : [],
								},
								body: "Claimable issue",
								createdAt: "2026-08-01T00:00:00Z",
								issueDependenciesSummary: { blockedBy: 0 },
								labels: { nodes: [{ name: "ready-for-agent" }] },
								number: 163,
								title: "Claimable issue",
							},
						},
					},
				}),
			};
		};

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const claimed = await client.claimIssue(163, "agent-runner");

		// Assert
		expect(editCalled).toBe(true);
		expect(claimed.number).toBe(163);
		expect(claimed.assignees).toEqual(["agent-runner"]);
	});

	it("throws IssueAlreadyClaimedError when post-claim assignee does not match expected assignee", async () => {
		// Arrange
		let callCount = 0;
		const mockRunner: ProcessRunner = async (cmd) => {
			if (cmd[0] === "gh" && cmd[1] === "issue" && cmd[2] === "edit") {
				return { exitCode: 0, stderr: "", stdout: "" };
			}

			callCount += 1;
			const isPostClaim = callCount > 1;
			return {
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					data: {
						repository: {
							issue: {
								assignees: {
									nodes: isPostClaim ? [{ login: "competitor-runner" }] : [],
								},
								body: "",
								issueDependenciesSummary: { blockedBy: 0 },
								labels: { nodes: [] },
								number: 163,
								title: "Race issue",
							},
						},
					},
				}),
			};
		};

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.claimIssue(163, "my-agent-runner");

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueAlreadyClaimedError);
	});

	it("throws IssueAlreadyClaimedError before running edit if issue is already claimed", async () => {
		// Arrange
		const editSpy = vi.fn();
		const mockRunner: ProcessRunner = async (cmd) => {
			if (cmd[1] === "issue" && cmd[2] === "edit") {
				editSpy();
				return { exitCode: 0, stderr: "", stdout: "" };
			}
			return {
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					data: {
						repository: {
							issue: {
								assignees: { nodes: [{ login: "existing-worker" }] },
								body: "",
								issueDependenciesSummary: { blockedBy: 0 },
								labels: { nodes: [] },
								number: 163,
								title: "Already claimed issue",
							},
						},
					},
				}),
			};
		};

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.claimIssue(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(IssueAlreadyClaimedError);
		expect(editSpy).not.toHaveBeenCalled();
	});

	it("throws GithubCliError when gh issue edit fails during claim", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async (cmd) => {
			if (cmd[1] === "issue" && cmd[2] === "edit") {
				return { exitCode: 1, stderr: "Could not add assignee", stdout: "" };
			}
			return {
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					data: {
						repository: {
							issue: {
								assignees: { nodes: [] },
								body: "",
								issueDependenciesSummary: { blockedBy: 0 },
								labels: { nodes: [] },
								number: 163,
								title: "Issue",
							},
						},
					},
				}),
			};
		};

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.claimIssue(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("throws ClaimVerificationError when post-claim verification finds empty assignees", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async (cmd) => {
			if (cmd[1] === "issue" && cmd[2] === "edit") {
				return { exitCode: 0, stderr: "", stdout: "" };
			}
			return {
				exitCode: 0,
				stderr: "",
				stdout: JSON.stringify({
					data: {
						repository: {
							issue: {
								assignees: { nodes: [] },
								body: "",
								issueDependenciesSummary: { blockedBy: 0 },
								labels: { nodes: [] },
								number: 163,
								title: "Issue",
							},
						},
					},
				}),
			};
		};

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.claimIssue(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(ClaimVerificationError);
	});

	it("releases claim using gh issue edit --remove-assignee @me", async () => {
		// Arrange
		let editCommand: readonly string[] = [];
		const mockRunner: ProcessRunner = async (cmd) => {
			editCommand = cmd;
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		await client.releaseClaim(163);

		// Assert
		expect(editCommand).toEqual([
			"gh",
			"issue",
			"edit",
			"163",
			"--remove-assignee",
			"@me",
		]);
	});

	it("throws GithubCliError when releaseClaim fails with non-zero exit code", async () => {
		// Arrange
		const mockRunner: ProcessRunner = async () => ({
			exitCode: 1,
			stderr: "Failed to edit issue",
			stdout: "",
		});
		const client = new DefaultGithubClient({ runner: mockRunner });

		// Act
		const resultPromise = client.releaseClaim(163);

		// Assert
		await expect(resultPromise).rejects.toThrow(GithubCliError);
	});

	it("defaultBunSpawnRunner executes using Bun.spawn with env options", async () => {
		// Arrange
		const originalBun = (globalThis as unknown as { Bun?: unknown }).Bun;
		const mockSpawn = vi.fn().mockImplementation(() => ({
			exited: Promise.resolve(0),
			stderr: new Blob([""]).stream(),
			stdout: new Blob(["bun spawn output"]).stream(),
		}));
		(globalThis as unknown as { Bun?: unknown }).Bun = { spawn: mockSpawn };

		try {
			// Act
			const result = await defaultBunSpawnRunner(["echo", "hi"], {
				cwd: "/tmp",
				env: { FOO: "BAR" },
			});

			// Assert
			expect(mockSpawn).toHaveBeenCalledWith(["echo", "hi"], {
				cwd: "/tmp",
				env: expect.objectContaining({ FOO: "BAR" }),
				stderr: "pipe",
				stdout: "pipe",
			});
			expect(result.stdout).toBe("bun spawn output");
			expect(result.exitCode).toBe(0);
		} finally {
			(globalThis as unknown as { Bun?: unknown }).Bun = originalBun;
		}
	});

	it("defaultBunSpawnRunner executes using Bun.spawn without env options", async () => {
		// Arrange
		const originalBun = (globalThis as unknown as { Bun?: unknown }).Bun;
		const mockSpawn = vi.fn().mockImplementation(() => ({
			exited: Promise.resolve(0),
			stderr: new Blob([""]).stream(),
			stdout: new Blob(["bun default env"]).stream(),
		}));
		(globalThis as unknown as { Bun?: unknown }).Bun = { spawn: mockSpawn };

		try {
			// Act
			const result = await defaultBunSpawnRunner(["echo", "no-options"]);

			// Assert
			expect(mockSpawn).toHaveBeenCalledWith(["echo", "no-options"], {
				cwd: undefined,
				env: process.env,
				stderr: "pipe",
				stdout: "pipe",
			});
			expect(result.stdout).toBe("bun default env");
			expect(result.exitCode).toBe(0);
		} finally {
			(globalThis as unknown as { Bun?: unknown }).Bun = originalBun;
		}
	});
});
