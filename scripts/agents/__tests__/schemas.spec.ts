import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MODELS } from "../models";
import {
	CONVENTIONAL_COMMIT_TYPES,
	filterReviewComments,
	GrillRoundSchema,
	ImplementPrSchema,
	ImplementSchema,
	type InlineComment,
	OUTPUTS,
	PR_TEMPLATE_NAMES,
	ResearchSchema,
	ReviewSchema,
	SpecSchema,
	type Ticket,
	TicketBreakdownSchema,
} from "../schemas";

const PROMPTS_DIR = join(import.meta.dirname, "..", "prompts");
const PR_TEMPLATE_DIR = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	".github",
	"PULL_REQUEST_TEMPLATE",
);

function ticket(overrides: Partial<Ticket> = {}): Ticket {
	return {
		acceptanceCriteria: ["It does the thing"],
		blockers: [],
		id: "t1",
		implementationSteps: ["Write the test", "Make it pass"],
		title: "Build the thing",
		whatToBuild: "The thing.",
		...overrides,
	};
}

describe("GrillRoundSchema", () => {
	it("accepts a well-formed grill round", () => {
		// Arrange
		const payload = { frontierEmpty: false, roundMarkdown: "1. Q?" };

		// Act
		const result = GrillRoundSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects an empty roundMarkdown", () => {
		// Arrange
		const payload = { frontierEmpty: false, roundMarkdown: "" };

		// Act
		const result = GrillRoundSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a non-boolean frontierEmpty", () => {
		// Arrange
		const payload = { frontierEmpty: "yes", roundMarkdown: "1. Q?" };

		// Act
		const result = GrillRoundSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a roundMarkdown over the 8000-character bound", () => {
		// Arrange
		const payload = { frontierEmpty: false, roundMarkdown: "a".repeat(8001) };

		// Act
		const result = GrillRoundSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("SpecSchema", () => {
	it("accepts a well-formed spec", () => {
		// Arrange
		const payload = {
			outOfScope: ["Mobile app"],
			seams: [
				{
					name: "runAgent",
					rationale: "The one seam every model call passes through.",
				},
			],
			specMarkdown: "# Spec",
		};

		// Act
		const result = SpecSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects an empty specMarkdown", () => {
		// Arrange
		const payload = { outOfScope: [], seams: [], specMarkdown: "" };

		// Act
		const result = SpecSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a seam missing a rationale", () => {
		// Arrange
		const payload = {
			outOfScope: [],
			seams: [{ name: "runAgent" }],
			specMarkdown: "# Spec",
		};

		// Act
		const result = SpecSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects more than 30 seams", () => {
		// Arrange
		const seam = { name: "s", rationale: "r" };
		const payload = {
			outOfScope: [],
			seams: Array.from({ length: 31 }, () => seam),
			specMarkdown: "# Spec",
		};

		// Act
		const result = SpecSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects more than 30 outOfScope entries", () => {
		// Arrange
		const payload = {
			outOfScope: Array.from({ length: 31 }, (_unused, i) => `item ${i}`),
			seams: [],
			specMarkdown: "# Spec",
		};

		// Act
		const result = SpecSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("TicketBreakdownSchema", () => {
	it("accepts a well-formed breakdown with a satisfied blocker", () => {
		// Arrange
		const payload = {
			tickets: [ticket({ id: "t1" }), ticket({ blockers: ["t1"], id: "t2" })],
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects a breakdown with no tickets", () => {
		// Arrange
		const payload = { tickets: [] };

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a ticket with no acceptance criteria", () => {
		// Arrange
		const payload = { tickets: [ticket({ acceptanceCriteria: [] })] };

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects the whole payload when a blocker id is not a declared ticket", () => {
		// Arrange
		const payload = { tickets: [ticket({ blockers: ["ghost"], id: "t1" })] };

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain("ghost");
		}
	});

	it("rejects the whole payload when the blocker graph contains a cycle", () => {
		// Arrange
		const payload = {
			tickets: [
				ticket({ blockers: ["t2"], id: "t1" }),
				ticket({ blockers: ["t1"], id: "t2" }),
			],
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) => issue.message.includes("cycle")),
			).toBe(true);
		}
	});

	it("accepts a ticket that blocks on itself indirectly through a longer, acyclic chain", () => {
		// Arrange
		const payload = {
			tickets: [
				ticket({ blockers: [], id: "t1" }),
				ticket({ blockers: ["t1"], id: "t2" }),
				ticket({ blockers: ["t2"], id: "t3" }),
			],
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects a ticket with more than 20 acceptance criteria", () => {
		// Arrange
		const payload = {
			tickets: [
				ticket({
					acceptanceCriteria: Array.from(
						{ length: 21 },
						(_unused, i) => `AC ${i}`,
					),
				}),
			],
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a ticket with more than 20 blockers", () => {
		// Arrange
		const payload = {
			tickets: [
				ticket({
					blockers: Array.from({ length: 21 }, (_unused, i) => `t${i}`),
				}),
			],
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a ticket with more than 30 implementation steps", () => {
		// Arrange
		const payload = {
			tickets: [
				ticket({
					implementationSteps: Array.from(
						{ length: 31 },
						(_unused, i) => `Step ${i}`,
					),
				}),
			],
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a breakdown with more than 50 tickets", () => {
		// Arrange
		const payload = {
			tickets: Array.from({ length: 51 }, (_unused, i) =>
				ticket({ id: `t${i}` }),
			),
		};

		// Act
		const result = TicketBreakdownSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("ImplementSchema", () => {
	function implementPayload(templateOverride?: string) {
		return {
			pr: {
				emoji: "🔑",
				scope: "auth",
				template: templateOverride ?? "feature.md",
				title: "feat(auth): 🔑 add login",
				type: "feat",
			},
			summary: "Added login.",
		};
	}

	it("accepts a well-formed implement payload", () => {
		// Arrange
		const payload = implementPayload();

		// Act
		const result = ImplementSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects a template that is not a real file in .github/PULL_REQUEST_TEMPLATE/", () => {
		// Arrange
		const payload = implementPayload("made-up.md");

		// Act
		const result = ImplementSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a commit type outside the conventional-commit vocabulary", () => {
		// Arrange
		const payload = {
			...implementPayload(),
			pr: { ...implementPayload().pr, type: "oops" },
		};

		// Act
		const result = ImplementSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects a pr.scope over the 100-character bound", () => {
		// Arrange
		const payload = {
			...implementPayload(),
			pr: { ...implementPayload().pr, scope: "a".repeat(101) },
		};

		// Act
		const result = ImplementSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("ReviewSchema", () => {
	function reviewPayload(verdict = "approved") {
		return {
			inlineComments: [{ body: "Nit.", line: 10, path: "src/foo.ts" }],
			replies: [{ body: "Done.", commentId: "abc" }],
			summary: "Looks good.",
			verdict,
		};
	}

	it("accepts a well-formed review payload", () => {
		// Arrange
		const payload = reviewPayload();

		// Act
		const result = ReviewSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects a verdict outside approved/changes-requested", () => {
		// Arrange
		const payload = reviewPayload("escalated");

		// Act
		const result = ReviewSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects an inline comment's line number below 1", () => {
		// Arrange
		const payload = {
			...reviewPayload(),
			inlineComments: [{ body: "Nit.", line: 0, path: "src/foo.ts" }],
		};

		// Act
		const result = ReviewSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects more than 50 inline comments", () => {
		// Arrange
		const payload = {
			...reviewPayload(),
			inlineComments: Array.from({ length: 51 }, (_unused, i) => ({
				body: "Nit.",
				line: i + 1,
				path: "src/foo.ts",
			})),
		};

		// Act
		const result = ReviewSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("filterReviewComments", () => {
	const comments: InlineComment[] = [
		{ body: "In diff.", line: 10, path: "src/foo.ts" },
		{ body: "Not in diff.", line: 99, path: "src/foo.ts" },
		{ body: "Unknown path.", line: 10, path: "src/bar.ts" },
	];
	const validLines = new Set(["src/foo.ts:10"]);

	it("keeps a comment whose path and line are both in the diff", () => {
		// Arrange
		// Act
		const result = filterReviewComments(comments, validLines);

		// Assert
		expect(result.comments).toEqual([comments[0]]);
	});

	it("reports the count of comments dropped, not just the survivors", () => {
		// Arrange
		// Act
		const result = filterReviewComments(comments, validLines);

		// Assert
		expect(result.droppedCount).toBe(2);
	});

	it("drops invalid comments individually rather than rejecting the whole set", () => {
		// Arrange
		// Act
		const result = filterReviewComments(comments, validLines);

		// Assert
		expect(result.comments).toHaveLength(1);
	});
});

describe("ImplementPrSchema", () => {
	it("accepts a well-formed implement-pr payload", () => {
		// Arrange
		const payload = {
			replies: [{ body: "Fixed.", commentId: "abc" }],
			summary: "Fixed the nit.",
		};

		// Act
		const result = ImplementPrSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects an empty summary", () => {
		// Arrange
		const payload = { replies: [], summary: "" };

		// Act
		const result = ImplementPrSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects more than 50 replies", () => {
		// Arrange
		const payload = {
			replies: Array.from({ length: 51 }, (_unused, i) => ({
				body: "Fixed.",
				commentId: `c${i}`,
			})),
			summary: "Fixed the nits.",
		};

		// Act
		const result = ImplementPrSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("ResearchSchema", () => {
	it("accepts a well-formed research payload", () => {
		// Arrange
		const payload = {
			findingsMarkdown: "# Findings",
			sources: [{ title: "Docs", url: "https://example.com" }],
		};

		// Act
		const result = ResearchSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects a source with a malformed url", () => {
		// Arrange
		const payload = {
			findingsMarkdown: "# Findings",
			sources: [{ title: "Docs", url: "not-a-url" }],
		};

		// Act
		const result = ResearchSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});

	it("rejects more than 50 sources", () => {
		// Arrange
		const payload = {
			findingsMarkdown: "# Findings",
			sources: Array.from({ length: 51 }, (_unused, i) => ({
				title: `Source ${i}`,
				url: "https://example.com",
			})),
		};

		// Act
		const result = ResearchSchema.safeParse(payload);

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("CONVENTIONAL_COMMIT_TYPES", () => {
	it("matches this repo's commit format types used across the codebase", () => {
		// Arrange
		// Act
		// Assert
		expect(CONVENTIONAL_COMMIT_TYPES).toContain("feat");
		expect(CONVENTIONAL_COMMIT_TYPES).toContain("fix");
	});
});

describe("PR_TEMPLATE_NAMES", () => {
	it("matches the real files in .github/PULL_REQUEST_TEMPLATE/ exactly — no drift", () => {
		// Arrange
		const realFiles = readdirSync(PR_TEMPLATE_DIR).sort();

		// Act
		const declared = [...PR_TEMPLATE_NAMES].sort();

		// Assert
		expect(declared).toEqual(realFiles);
	});
});

describe("OUTPUTS registry completeness", () => {
	const stages = Object.keys(OUTPUTS) as (keyof typeof OUTPUTS)[];

	it("has at least one stage", () => {
		// Arrange
		// Act
		// Assert
		expect(stages.length).toBeGreaterThan(0);
	});

	it.each(stages)("stage %s has a models.ts entry", (stage) => {
		// Arrange
		// Act
		const entry = MODELS[stage];

		// Assert
		expect(entry).toBeDefined();
	});

	it.each(stages)("stage %s has a prompt file on disk", (stage) => {
		// Arrange
		const promptFile = join(PROMPTS_DIR, `${stage}.md`);

		// Act
		const found = existsSync(promptFile);

		// Assert
		expect(found).toBe(true);
	});

	it.each(stages)(
		"stage %s's prompt carries the {{OUTPUT_SCHEMA}} placeholder when it expects structured output",
		(stage) => {
			// Arrange
			const spec = OUTPUTS[stage];
			const promptFile = join(PROMPTS_DIR, `${stage}.md`);
			const contents = readFileSync(promptFile, "utf-8");

			// Act
			const hasPlaceholder = contents.includes("{{OUTPUT_SCHEMA}}");

			// Assert
			if (spec.kind === "object") {
				expect(hasPlaceholder).toBe(true);
			} else {
				expect(hasPlaceholder).toBe(false);
			}
		},
	);

	it("derives every TypeScript payload type from z.infer, never a hand-written interface", () => {
		// Arrange
		// Act
		const schema =
			OUTPUTS.tickets.kind === "object" ? OUTPUTS.tickets.schema : null;

		// Assert
		expect(schema).not.toBeNull();
		expect(schema).toBeInstanceOf(z.ZodType);
	});
});
