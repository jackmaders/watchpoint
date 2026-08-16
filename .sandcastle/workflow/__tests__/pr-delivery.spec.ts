import { describe, expect, it } from "vitest";
import { MockGithubClient } from "../../github/client";
import type { ProcessRunner } from "../../github/types";
import { deliverPullRequest } from "../pr-delivery";
import type { DeliverPullRequestOptions } from "../types";

describe("PR Delivery Engine", () => {
	it("pushes branch with -u origin and opens pull request with ready-for-human label and Closes reference", async () => {
		// Arrange
		const githubClient = new MockGithubClient();
		let executedGitCmd: readonly string[] = [];
		const gitRunner: ProcessRunner = async (cmd) => {
			executedGitCmd = cmd;
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		const options: DeliverPullRequestOptions = {
			attempts: 1,
			branch: "feat/issue-165-lifecycle",
			cwd: "/tmp/worktree/feat-165",
			githubClient,
			gitRunner,
			issue: {
				body: "Implement the workflow orchestrator",
				number: 165,
				title: "feat(workflow): implement lifecycle engine",
			},
		};

		// Act
		const result = await deliverPullRequest(options);
		const createdPRs = githubClient.getCreatedPullRequests();

		// Assert
		expect(executedGitCmd).toEqual([
			"git",
			"push",
			"-u",
			"origin",
			"feat/issue-165-lifecycle",
		]);
		expect(createdPRs).toHaveLength(1);
		expect(createdPRs[0].title).toBe(
			"feat(workflow): implement lifecycle engine",
		);
		expect(createdPRs[0].head).toBe("feat/issue-165-lifecycle");
		expect(createdPRs[0].base).toBe("main");
		expect(createdPRs[0].labels).toEqual(["ready-for-human"]);
		expect(createdPRs[0].body).toContain("Closes #165");
		expect(createdPRs[0].body).toContain("- **Self-healing attempts**: 1");
		expect(result).toEqual({
			number: 1,
			url: "https://github.com/mock/repo/pull/1",
		});
	});

	it("supports custom baseBranch when provided", async () => {
		// Arrange
		const githubClient = new MockGithubClient();
		const gitRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "",
		});

		const options: DeliverPullRequestOptions = {
			attempts: 2,
			baseBranch: "develop",
			branch: "feat/issue-200",
			githubClient,
			gitRunner,
			issue: {
				number: 200,
				title: "Develop feature",
			},
		};

		// Act
		await deliverPullRequest(options);
		const createdPRs = githubClient.getCreatedPullRequests();

		// Assert
		expect(createdPRs[0].base).toBe("develop");
	});

	it("throws error when git push fails", async () => {
		// Arrange
		const githubClient = new MockGithubClient();
		const failingGitRunner: ProcessRunner = async () => ({
			exitCode: 1,
			stderr: "Git push rejected",
			stdout: "",
		});

		const options: DeliverPullRequestOptions = {
			attempts: 1,
			branch: "feat/reject",
			githubClient,
			gitRunner: failingGitRunner,
			issue: {
				number: 300,
				title: "Reject feature",
			},
		};

		// Act
		const deliveryPromise = deliverPullRequest(options);

		// Assert
		await expect(deliveryPromise).rejects.toThrow(
			"Failed to push branch 'feat/reject': Git push rejected",
		);
	});

	it("throws error with stdout when stderr is empty on git push failure", async () => {
		// Arrange
		const githubClient = new MockGithubClient();
		const failingGitRunner: ProcessRunner = async () => ({
			exitCode: 1,
			stderr: "",
			stdout: "Remote rejected push",
		});

		const options: DeliverPullRequestOptions = {
			attempts: 1,
			branch: "feat/stdout-error",
			githubClient,
			gitRunner: failingGitRunner,
			issue: {
				number: 350,
				title: "Stdout error feature",
			},
		};

		// Act
		const deliveryPromise = deliverPullRequest(options);

		// Assert
		await expect(deliveryPromise).rejects.toThrow(
			"Failed to push branch 'feat/stdout-error': Remote rejected push",
		);
	});

	it("throws error when branch has 0 commits ahead of base branch", async () => {
		// Arrange
		const githubClient = new MockGithubClient();
		const zeroCommitsGitRunner: ProcessRunner = async (cmd) => {
			if (cmd[0] === "git" && cmd[1] === "rev-list") {
				return { exitCode: 0, stderr: "", stdout: "0\n" };
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		const options: DeliverPullRequestOptions = {
			attempts: 1,
			branch: "feat/zero-commits",
			githubClient,
			gitRunner: zeroCommitsGitRunner,
			issue: {
				number: 400,
				title: "Zero commits feature",
			},
		};

		// Act
		const deliveryPromise = deliverPullRequest(options);

		// Assert
		await expect(deliveryPromise).rejects.toThrow(
			"Cannot deliver pull request: branch 'feat/zero-commits' has 0 commits ahead of 'main'",
		);
	});

	it("uses default runner when gitRunner is omitted in options", async () => {
		// Arrange
		const githubClient = new MockGithubClient();
		const options: DeliverPullRequestOptions = {
			attempts: 1,
			branch: "feat/no-git-runner",
			githubClient,
			issue: {
				number: 450,
				title: "No runner feature",
			},
		};

		// Act
		const deliveryPromise = deliverPullRequest(options);

		// Assert
		await expect(deliveryPromise).rejects.toThrow();
	});
});
