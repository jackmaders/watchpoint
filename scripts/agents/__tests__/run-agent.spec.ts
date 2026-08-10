import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	classifyFailure,
	extractTagged,
	parseAndValidate,
	parseStreamLine,
	substitutePromptArgs,
} from "../run-agent";

// Seam-level tests (spawn, the CLI subprocess, real OUTPUT_DIR files) live in
// run-agent-runner.spec.ts — this file is the pure functions only, per the
// repo's file-size guard (CODING_STANDARDS.md).
const ResultSchema = z.object({ ok: z.boolean() });

describe("parseStreamLine", () => {
	it("parses an init event into a session_id event", () => {
		// Arrange
		const line = '{"type":"init","session_id":"sess_1","model":"flash"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ sessionId: "sess_1", type: "session_id" }]);
	});

	it("parses an assistant message into a text event", () => {
		// Arrange
		const line = '{"type":"message","role":"assistant","content":"hello"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ text: "hello", type: "text" }]);
	});

	it("ignores user messages", () => {
		// Arrange
		const line = '{"type":"message","role":"user","content":"hi"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("parses a tool_use event into a tool_call event", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"Bash","tool_id":"t1","parameters":{"command":"echo hi"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ name: "Bash", type: "tool_call" }]);
	});

	it("parses an activate_skill tool_use event into an activate_skill event", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1","parameters":{"name":"grilling"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ skill: "grilling", type: "activate_skill" }]);
	});

	it("parses a result event with stats into result and usage events", () => {
		// Arrange
		const line =
			'{"type":"result","status":"success","stats":{"input_tokens":10,"output_tokens":5}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([
			{ status: "success", type: "result" },
			{ inputTokens: 10, outputTokens: 5, type: "usage" },
		]);
	});

	it("parses a result event without stats into a result event only", () => {
		// Arrange
		const line = '{"type":"result","status":"error"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ status: "error", type: "result" }]);
	});

	it("parses an error event into a result event with error status", () => {
		// Arrange
		const line = '{"type":"error","message":"API key invalid"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ status: "error", type: "result" }]);
	});

	it("drops tool_result events, which are not part of the normalised union", () => {
		// Arrange
		const line = '{"type":"tool_result","tool_id":"t1","status":"success"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops unrecognised event types", () => {
		// Arrange
		const line = '{"type":"unknown_event"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops malformed JSON", () => {
		// Arrange
		const line = "{not json";

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops blank lines", () => {
		// Arrange
		const line = "   ";

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops an init event with no session_id", () => {
		// Arrange
		const line = '{"type":"init","model":"flash"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops a parsed JSON value that is not an object", () => {
		// Arrange
		const line = "42";

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops an object with no type field", () => {
		// Arrange
		const line = '{"foo":"bar"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops a tool_use event with no tool_name", () => {
		// Arrange
		const line = '{"type":"tool_use","tool_id":"t1","parameters":{}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops an activate_skill tool_use with no parameters", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("reads the skill name from parameters.skill when parameters.name is absent", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1","parameters":{"skill":"grilling"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ skill: "grilling", type: "activate_skill" }]);
	});

	it("defaults token counts to 0 when stats carries non-numeric values", () => {
		// Arrange
		const line = '{"type":"result","status":"success","stats":{}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([
			{ status: "success", type: "result" },
			{ inputTokens: 0, outputTokens: 0, type: "usage" },
		]);
	});
});

describe("substitutePromptArgs", () => {
	it("substitutes every {{KEY}} occurrence from promptArgs", () => {
		// Arrange
		const template = "Hello {{NAME}}, welcome to {{PLACE}}.";

		// Act
		const result = substitutePromptArgs(template, {
			NAME: "Ada",
			PLACE: "Watchpoint",
		});

		// Assert
		expect(result).toBe("Hello Ada, welcome to Watchpoint.");
	});

	it("throws on an unmatched {{KEY}} placeholder", () => {
		// Arrange
		const template = "Hello {{NAME}}.";

		// Act
		const act = () => substitutePromptArgs(template, {});

		// Assert
		expect(act).toThrow(/Unmatched prompt placeholder: \{\{NAME\}\}/);
	});

	it("warns, but does not throw, on an unused promptArg", () => {
		// Arrange
		const template = "Hello.";

		// Act
		const act = () => substitutePromptArgs(template, { UNUSED: "value" });

		// Assert
		expect(act).not.toThrow();
	});

	it("treats argument values as inert — a value containing {{...}} is never re-scanned", () => {
		// Arrange
		const template = "Payload: {{PAYLOAD}}";

		// Act
		const result = substitutePromptArgs(template, { PAYLOAD: "{{INJECTED}}" });

		// Assert
		expect(result).toBe("Payload: {{INJECTED}}");
	});

	it("treats argument values as inert — backtick-shell syntax stays literal", () => {
		// Arrange
		const template = "Issue text: {{ISSUE_BODY}}";

		// Act
		const result = substitutePromptArgs(template, {
			ISSUE_BODY: "here's a command: `rm -rf /`",
		});

		// Assert
		expect(result).toBe("Issue text: here's a command: `rm -rf /`");
	});
});

