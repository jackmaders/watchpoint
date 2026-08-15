import path from "node:path";
import { defaultBunSpawnRunner } from "../github/client";
import type { ProcessRunner } from "../github/types";
import { WorktreeCleanupError, WorktreeCreationError } from "./errors";
import type {
	CreateWorktreeOptions,
	WorktreeInfo,
	WorktreeManager,
	WorktreeManagerOptions,
} from "./types";

export function slugifyBranch(branch: string): string {
	return branch.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
}

export class DefaultWorktreeManager implements WorktreeManager {
	private readonly baseDir: string;
	private readonly cwd: string;
	private readonly runner: ProcessRunner;
	private readonly activeWorktrees = new Map<string, WorktreeInfo>();

	constructor(options: WorktreeManagerOptions = {}) {
		this.cwd = options.cwd ?? process.cwd();
		this.baseDir = options.baseDir ?? ".sandcastle/worktrees";
		this.runner = options.runner ?? defaultBunSpawnRunner;
	}

	private resolveWorktreePath(branchOrPath: string): string {
		if (path.isAbsolute(branchOrPath)) {
			return branchOrPath;
		}
		for (const [p, info] of this.activeWorktrees.entries()) {
			if (info.branch === branchOrPath) {
				return p;
			}
		}
		const slug = slugifyBranch(branchOrPath);
		return path.resolve(this.cwd, this.baseDir, slug);
	}

	private async fetchBaseBranch(
		baseBranch: string,
		branch: string,
		worktreePath: string,
	): Promise<void> {
		const fetchRef = baseBranch.startsWith("origin/")
			? baseBranch.slice("origin/".length)
			: baseBranch;
		const fetchRes = await this.runner(["git", "fetch", "origin", fetchRef], {
			cwd: this.cwd,
		});
		if (fetchRes.exitCode !== 0) {
			const errorMsg = fetchRes.stderr || fetchRes.stdout;
			throw new WorktreeCreationError(
				branch,
				worktreePath,
				`git fetch origin ${fetchRef} failed: ${errorMsg}`,
			);
		}
	}

	private async removeExistingWorktreePath(
		worktreePath: string,
	): Promise<void> {
		await this.runner(["git", "worktree", "remove", "--force", worktreePath], {
			cwd: this.cwd,
		});
		await this.runner(["git", "worktree", "prune"], { cwd: this.cwd });
	}

	private async addGitWorktree(
		branch: string,
		worktreePath: string,
		baseBranch: string,
	): Promise<void> {
		const addRes = await this.runner(
			["git", "worktree", "add", "-B", branch, worktreePath, baseBranch],
			{ cwd: this.cwd },
		);
		if (addRes.exitCode !== 0) {
			const errorMsg = addRes.stderr || addRes.stdout;
			throw new WorktreeCreationError(
				branch,
				worktreePath,
				`git worktree add failed: ${errorMsg}`,
			);
		}
	}

	private async installWorktreeDeps(
		worktreePath: string,
		branch: string,
	): Promise<void> {
		const installRes = await this.runner(
			["bun", "install", "--frozen-lockfile"],
			{ cwd: worktreePath },
		);
		if (installRes.exitCode !== 0) {
			await this.removeExistingWorktreePath(worktreePath);
			const errorMsg = installRes.stderr || installRes.stdout;
			throw new WorktreeCreationError(
				branch,
				worktreePath,
				`bun install --frozen-lockfile failed: ${errorMsg}`,
			);
		}
	}

	async createWorktree(options: CreateWorktreeOptions): Promise<WorktreeInfo> {
		const baseBranch = options.baseBranch ?? "origin/main";
		const runInstall = options.runInstall ?? true;
		const worktreePath = this.resolveWorktreePath(options.branch);

		await this.fetchBaseBranch(baseBranch, options.branch, worktreePath);
		await this.removeExistingWorktreePath(worktreePath);
		await this.addGitWorktree(options.branch, worktreePath, baseBranch);

		if (runInstall) {
			await this.installWorktreeDeps(worktreePath, options.branch);
		}

		const info: WorktreeInfo = {
			baseBranch,
			branch: options.branch,
			createdAt: new Date().toISOString(),
			path: worktreePath,
		};
		this.activeWorktrees.set(worktreePath, info);
		return info;
	}

	async removeWorktree(branchOrPath: string): Promise<void> {
		const worktreePath = this.resolveWorktreePath(branchOrPath);
		const removeRes = await this.runner(
			["git", "worktree", "remove", "--force", worktreePath],
			{ cwd: this.cwd },
		);

		if (
			removeRes.exitCode !== 0 &&
			!removeRes.stderr.includes("is not a working tree") &&
			!removeRes.stderr.includes("No such file or directory")
		) {
			throw new WorktreeCleanupError(
				worktreePath,
				`git worktree remove failed: ${removeRes.stderr || removeRes.stdout}`,
			);
		}

		await this.pruneWorktrees();
		this.activeWorktrees.delete(worktreePath);
	}

