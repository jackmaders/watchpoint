import {
	type AgentCommandOptions,
	type AgentProvider,
	claudeCode,
	codex,
	type PrintCommand,
} from "@ai-hero/sandcastle";
import { OPENROUTER_DEFAULT_MODEL } from "./codex-config";
import type { AgentType } from "./types";

type ParsedStreamEvent = ReturnType<AgentProvider["parseStreamLine"]>[number];

function escapeShellArg(arg: string): string {
	return `"${arg.replace(/(["\\$`])/g, "\\$1")}"`;
}

function parseJsonEvent(jsonStr: string): ParsedStreamEvent[] | undefined {
	try {
		const parsed = JSON.parse(jsonStr);
		if (parsed.type === "tool_call") {
			return [
				{
					args: parsed.args ?? "",
					name: parsed.name ?? "unknown",
					type: "tool_call",
				},
			];
		}
		if (parsed.result !== undefined) {
			return [
				{
					result: String(parsed.result),
					type: "result",
				},
			];
		}
	} catch {
		// Ignore invalid JSON syntax
	}
	return undefined;
}

export function antigravityAgent(model?: string): AgentProvider {
	return {
		buildInteractiveArgs(options: AgentCommandOptions): string[] {
			const args = ["-p", options.prompt];
			if (model) {
				args.push("--model", model);
			}
			if (options.dangerouslySkipPermissions) {
				args.push("--dangerously-skip-permissions");
			}
			return args;
		},
		buildPrintCommand(options: AgentCommandOptions): PrintCommand {
			const flags: string[] = [];
			if (model) {
				flags.push(`--model ${model}`);
			}
			if (options.dangerouslySkipPermissions) {
				flags.push("--dangerously-skip-permissions");
			}
			const flagStr = flags.length > 0 ? ` ${flags.join(" ")}` : "";
			return {
				command: `agy -p ${escapeShellArg(options.prompt)}${flagStr}`,
			};
		},
		captureSessions: false,
		env: {
			AGY_NON_INTERACTIVE: "1",
		},
		name: "antigravity",
		parseStreamLine(line: string): ParsedStreamEvent[] {
			const trimmed = line.trim();
			if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
				const events = parseJsonEvent(trimmed);
				if (events) {
					return events;
				}
			}
			return [{ text: line, type: "text" }];
		},
	};
}

export function geminiAgent(model?: string): AgentProvider {
	return {
		buildInteractiveArgs(options: AgentCommandOptions): string[] {
			const args = ["-p", options.prompt];
			if (model) {
				args.push("--model", model);
			}
			return args;
		},
		buildPrintCommand(options: AgentCommandOptions): PrintCommand {
			const modelFlag = model ? ` --model ${model}` : "";
			return {
				command: `gemini -p ${escapeShellArg(options.prompt)}${modelFlag}`,
			};
		},
		captureSessions: false,
		env: {},
		name: "gemini",
		parseStreamLine(line: string): ParsedStreamEvent[] {
			return [{ text: line, type: "text" }];
		},
	};
}

export function createAgentProvider(
	type: AgentType,
	model?: string,
): AgentProvider {
	switch (type) {
		case "agy":
			return antigravityAgent(model);
		case "gemini":
			return geminiAgent(model);
		case "codex":
			return codex(model || OPENROUTER_DEFAULT_MODEL);
		case "claude":
			return claudeCode(model || "claude-sonnet-4-6");
	}
}