describe("extractTagged", () => {
	it("extracts the payload between the named tag", () => {
		// Arrange
		const text = 'Some preamble.\n<result>{"ok":true}</result>\nSome trailer.';

		// Act
		const extracted = extractTagged(text, "result");

		// Assert
		expect(extracted).toBe('{"ok":true}');
	});

	it("returns null when the tag is absent", () => {
		// Arrange
		const text = "No tags here.";

		// Act
		const extracted = extractTagged(text, "result");

		// Assert
		expect(extracted).toBeNull();
	});

	it("extracts only the first tagged block when more than one is present", () => {
		// Arrange
		const text = "<result>first</result><result>second</result>";

		// Act
		const extracted = extractTagged(text, "result");

		// Assert
		expect(extracted).toBe("first");
	});
});

describe("parseAndValidate", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns the raw text unchanged for prose output", () => {
		// Arrange
		const text = "Just a plain reply.";

		// Act
		const result = parseAndValidate(text, { kind: "prose" });

		// Assert
		expect(result).toEqual({ success: true, value: "Just a plain reply." });
	});

	it("extracts, parses, and validates a well-formed tagged payload", () => {
		// Arrange
		const text = '<result>{"ok":true}</result>';

		// Act
		const result = parseAndValidate(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result).toEqual({ success: true, value: { ok: true } });
	});

	it("fails when the tag is missing", () => {
		// Arrange
		const text = "No tag here.";

		// Act
		const result = parseAndValidate(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result.success).toBe(false);
		expect((result as { error: string }).error).toContain("No <result> tag");
	});

	it("fails when the tagged content is not valid JSON", () => {
		// Arrange
		const text = "<result>{not json}</result>";

		// Act
		const result = parseAndValidate(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result.success).toBe(false);
		expect((result as { error: string }).error).toContain(
			"Failed to parse JSON",
		);
	});

	it("falls back to String(error) when JSON.parse throws a non-Error value", () => {
		// Arrange
		vi.spyOn(JSON, "parse").mockImplementation(() => {
			throw "boom";
		});
		const text = "<result>anything</result>";

		// Act
		const result = parseAndValidate(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result.success).toBe(false);
		expect((result as { error: string }).error).toContain("boom");
	});

	it("fails when the parsed JSON does not match the schema", () => {
		// Arrange
		const text = '<result>{"ok":"not a boolean"}</result>';

		// Act
		const result = parseAndValidate(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result.success).toBe(false);
	});
});

describe("classifyFailure", () => {
	it("classifies exit 0, signal seen, schema valid as ok", () => {
		// Arrange
		const input = {
			exitCode: 0,
			raw: "",
			schemaValid: true,
			skillActivated: true,
		};

		// Act
		const result = classifyFailure(input);

		// Assert
		expect(result).toBe("ok");
	});

	it("classifies exit 1 with rate-limit text as quota", () => {
		// Arrange
		const input = {
			exitCode: 1,
			raw: "Error: rate limit exceeded, try again tomorrow",
			schemaValid: true,
			skillActivated: true,
		};

		// Act
		const result = classifyFailure(input);

		// Assert
		expect(result).toBe("quota");
	});

	it("classifies exit 53 as turn-limit", () => {
		// Arrange
		const input = {
			exitCode: 53,
			raw: "",
			schemaValid: true,
			skillActivated: true,
		};

		// Act
		const result = classifyFailure(input);

		// Assert
		expect(result).toBe("turn-limit");
	});

	it("classifies exit 42 as bad-input", () => {
		// Arrange
		const input = {
			exitCode: 42,
			raw: "",
			schemaValid: true,
			skillActivated: true,
		};

		// Act
		const result = classifyFailure(input);

		// Assert
		expect(result).toBe("bad-input");
	});

	it("classifies an invalid schema after retries as bad-output", () => {
		// Arrange
		const input = {
			exitCode: 0,
			raw: "",
			schemaValid: false,
			skillActivated: true,
		};

		// Act
		const result = classifyFailure(input);

		// Assert
		expect(result).toBe("bad-output");
	});

	it("classifies an unactivated expected skill as skill-miss", () => {
		// Arrange
		const input = {
			exitCode: 0,
			expectSkill: "grilling",
			raw: "",
			schemaValid: true,
			skillActivated: false,
		};

		// Act
		const result = classifyFailure(input);

		// Assert
		expect(result).toBe("skill-miss");
	});
});
