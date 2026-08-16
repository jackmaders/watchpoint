import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import type { CandidateIssue } from "../../github/types";
import {
	formatAge,
	formatHeader,
	formatIssueRow,
	renderInteractivePicker,
	renderNonInteractive,
} from "../picker";
import type { PickerStreamInput, PickerStreamOutput } from "../types";

class MockInputStream extends EventEmitter implements PickerStreamInput {
	isTTY: boolean;
	rawModeEnabled = false;
	shouldThrowOnSetRawMode = false;

	constructor(isTTY = true) {
		super();
		this.isTTY = isTTY;
	}

	setRawMode(mode: boolean): void {
		if (this.shouldThrowOnSetRawMode) {
			throw new Error("Simulated setRawMode failure");
		}
		this.rawModeEnabled = mode;
	}

	sendKey(name?: string, ctrl = false, str?: string): void {
		const keyStr = str ?? name ?? "";
		this.emit("keypress", keyStr, { ctrl, name, sequence: keyStr });
	}
}

class MockInputStreamNoRawMode
	extends EventEmitter
	implements PickerStreamInput
{
	isTTY = true;

	sendKey(name?: string, ctrl = false, str?: string): void {
		const keyStr = str ?? name ?? "";
		this.emit("keypress", keyStr, { ctrl, name, sequence: keyStr });
	}
}

class MockOutputStream implements PickerStreamOutput {
	chunks: string[] = [];
	shouldThrow = false;

	write(chunk: string): boolean {
		if (this.shouldThrow) {
			throw new Error("Simulated output write failure");
		}
		this.chunks.push(chunk);
		return true;
	}

	getOutput(): string {
		return this.chunks.join("");
	}

	clear(): void {
		this.chunks = [];
	}
}

function makeIssue(
	num: number,
	title: string,
	createdAt?: string,
): CandidateIssue {
	return {
		assignees: [],
		body: `Body for issue #${num}`,
		createdAt,
		issueDependenciesSummary: { blockedBy: 0 },
		labels: ["ready-for-agent"],
		number: num,
		title,
		url: `https://github.com/test/repo/issues/${num}`,
	};
}

describe("formatAge", () => {
	it("returns 'recently' if createdAt is missing or invalid", () => {
		// Arrange
		const now = 1700000000000;

		// Act
		const resultMissing = formatAge(undefined, now);
		const resultInvalid = formatAge("invalid-date", now);

		// Assert
		expect(resultMissing).toBe("recently");
		expect(resultInvalid).toBe("recently");
	});

	it("returns 'just now' if created less than 1 minute ago", () => {
		// Arrange
		const now = 1700000000000;
		const createdAt = new Date(now - 30 * 1000).toISOString();

		// Act
		const result = formatAge(createdAt, now);

		// Assert
		expect(result).toBe("just now");
	});

	it("returns minutes ago for < 60 minutes", () => {
		// Arrange
		const now = 1700000000000;
		const createdAt = new Date(now - 15 * 60 * 1000).toISOString();

		// Act
		const result = formatAge(createdAt, now);

		// Assert
		expect(result).toBe("15m ago");
	});

	it("returns hours ago for < 24 hours", () => {
		// Arrange
		const now = 1700000000000;
		const createdAt = new Date(now - 3 * 3600 * 1000).toISOString();

		// Act
		const result = formatAge(createdAt, now);

		// Assert
		expect(result).toBe("3h ago");
	});

	it("returns days ago for < 30 days", () => {
		// Arrange
		const now = 1700000000000;
		const createdAt = new Date(now - 5 * 86400 * 1000).toISOString();

		// Act
		const result = formatAge(createdAt, now);

		// Assert
		expect(result).toBe("5d ago");
	});

	it("returns months ago for < 365 days", () => {
		// Arrange
		const now = 1700000000000;
		const createdAt = new Date(now - 60 * 86400 * 1000).toISOString();

		// Act
		const result = formatAge(createdAt, now);

		// Assert
		expect(result).toBe("2mo ago");
	});

	it("returns years ago for >= 365 days", () => {
		// Arrange
		const now = 1700000000000;
		const createdAt = new Date(now - 750 * 86400 * 1000).toISOString();

		// Act
		const result = formatAge(createdAt, now);

		// Assert
		expect(result).toBe("2y ago");
	});
});

