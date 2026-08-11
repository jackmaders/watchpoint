import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../github";
import { runStage } from "../stage";

vi.mock("@actions/github");
vi.mock("../logger");

function buildCtx(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

describe("runStage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("adds agent:in-progress and removes removeOnEntry plus agent:blocked before running body", async () => {
		// Arrange
		const ctx = buildCtx();
		const body = vi.fn().mockResolvedValue([]);

		// Act
		await runStage(
			ctx,
			["dev:needed", "agent:blocked"],
			{ removeOnEntry: ["dev:needed"], stageName: "Implement" },
			body,
		);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: ["agent:in-progress"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "dev:needed",
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "agent:blocked",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("passes body the post-entry label snapshot, not the raw currentLabels argument", async () => {
		// Arrange
		const ctx = buildCtx();
		const body = vi.fn().mockResolvedValue([]);

		// Act
		await runStage(
			ctx,
			["dev:needed"],
			{ removeOnEntry: ["dev:needed"], stageName: "Implement" },
			body,
		);

		// Assert
		expect(body).toHaveBeenCalledWith(["agent:in-progress"]);
	});

	it("removes agent:in-progress on the happy path, using body's own returned labels", async () => {
		// Arrange
		const ctx = buildCtx();
		const body = vi.fn().mockResolvedValue(["agent:in-progress", "spec:ready"]);

		// Act
		await runStage(ctx, [], { stageName: "Spec" }, body);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("never removes agent:in-progress a second time if body's returned labels already lack it", async () => {
		// Arrange — body already removed it itself via its own transitionState
		// call; `finally` must not attempt a second, redundant removal.
		const ctx = buildCtx();
		const body = vi.fn().mockResolvedValue(["spec:ready"]);

		// Act
		await runStage(ctx, ["agent:in-progress"], { stageName: "Spec" }, body);

		// Assert
		expect(ctx.octokit.rest.issues.removeLabel).not.toHaveBeenCalledWith(
			expect.objectContaining({ name: "agent:in-progress" }),
		);
	});

	it("on failure: runs onFailure, adds agent:blocked, posts a stage-named error comment, and rethrows", async () => {
		// Arrange
		const ctx = buildCtx();
		const onFailure = vi.fn();
		const body = vi.fn().mockRejectedValue(new Error("boom"));

		// Act
		const act = runStage(ctx, [], { onFailure, stageName: "Implement" }, body);

		// Assert
		await expect(act).rejects.toThrow("boom");
		expect(onFailure).toHaveBeenCalledWith(
			expect.objectContaining({ message: "boom" }),
		);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: ["agent:blocked"],
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("⚠️ **Implement Error:**"),
			}),
		);
	});

	it("still removes agent:in-progress in finally after a failure, without requiring an onFailure callback", async () => {
		// Arrange
		const ctx = buildCtx();
		const body = vi.fn().mockRejectedValue(new Error("boom"));

		// Act
		const act = runStage(
			ctx,
			["agent:in-progress"],
			{ stageName: "Grill" },
			body,
		);

		// Assert
		await expect(act).rejects.toThrow("boom");
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: "agent:in-progress",
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});
});
