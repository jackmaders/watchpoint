import { describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import {
	REQUIRED_QUALITY_CHECK_NAMES,
	waitForQualityChecks,
} from "../implement-pr";

describe("waitForQualityChecks", () => {
	it("requires all five PR Quality Checks jobs for the pushed SHA", async () => {
		// Arrange
		const jobs = REQUIRED_QUALITY_CHECK_NAMES.map((name) => ({
			conclusion: "success",
			name,
			status: "completed",
		}));
		const listWorkflowRunsForRepo = vi.fn().mockResolvedValue({
			data: {
				workflow_runs: [
					{
						conclusion: "success",
						head_sha: "pushed-sha",
						id: 77,
						name: "PR Quality Checks",
						status: "completed",
					},
				],
			},
		});
		const listJobsForWorkflowRun = vi.fn().mockResolvedValue({
			data: { jobs },
		});
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: { listJobsForWorkflowRun, listWorkflowRunsForRepo },
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			timeoutMs: 0,
		});

		// Assert
		expect(result).toEqual({ status: "passed" });
		expect(listWorkflowRunsForRepo).toHaveBeenCalledWith(
			expect.objectContaining({
				head_sha: "pushed-sha",
				workflow_id: "pull-request.yml",
			}),
		);
		expect(listJobsForWorkflowRun).toHaveBeenCalledWith(
			expect.objectContaining({ run_id: 77 }),
		);
	});

	it("reports a failed required job instead of chaining review", async () => {
		// Arrange
		const jobs = REQUIRED_QUALITY_CHECK_NAMES.map((name, index) => ({
			conclusion: index === 0 ? "failure" : "success",
			name,
			status: "completed",
		}));
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: {
						listJobsForWorkflowRun: vi.fn().mockResolvedValue({
							data: { jobs },
						}),
						listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
							data: {
								workflow_runs: [
									{
										conclusion: "failure",
										head_sha: "pushed-sha",
										id: 78,
										name: "PR Quality Checks",
										status: "completed",
									},
								],
							},
						}),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			timeoutMs: 0,
		});

		// Assert
		expect(result.status).toBe("failed");
		expect(result).toEqual(
			expect.objectContaining({
				reason: expect.stringContaining(REQUIRED_QUALITY_CHECK_NAMES[0]),
			}),
		);
	});

	it("times out when the exact-SHA quality run never appears", async () => {
		// Arrange
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: {
						listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
							data: { workflow_runs: [] },
						}),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			now: () => 100,
			timeoutMs: 0,
		});

		// Assert
		expect(result).toEqual({
			reason: expect.stringContaining("Timed out"),
			status: "timed-out",
		});
	});

	it("polls while required jobs are still running", async () => {
		// Arrange
		const run = {
			conclusion: null,
			head_sha: "pushed-sha",
			id: 79,
			name: "PR Quality Checks",
			status: "in_progress",
		};
		const jobs = REQUIRED_QUALITY_CHECK_NAMES.map((name) => ({
			conclusion: null,
			name,
			status: "in_progress",
		}));
		const listJobsForWorkflowRun = vi
			.fn()
			.mockResolvedValueOnce({ data: { jobs } })
			.mockResolvedValueOnce({
				data: {
					jobs: REQUIRED_QUALITY_CHECK_NAMES.map((name) => ({
						conclusion: "success",
						name,
						status: "completed",
					})),
				},
			});
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: {
						listJobsForWorkflowRun,
						listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
							data: { workflow_runs: [run] },
						}),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;
		const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(100);

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			intervalMs: 0,
			now,
			timeoutMs: 10,
		});

		// Assert
		expect(result).toEqual({ status: "passed" });
	});

	it("fails when the quality API cannot be read", async () => {
		// Arrange
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: {
						listWorkflowRunsForRepo: vi
							.fn()
							.mockRejectedValue(new Error("permission denied")),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			timeoutMs: 0,
		});

		// Assert
		expect(result).toEqual({
			reason: expect.stringContaining("permission denied"),
			status: "failed",
		});
	});

	it("fails when the workflow completes without all required jobs", async () => {
		// Arrange
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: {
						listJobsForWorkflowRun: vi.fn().mockResolvedValue({
							data: { jobs: [] },
						}),
						listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
							data: {
								workflow_runs: [
									{
										conclusion: "failure",
										head_sha: "pushed-sha",
										id: 80,
										name: "PR Quality Checks",
										status: "completed",
									},
								],
							},
						}),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			timeoutMs: 0,
		});

		// Assert
		expect(result).toEqual(
			expect.objectContaining({
				reason: expect.stringContaining("missing jobs"),
				status: "failed",
			}),
		);
	});

	it("reports unknown conclusion when all required jobs are still pending", async () => {
		// Arrange
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					actions: {
						listJobsForWorkflowRun: vi.fn().mockResolvedValue({
							data: {
								jobs: REQUIRED_QUALITY_CHECK_NAMES.map((name) => ({
									conclusion: null,
									name,
									status: "in_progress",
								})),
							},
						}),
						listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
							data: {
								workflow_runs: [
									{
										conclusion: null,
										head_sha: "pushed-sha",
										id: 81,
										name: "PR Quality Checks",
										status: "completed",
									},
								],
							},
						}),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		const result = await waitForQualityChecks(ctx, "pushed-sha", {
			timeoutMs: 0,
		});

		// Assert
		expect(result).toEqual({
			reason: expect.stringContaining("unknown; missing jobs: none"),
			status: "failed",
		});
	});
});
