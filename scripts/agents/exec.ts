/**
 * The shell-command seam `git.ts` and `implement.ts` run every subprocess
 * through — modelled directly on `stream.ts`'s `spawn` seam (an injected
 * function standing in for a real subprocess), so branch creation, commit
 * counting, pushing, and `bun run validate` are all testable without a real
 * git repository, network access, or a real Bun runtime.
 */

export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export type ExecFn = (command: string, args: string[]) => Promise<ExecResult>;

export const defaultExec: ExecFn = async (command, args) => {
	const child = Bun.spawn([command, ...args], {
		stderr: "pipe",
		stdout: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { exitCode, stderr, stdout };
};
