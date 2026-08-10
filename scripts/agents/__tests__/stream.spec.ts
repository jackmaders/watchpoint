import { describe, expect, it } from "vitest";
import { parseStreamLine } from "../stream";

// The rest of stream.ts — the spawn seam, line framing, and the projections
// over a finished event list — is exercised through `runAgent` in
// run-agent.spec.ts, where a real (faked) process drives it end to end.

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
