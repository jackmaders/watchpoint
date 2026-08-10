import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractTagged, truncateAtSignal, validateTaggedJson } from "../output";

const ResultSchema = z.object({ ok: z.boolean() });

describe("truncateAtSignal", () => {
	it("keeps the signal and drops everything the CLI emitted after it", () => {
		// Arrange
		const text =
			"<result>done</result>\n<promise>COMPLETE</promise>\nAnything else?";

		// Act
		const result = truncateAtSignal(text, "<promise>COMPLETE</promise>");

		// Assert
		expect(result).toEqual({
			signalSeen: true,
			text: "<result>done</result>\n<promise>COMPLETE</promise>",
		});
	});

	it("returns the text untouched when the signal never appeared", () => {
		// Arrange
		const text = "still thinking out loud";

		// Act
		const result = truncateAtSignal(text, "<promise>COMPLETE</promise>");

		// Assert
		expect(result).toEqual({
			signalSeen: false,
			text: "still thinking out loud",
		});
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

describe("validateTaggedJson", () => {
	it("extracts, parses, and validates a well-formed tagged payload", () => {
		// Arrange
		const text = '<result>{"ok":true}</result>';

		// Act
		const result = validateTaggedJson(text, {
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
		const result = validateTaggedJson(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result).toEqual({
			error: "No <result> tag found in the model's output.",
			success: false,
		});
	});

	it("fails when the tagged content is not valid JSON", () => {
		// Arrange
		const text = "<result>{not json}</result>";

		// Act
		const result = validateTaggedJson(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result.success).toBe(false);
		expect((result as { error: string }).error).toContain(
			"Failed to parse JSON inside <result>",
		);
	});

	it("fails when the parsed JSON does not match the schema", () => {
		// Arrange
		const text = '<result>{"ok":"not a boolean"}</result>';

		// Act
		const result = validateTaggedJson(text, {
			kind: "object",
			schema: ResultSchema,
			tag: "result",
		});

		// Assert
		expect(result.success).toBe(false);
	});
});
