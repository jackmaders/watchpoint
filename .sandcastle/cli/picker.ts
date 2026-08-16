import * as readline from "node:readline";
import type { CandidateIssue } from "../github/types";
import type {
	PickerOptions,
	PickerStreamInput,
	PickerStreamOutput,
	StreamKey,
} from "./types";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_SCREEN_DOWN = "\x1b[0J";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[90m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";

export function formatAge(createdAt?: string, now = Date.now()): string {
	if (!createdAt) {
		return "recently";
	}
	const timestamp = new Date(createdAt).getTime();
	if (Number.isNaN(timestamp)) {
		return "recently";
	}
	const diffMs = Math.max(0, now - timestamp);
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 60) {
		return "just now";
	}
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) {
		return `${diffMin}m ago`;
	}
	const diffHour = Math.floor(diffMin / 60);
	if (diffHour < 24) {
		return `${diffHour}h ago`;
	}
	const diffDay = Math.floor(diffHour / 24);
	if (diffDay < 30) {
		return `${diffDay}d ago`;
	}
	const diffMonth = Math.floor(diffDay / 30);
	if (diffMonth < 12) {
		return `${diffMonth}mo ago`;
	}
	const diffYear = Math.floor(diffDay / 365);
	return `${diffYear}y ago`;
}

export function formatHeader(): string {
	return `${BOLD}${CYAN}🎯 Sandcastle Frontier Picker${RESET}\n${DIM}Use ↑/↓ or j/k to navigate, 1-9 to jump, Enter/Space to select, q/Esc to exit:${RESET}\n`;
}

export function formatIssueRow(
	issue: CandidateIssue,
	index: number,
	isSelected: boolean,
	now: number,
): string {
	const numKey = index < 9 ? `[${index + 1}]` : "   ";
	const age = formatAge(issue.createdAt, now);
	if (isSelected) {
		return ` ${GREEN}❯${RESET} ${CYAN}${BOLD}${numKey} #${issue.number}${RESET}  ${BOLD}${issue.title}${RESET} ${DIM}(${age})${RESET}`;
	}
	return `   ${DIM}${numKey}${RESET} #${issue.number}  ${issue.title} ${DIM}(${age})${RESET}`;
}

export function renderNonInteractive(
	issues: readonly CandidateIssue[],
	output: PickerStreamOutput,
	now = Date.now(),
): void {
	output.write("Available Unblocked Frontier Tickets:\n\n");
	for (let i = 0; i < issues.length; i++) {
		const issue = issues[i];
		const age = formatAge(issue.createdAt, now);
		output.write(`  [${i + 1}] #${issue.number} - ${issue.title} (${age})\n`);
	}
	output.write(
		"\nInteractive picker is not supported in non-interactive environments.\nRun 'bun run sandcastle --issue <number>' to execute a specific ticket.\n",
	);
}

function parseNumericKey(key: StreamKey, totalItems: number): number | null {
	const numeric = Number.parseInt(key.name || "", 10);
	if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 9) {
		const targetIndex = numeric - 1;
		if (targetIndex < totalItems) {
			return targetIndex;
		}
	}
	return null;
}

type KeyAction =
	| { type: "exit" }
	| { type: "confirm" }
	| { type: "up" }
	| { type: "down" }
	| { type: "jump"; index: number }
	| { type: "none" };

function resolveKeyAction(key: StreamKey, totalItems: number): KeyAction {
	if (
		(Boolean(key.ctrl) && key.name === "c") ||
		key.name === "escape" ||
		key.name === "q"
	) {
		return { type: "exit" };
	}
	if (key.name === "return" || key.name === "enter" || key.name === "space") {
		return { type: "confirm" };
	}
	if (key.name === "up" || key.name === "k") {
		return { type: "up" };
	}
	if (key.name === "down" || key.name === "j") {
		return { type: "down" };
	}
	const targetIndex = parseNumericKey(key, totalItems);
	if (targetIndex !== null) {
		return { index: targetIndex, type: "jump" };
	}
	return { type: "none" };
}