describe("formatHeader", () => {
	it("returns formatted header string", () => {
		// Arrange & Act
		const header = formatHeader();

		// Assert
		expect(header).toContain("Sandcastle Frontier Picker");
	});
});

describe("formatIssueRow", () => {
	it("formats row without shortcut number when index >= 9", () => {
		// Arrange
		const issue = makeIssue(110, "Tenth Issue");
		const now = 1700000000000;

		// Act
		const unselectedRow = formatIssueRow(issue, 9, false, now);
		const selectedRow = formatIssueRow(issue, 9, true, now);

		// Assert
		expect(unselectedRow).toContain("#110");
		expect(selectedRow).toContain("#110");
	});
});

describe("renderNonInteractive", () => {
	it("renders default timestamp when now argument is omitted", () => {
		// Arrange
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Issue")];

		// Act
		renderNonInteractive(issues, output);

		// Assert
		expect(output.getOutput()).toContain("#101");
	});
});

describe("renderInteractivePicker", () => {
	it("uses default options when options parameter is omitted on empty list", async () => {
		// Arrange
		const originalWrite = process.stdout.write;
		let written = "";
		process.stdout.write = ((chunk: string) => {
			written += chunk;
			return true;
		}) as unknown as typeof process.stdout.write;

		// Act
		try {
			const result = await renderInteractivePicker([]);

			// Assert
			expect(result).toBeNull();
			expect(written).toContain(
				"No unblocked ready-for-agent tickets found in queue.",
			);
		} finally {
			process.stdout.write = originalWrite;
		}
	});

	it("uses default stdout when options.output is omitted in non-TTY mode", async () => {
		// Arrange
		const originalWrite = process.stdout.write;
		let written = "";
		process.stdout.write = ((chunk: string) => {
			written += chunk;
			return true;
		}) as unknown as typeof process.stdout.write;
		const input = new MockInputStream(false);

		// Act
		try {
			const result = await renderInteractivePicker(
				[makeIssue(101, "First Task")],
				{ input },
			);

			// Assert
			expect(result).toBeNull();
			expect(written).toContain("Available Unblocked Frontier Tickets:");
		} finally {
			process.stdout.write = originalWrite;
		}
	});

	it("uses custom now provider when options.now is supplied", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const fixedNow = 1700000000000;
		const issues = [
			makeIssue(
				101,
				"First Task",
				new Date(fixedNow - 3600 * 1000).toISOString(),
			),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, {
			input,
			now: () => fixedNow,
			output,
		});
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
		expect(output.getOutput()).toContain("1h ago");
	});

	it("returns null and prints notice when issue list is empty", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();

		// Act
		const result = await renderInteractivePicker([], { input, output });

		// Assert
		expect(result).toBeNull();
		expect(output.getOutput()).toContain(
			"No unblocked ready-for-agent tickets found in queue.",
		);
	});

	it("prints static list and non-TTY instructions when input is not a TTY", async () => {
		// Arrange
		const input = new MockInputStream(false);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task", "2026-08-16T08:00:00Z"),
			makeIssue(102, "Second Task", "2026-08-15T08:00:00Z"),
		];

		// Act
		const result = await renderInteractivePicker(issues, { input, output });

		// Assert
		expect(result).toBeNull();
		expect(output.getOutput()).toContain(
			"Available Unblocked Frontier Tickets:",
		);
		expect(output.getOutput()).toContain("#101");
		expect(output.getOutput()).toContain("First Task");
		expect(output.getOutput()).toContain("#102");
		expect(output.getOutput()).toContain("bun run sandcastle --issue <number>");
	});

	it("selects first item when Enter is pressed immediately", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
		expect(input.rawModeEnabled).toBe(false);
		expect(output.getOutput()).toContain("\x1b[?25l");
		expect(output.getOutput()).toContain("\x1b[?25h");
	});

	it("selects item with 'enter' key name", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("enter");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
	});

	it("selects item with 'space' key name", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("space");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
	});

	it("navigates down and selects second item with Enter", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
			makeIssue(103, "Third Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("down");
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[1]);
	});

	it("navigates using up and down arrow keys with all boundary cases", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
			makeIssue(103, "Third Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		// From 0, up goes up -> wraps to 2 (Third Task)
		input.sendKey("up");
		// From 2, up goes up -> 1 (Second Task)
		input.sendKey("up");
		// From 1, down goes down -> 2 (Third Task)
		input.sendKey("down");
		// From 2, down goes down -> wraps to 0 (First Task)
		input.sendKey("down");
		// From 0, down goes down -> 1 (Second Task)
		input.sendKey("down");
		// From 1, up goes up -> 0 (First Task)
		input.sendKey("up");
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
	});

	it("navigates using vim keys j and k with all boundary cases", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
			makeIssue(103, "Third Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		// From 0, k goes up -> wraps to 2 (Third Task)
		input.sendKey("k");
		// From 2, k goes up -> 1 (Second Task)
		input.sendKey("k");
		// From 1, j goes down -> 2 (Third Task)
		input.sendKey("j");
		// From 2, j goes down -> wraps to 0 (First Task)
		input.sendKey("j");
		// From 0, j goes down -> 1 (Second Task)
		input.sendKey("j");
		// From 1, k goes up -> 0 (First Task)
		input.sendKey("k");
		input.sendKey("space");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
	});

	it("works when input has no setRawMode method", async () => {
		// Arrange
		const input = new MockInputStreamNoRawMode();
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
	});

	it("jumps directly to item using numeric keys 1-9", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
			makeIssue(103, "Third Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("3", false, "3");
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[2]);
	});

	it("ignores out-of-range numeric keypresses and non-numeric keys", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("9", false, "9"); // out of range (length is 2)
		input.sendKey("0", false, "0"); // invalid 0
		input.sendKey("x", false, "x"); // non-numeric letter
		input.sendKey(undefined, false, undefined); // undefined key name
		input.sendKey("return");
		const selected = await pickPromise;

		// Assert
		expect(selected).toEqual(issues[0]);
	});

	it("cancels and returns null when 'q' is pressed", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("q");
		const result = await pickPromise;

		// Assert
		expect(result).toBeNull();
		expect(input.rawModeEnabled).toBe(false);
	});

	it("cancels and returns null when Escape is pressed", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("escape");
		const result = await pickPromise;

		// Assert
		expect(result).toBeNull();
	});

	it("cancels and returns null when Ctrl+C is pressed", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.sendKey("c", true);
		const result = await pickPromise;

		// Assert
		expect(result).toBeNull();
	});

	it("rejects and cleans up when initialization fails", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		output.shouldThrow = true;
		const issues = [makeIssue(101, "First Task")];

		// Act & Assert
		await expect(
			renderInteractivePicker(issues, { input, output }),
		).rejects.toThrow("Simulated output write failure");
		expect(input.rawModeEnabled).toBe(false);
	});

	it("rejects and cleans up when error occurs during keypress render", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [
			makeIssue(101, "First Task"),
			makeIssue(102, "Second Task"),
		];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		output.shouldThrow = true;
		input.sendKey("down");

		// Assert
		await expect(pickPromise).rejects.toThrow("Simulated output write failure");
		expect(input.rawModeEnabled).toBe(false);
	});

	it("swallows cleanup write errors when output.write throws on cleanup", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		output.shouldThrow = true;
		input.sendKey("q");
		const result = await pickPromise;

		// Assert
		expect(result).toBeNull();
	});

	it("swallows setRawMode errors when setRawMode throws on cleanup", async () => {
		// Arrange
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const issues = [makeIssue(101, "First Task")];

		// Act
		const pickPromise = renderInteractivePicker(issues, { input, output });
		input.shouldThrowOnSetRawMode = true;
		input.sendKey("q");
		const result = await pickPromise;

		// Assert
		expect(result).toBeNull();
	});
});