	async pruneWorktrees(): Promise<void> {
		const pruneRes = await this.runner(["git", "worktree", "prune"], {
			cwd: this.cwd,
		});
		if (pruneRes.exitCode !== 0) {
			throw new WorktreeCleanupError(
				path.resolve(this.cwd, this.baseDir),
				`git worktree prune failed: ${pruneRes.stderr || pruneRes.stdout}`,
			);
		}
	}

	private parsePorcelainBlock(block: string): WorktreeInfo | null {
		const lines = block.split("\n");
		let worktreePath = "";
		let branch = "";

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				worktreePath = line.slice("worktree ".length).trim();
			} else if (line.startsWith("branch refs/heads/")) {
				branch = line.slice("branch refs/heads/".length).trim();
			}
		}

		if (!worktreePath) {
			return null;
		}

		const active = this.activeWorktrees.get(worktreePath);
		return {
			baseBranch: active?.baseBranch ?? "origin/main",
			branch: branch || active?.branch || path.basename(worktreePath),
			createdAt: active?.createdAt ?? new Date().toISOString(),
			path: worktreePath,
		};
	}

	async listWorktrees(): Promise<WorktreeInfo[]> {
		const res = await this.runner(["git", "worktree", "list", "--porcelain"], {
			cwd: this.cwd,
		});
		if (res.exitCode !== 0) {
			return Array.from(this.activeWorktrees.values());
		}

		if (!res.stdout.trim()) {
			return [];
		}

		const blocks = res.stdout.trim().split(/\n\n+/);
		return blocks
			.map((b) => this.parsePorcelainBlock(b))
			.filter((info): info is WorktreeInfo => info !== null);
	}

	async cleanup(): Promise<void> {
		const worktreesToClean = Array.from(this.activeWorktrees.keys());
		for (const wtPath of worktreesToClean) {
			try {
				await this.removeWorktree(wtPath);
			} catch {
				// Continue cleaning up others
			}
		}
		await this.pruneWorktrees();
	}
}

export class MockWorktreeManager implements WorktreeManager {
	private readonly worktrees = new Map<string, WorktreeInfo>();
	private simulatedFetchFailure?: string;
	private simulatedCreateFailure?: string;
	private simulatedInstallFailure?: string;
	private simulatedCleanupFailure?: string;

	simulateFetchFailure(error: string): void {
		this.simulatedFetchFailure = error;
	}

	simulateCreateFailure(error: string): void {
		this.simulatedCreateFailure = error;
	}

	simulateInstallFailure(error: string): void {
		this.simulatedInstallFailure = error;
	}

	simulateCleanupFailure(error: string): void {
		this.simulatedCleanupFailure = error;
	}

	async createWorktree(options: CreateWorktreeOptions): Promise<WorktreeInfo> {
		const baseBranch = options.baseBranch ?? "origin/main";
		const slug = slugifyBranch(options.branch);
		const worktreePath = path.resolve(".sandcastle/worktrees", slug);

		if (this.simulatedFetchFailure) {
			throw new WorktreeCreationError(
				options.branch,
				worktreePath,
				this.simulatedFetchFailure,
			);
		}

		if (this.simulatedCreateFailure) {
			throw new WorktreeCreationError(
				options.branch,
				worktreePath,
				this.simulatedCreateFailure,
			);
		}

		if (this.simulatedInstallFailure) {
			throw new WorktreeCreationError(
				options.branch,
				worktreePath,
				this.simulatedInstallFailure,
			);
		}

		const info: WorktreeInfo = {
			baseBranch,
			branch: options.branch,
			createdAt: new Date().toISOString(),
			path: worktreePath,
		};
		this.worktrees.set(worktreePath, info);
		return info;
	}

	async removeWorktree(branchOrPath: string): Promise<void> {
		if (this.simulatedCleanupFailure) {
			throw new WorktreeCleanupError(
				branchOrPath,
				this.simulatedCleanupFailure,
			);
		}

		for (const [p, info] of this.worktrees.entries()) {
			if (p === branchOrPath) {
				this.worktrees.delete(p);
				return;
			}
			if (info.branch === branchOrPath) {
				this.worktrees.delete(p);
				return;
			}
		}
		this.worktrees.delete(branchOrPath);
	}

	async pruneWorktrees(): Promise<void> {
		if (this.simulatedCleanupFailure) {
			throw new WorktreeCleanupError(
				".sandcastle/worktrees",
				this.simulatedCleanupFailure,
			);
		}
	}

	async listWorktrees(): Promise<WorktreeInfo[]> {
		return Array.from(this.worktrees.values());
	}

	async cleanup(): Promise<void> {
		if (this.simulatedCleanupFailure) {
			throw new WorktreeCleanupError(
				".sandcastle/worktrees",
				this.simulatedCleanupFailure,
			);
		}
		this.worktrees.clear();
	}
}