function computeNextIndex(
	currentIndex: number,
	totalItems: number,
	action: KeyAction,
): number {
	switch (action.type) {
		case "up":
			return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
		case "down":
			return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
		case "jump":
			return action.index;
		default:
			return currentIndex;
	}
}

function buildMenuFrame(
	issues: readonly CandidateIssue[],
	selectedIndex: number,
	now: number,
): string[] {
	const lines: string[] = [formatHeader()];
	for (let i = 0; i < issues.length; i++) {
		lines.push(formatIssueRow(issues[i], i, i === selectedIndex, now));
	}
	lines.push(
		`\n${DIM}Selected issue: #${issues[selectedIndex].number}${RESET}`,
	);
	return lines;
}

function performCleanup(
	input: PickerStreamInput,
	output: PickerStreamOutput,
	listener: (str: string, key: StreamKey) => void,
): void {
	try {
		output.write(SHOW_CURSOR);
	} catch {
		// Ignore write errors during cleanup
	}
	try {
		if (input.setRawMode) {
			input.setRawMode(false);
		}
	} catch {
		// Ignore raw mode errors during cleanup
	}
	input.removeListener("keypress", listener as (...args: unknown[]) => void);
}

interface KeyHandlerContext {
	readonly issues: readonly CandidateIssue[];
	readonly cleanup: () => void;
	readonly resolve: (value: CandidateIssue | null) => void;
	readonly render: () => void;
	getSelectedIndex: () => number;
	setSelectedIndex: (idx: number) => void;
}

function handleKeyAction(action: KeyAction, ctx: KeyHandlerContext): void {
	if (action.type === "exit") {
		ctx.cleanup();
		ctx.resolve(null);
		return;
	}
	if (action.type === "confirm") {
		ctx.cleanup();
		ctx.resolve(ctx.issues[ctx.getSelectedIndex()]);
		return;
	}
	const nextIndex = computeNextIndex(
		ctx.getSelectedIndex(),
		ctx.issues.length,
		action,
	);
	if (nextIndex !== ctx.getSelectedIndex()) {
		ctx.setSelectedIndex(nextIndex);
		ctx.render();
	}
}

export async function renderInteractivePicker(
	issues: readonly CandidateIssue[],
	options: PickerOptions = {},
): Promise<CandidateIssue | null> {
	const input =
		options.input ?? (process.stdin as unknown as PickerStreamInput);
	const output =
		options.output ?? (process.stdout as unknown as PickerStreamOutput);
	const now = options.now ? options.now() : Date.now();

	if (issues.length === 0) {
		output.write("No unblocked ready-for-agent tickets found in queue.\n");
		return null;
	}

	if (!input.isTTY) {
		renderNonInteractive(issues, output, now);
		return null;
	}

	let selectedIndex = 0;
	let lastRenderedLineCount = 0;

	const render = () => {
		const lines = buildMenuFrame(issues, selectedIndex, now);
		if (lastRenderedLineCount > 0) {
			output.write(`\x1b[${lastRenderedLineCount}A\r${CLEAR_SCREEN_DOWN}`);
		}
		output.write(`${lines.join("\n")}\n`);
		lastRenderedLineCount = lines.length;
	};

	return new Promise<CandidateIssue | null>((resolve, reject) => {
		const cleanup = () => performCleanup(input, output, onKeypress);

		const handlerContext: KeyHandlerContext = {
			cleanup,
			getSelectedIndex: () => selectedIndex,
			issues,
			render,
			resolve,
			setSelectedIndex: (idx) => {
				selectedIndex = idx;
			},
		};

		const onKeypress = (_str: string, key: StreamKey = {}) => {
			try {
				const action = resolveKeyAction(key, issues.length);
				handleKeyAction(action, handlerContext);
			} catch (err) {
				cleanup();
				reject(err);
			}
		};

		try {
			readline.emitKeypressEvents(input as unknown as NodeJS.ReadableStream);
			if (input.setRawMode) {
				input.setRawMode(true);
			}
			output.write(HIDE_CURSOR);
			input.on("keypress", onKeypress as (...args: unknown[]) => void);
			render();
		} catch (err) {
			cleanup();
			reject(err);
		}
	});
}
