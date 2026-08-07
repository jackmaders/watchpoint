import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	determineSkillPath,
	executeGrilling,
	executeSpecPublishing,
	READY_FOR_SPEC_LABEL,
	run,
	SPEC_READY_LABEL,
} from "./pm-agent";

vi.mock("@actions/github");
vi.mock("@google/genai");

describe("pm-agent unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.GEMINI_API_KEY = "fake-api-key";
		process.env.ISSUE_NUMBER = "42";
	});

	describe("determineSkillPath label-driven state machine", () => {
		it("defaults to grill-me skill when ready-for-spec label is absent", () => {
			const skillPath = determineSkillPath(["idea"]);
			expect(skillPath).toBe(".github/skills/grill-me.md");
		});

		it("defaults to grill-me skill when issue has spec-ready label and user comments", () => {
			const skillPath = determineSkillPath(["idea", SPEC_READY_LABEL]);
			expect(skillPath).toBe(".github/skills/grill-me.md");
		});

		it("switches to to-spec skill when ready-for-spec label is present on issue", () => {
			const skillPath = determineSkillPath(["idea", READY_FOR_SPEC_LABEL]);
			expect(skillPath).toBe(".github/skills/to-spec.md");
		});
	});

	describe("executeSpecPublishing", () => {
		it("updates issue body with spec, removes ready-for-spec label, adds spec-ready label, and posts notification comment", async () => {
			const octokit = github.getOctokit("token");

			await executeSpecPublishing(
				octokit,
				"# [EPIC] Form Spec",
				["idea", READY_FOR_SPEC_LABEL],
				42,
				"jackmaders",
				"watchpoint",
			);

			expect(octokit.rest.issues.update).toHaveBeenCalledWith({
				body: "# [EPIC] Form Spec",
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: READY_FOR_SPEC_LABEL,
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 42,
				labels: [SPEC_READY_LABEL],
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					issue_number: 42,
					owner: "jackmaders",
					repo: "watchpoint",
				}),
			);
		});
	});

	describe("executeGrilling", () => {
		it("removes spec-ready label if present and posts grilling comment", async () => {
			const octokit = github.getOctokit("token");

			await executeGrilling(
				octokit,
				"❓ **Q1** - Details?",
				[SPEC_READY_LABEL, "idea"],
				42,
				"jackmaders",
				"watchpoint",
			);

			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: SPEC_READY_LABEL,
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: "❓ **Q1** - Details?",
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});

			expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
		});

		it("adds ready-for-spec label when response contains completion signal", async () => {
			const octokit = github.getOctokit("token");

			await executeGrilling(
				octokit,
				"✅ All requirements clarified!",
				["idea"],
				42,
				"jackmaders",
				"watchpoint",
			);

			expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 42,
				labels: [READY_FOR_SPEC_LABEL],
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});
	});

	describe("run integration workflow execution", () => {
		it("executes run() end-to-end for grilling flow without error", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: { body: "My feature idea", labels: [] },
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValue([]);

			await run();

			expect(octokit.rest.issues.get).toHaveBeenCalledWith({
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(octokit.rest.issues.createComment).toHaveBeenCalled();
		});
	});
});
