import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	determineSkillPath,
	executeGrilling,
	executeSpecPublishing,
	extractOriginalProposal,
	parseAgentAction,
	run,
} from "./pm-agent";
import { SPEC_NEEDED_LABEL, SPEC_READY_LABEL } from "./pm-shared";

vi.mock("@actions/github");
vi.mock("@google/genai");

describe("pm-agent unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.GEMINI_API_KEY = "fake-api-key";
		process.env.ISSUE_NUMBER = "42";
	});

	describe("determineSkillPath state machine & command handling", () => {
		it("returns grill-me skill when spec-needed label is present", () => {
			const skillPath = determineSkillPath([SPEC_NEEDED_LABEL]);
			expect(skillPath).toBe(".github/skills/grill-me.md");
		});

		it("returns null when issue lacks spec-needed label and lacks slash command", () => {
			const skillPath = determineSkillPath([]);
			expect(skillPath).toBeNull();
		});

		it("switches to to-spec skill when /spec command is present in comment", () => {
			const skillPath = determineSkillPath([], "Please generate /spec now");
			expect(skillPath).toBe(".github/skills/to-spec.md");
		});

		it("switches to grill-me skill when /grill command is present in comment on issue without spec-needed label", () => {
			const skillPath = determineSkillPath([], "I want to /grill more details");
			expect(skillPath).toBe(".github/skills/grill-me.md");
		});
	});

	describe("parseAgentAction helper", () => {
		it("returns GRILL action for standard text", () => {
			const action = parseAgentAction("❓ Q1 - What about schema?");
			expect(action).toEqual({
				responseText: "❓ Q1 - What about schema?",
				type: "GRILL",
			});
		});

		it("returns PUBLISH_SPEC action when trigger regex matches", () => {
			const text = '<!-- Trigger: "to-spec" -->\n# [EPIC] Form Spec';
			const action = parseAgentAction(text);
			expect(action).toEqual({
				specText: "# [EPIC] Form Spec",
				type: "PUBLISH_SPEC",
			});
		});
	});

	describe("extractOriginalProposal helper", () => {
		it("returns empty string when body is empty", () => {
			expect(extractOriginalProposal("")).toBe("");
		});

		it("extracts original proposal from existing details collapsible block", () => {
			const text =
				"# [EPIC] Title\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\nMy original idea\n</details>";
			expect(extractOriginalProposal(text)).toBe("My original idea");
		});

		it("returns full body trimmed when no details tag exists", () => {
			expect(extractOriginalProposal("My original proposal")).toBe(
				"My original proposal",
			);
		});
	});

	describe("executeSpecPublishing", () => {
		it("updates issue body with spec and collapsible details block, adds spec-ready label, and posts notification comment", async () => {
			const octokit = github.getOctokit("token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await executeSpecPublishing(
				ctx,
				"# [EPIC] Form Spec",
				"Original issue proposal content",
			);

			expect(octokit.rest.issues.update).toHaveBeenCalledWith({
				body: "# [EPIC] Form Spec\n\n<details>\n<summary>📜 Original Issue Proposal</summary>\n\nOriginal issue proposal content\n</details>",
				issue_number: 42,
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
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await executeGrilling(ctx, "❓ **Q1** - Details?", [
				SPEC_READY_LABEL,
				"idea",
			]);

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
		});
	});

	describe("run integration workflow execution", () => {
		it("executes run() end-to-end for grilling flow without error", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: {
					body: "My feature idea",
					labels: [{ name: SPEC_NEEDED_LABEL }],
				},
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

		it("skips execution smoothly when issue lacks spec-needed label and no override command", async () => {
			const octokit = github.getOctokit("token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValue({
				data: { body: "My feature idea", labels: [{ name: SPEC_READY_LABEL }] },
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValue([]);

			await run();

			expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
		});
	});
});
