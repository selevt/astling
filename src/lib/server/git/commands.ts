import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { access, constants, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import type { GitBranch, GitCommandResult, BranchDeleteOptions, RecentCommit } from './types';

const execFileAsync = promisify(execFile);

export class GitService {
	private repoPath: string;
	private targetBranch: string;

	constructor(repoPath?: string) {
		// Default to an explicit test subfolder to avoid operating on the app repo itself.
		// Allow overriding with the GIT_REPO_PATH environment variable or an explicit constructor arg.
		this.repoPath = repoPath ?? process.env.GIT_REPO_PATH ?? join(process.cwd(), 'test-repo');
		this.targetBranch = process.env.TARGET_BRANCH ?? 'main';
	}

	// Public method to validate an arbitrary path (useful for UI validation)
	async validateRepoPath(path: string): Promise<boolean> {
		try {
			await access(join(path, '.git'), constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	private async isGitRepo(): Promise<boolean> {
		try {
			await access(join(this.repoPath, '.git'), constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	getRepoPath(): string {
		return this.repoPath;
	}

	setRepoPath(path: string) {
		this.repoPath = path;
		console.log('GitService repoPath updated to', this.repoPath);
	}

	getTargetBranch(): string {
		return this.targetBranch;
	}

	setTargetBranch(branch: string) {
		this.targetBranch = branch;
		console.log('GitService targetBranch updated to', this.targetBranch);
	}

	private async execGitCommand(args: string[]): Promise<GitCommandResult> {
		if (!(await this.isGitRepo())) {
			return {
				success: false,
				output: '',
				error: 'Not a git repository'
			};
		}

		try {
			console.log('Executing git command:', 'git', args.join(' '));

			const { stdout, stderr } = await execFileAsync('git', args, {
				cwd: this.repoPath,
				timeout: 15000
			});

			const output = stdout.trim();
			const error = stderr.trim();

			console.log('Command success, output length:', output.length);
			console.log('Command stderr:', error);
			console.log('First 200 chars of output:', output.substring(0, 200));

			return {
				success: true,
				output,
				error: error || undefined
			};
		} catch (error: any) {
			console.error('Git command failed:', error);
			return {
				success: false,
				output: '',
				error: error.message || 'Unknown error'
			};
		}
	}

	/**
	 * Execute a pipeline of two git commands, piping stdout of the first into stdin of the second.
	 * Both commands run without a shell, avoiding injection risks.
	 */
	private async execGitPipeline(args1: string[], args2: string[]): Promise<GitCommandResult> {
		if (!(await this.isGitRepo())) {
			return { success: false, output: '', error: 'Not a git repository' };
		}

		return new Promise((resolve) => {
			const opts = { cwd: this.repoPath };

			const proc1 = spawn('git', args1, opts);
			const proc2 = spawn('git', args2, opts);

			proc1.stdout.pipe(proc2.stdin);

			let stdout = '';
			let stderr = '';

			proc2.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});
			proc2.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});
			proc1.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			proc1.on('error', (err) => {
				resolve({ success: false, output: '', error: err.message });
			});
			proc2.on('error', (err) => {
				resolve({ success: false, output: '', error: err.message });
			});

			proc2.on('close', (code) => {
				resolve({
					success: code === 0,
					output: stdout.trim(),
					error: stderr.trim() || undefined
				});
			});
		});
	}

	async getAllBranches(): Promise<GitBranch[]> {
		// Get all branches with detailed info
		const result = await this.execGitCommand([
			'branch',
			'-vv',
			'--format=%(refname:short)|%(objectname)|%(subject)|%(authorname)|%(committerdate:iso8601)|%(HEAD)'
		]);

		// If the configured path is not a git repository, return empty list instead of throwing
		if (!result.success) {
			if (result.error && result.error.includes('Not a git repository')) {
				return [];
			}
			throw new Error(`Failed to get branches: ${result.error}`);
		}

		const lines = result.output.split('\n').filter((line) => line.trim());
		const branches: GitBranch[] = [];

		for (const line of lines) {
			const parts = line.split('|');
			if (parts.length >= 5) {
				const [rawName, hash, message, author, date, headMarker] = parts;

				// Skip empty lines or malformed data
				if (!rawName || !hash) continue;

				// Check if this is the current branch
				const isCurrent = headMarker?.trim() === '*';

				// Extract clean branch name from rawName
				// Remove leading '* ' and any trailing tracking info
				const cleanName = rawName
					.replace(/^\* /, '') // Remove current branch marker
					.replace(/\[.*?\]$/, '') // Remove [tracking-info]
					.trim();

				// Parse tracking info if present
				let ahead: number | undefined;
				let behind: number | undefined;
				let tracking: string | undefined;

				const trackingMatch = rawName.match(/\[([^\]]+)\]/);
				if (trackingMatch) {
					tracking = trackingMatch[1];

					// Parse ahead/behind from tracking info
					const aheadMatch = tracking.match(/ahead (\d+)/);
					const behindMatch = tracking.match(/behind (\d+)/);
					if (aheadMatch) ahead = parseInt(aheadMatch[1]);
					if (behindMatch) behind = parseInt(behindMatch[1]);
				}

				if (cleanName) {
					branches.push({
						name: cleanName,
						current: isCurrent,
						hash,
						message: message || 'No commit message',
						author: author || 'Unknown',
						date: date || new Date().toISOString(),
						ahead,
						behind,
						tracking
					});
				}
			}
		}

		return branches.sort((a, b) => {
			// Current branch first
			if (a.current) return -1;
			if (b.current) return 1;
			// Then by name
			return a.name.localeCompare(b.name);
		});
	}

	async checkoutBranch(branchName: string): Promise<void> {
		const result = await this.execGitCommand(['checkout', branchName]);

		if (!result.success) {
			throw new Error(`Failed to checkout branch '${branchName}': ${result.error}`);
		}
	}

	async createBranch(branchName: string, startPoint: string = 'HEAD'): Promise<void> {
		const result = await this.execGitCommand(['checkout', '-b', branchName, startPoint]);

		if (!result.success) {
			throw new Error(`Failed to create branch '${branchName}': ${result.error}`);
		}
	}

	async renameBranch(oldName: string, newName: string): Promise<void> {
		const result = await this.execGitCommand(['branch', '-m', oldName, newName]);

		if (!result.success) {
			throw new Error(`Failed to rename branch '${oldName}' to '${newName}': ${result.error}`);
		}
	}

	async deleteBranch(branchName: string, options: BranchDeleteOptions = {}): Promise<void> {
		const flag = options.force ? '-D' : '-d';

		const result = await this.execGitCommand(['branch', flag, branchName]);

		if (!result.success) {
			throw new Error(`Failed to delete branch '${branchName}': ${result.error}`);
		}

		// Also delete remote branch if requested
		if (options.remote) {
			const remoteResult = await this.execGitCommand(['push', 'origin', '--delete', branchName]);
			if (!remoteResult.success) {
				console.warn(`Failed to delete remote branch '${branchName}': ${remoteResult.error}`);
			}
		}
	}

	async getCurrentBranch(): Promise<string | null> {
		const result = await this.execGitCommand(['branch', '--show-current']);

		if (!result.success) {
			throw new Error(`Failed to get current branch: ${result.error}`);
		}

		return result.output || null;
	}

	async pullBranch(branchName?: string): Promise<void> {
		const args = branchName ? ['pull', 'origin', branchName] : ['pull'];
		const result = await this.execGitCommand(args);

		if (!result.success) {
			throw new Error(
				`Failed to pull${branchName ? ` branch '${branchName}'` : ''}: ${result.error}`
			);
		}
	}

	async pushBranch(branchName: string, setUpstream: boolean = false): Promise<void> {
		const args = setUpstream
			? ['push', '-u', 'origin', branchName]
			: ['push', 'origin', branchName];
		const result = await this.execGitCommand(args);

		if (!result.success) {
			throw new Error(`Failed to push branch '${branchName}': ${result.error}`);
		}
	}

	private parseCommitLog(output: string): RecentCommit[] {
		return output
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				const [hash, message, relativeDate, refsRaw] = line.split('|');
				const refs: import('./types').RefBadge[] = [];
				if (refsRaw?.trim()) {
					const locals = new Set<string>();
					const remotes = new Set<string>();
					// First pass: collect local and remote names
					for (const part of refsRaw.split(',')) {
						const trimmed = part.trim();
						if (!trimmed) continue;
						if (trimmed.startsWith('HEAD ->') || trimmed === 'HEAD') continue;
						if (trimmed === 'origin/HEAD') continue;
						if (trimmed.startsWith('tag: ')) {
							refs.push({ name: trimmed.slice(5), type: 'tag' });
						} else if (trimmed.startsWith('origin/')) {
							remotes.add(trimmed.slice(7));
						} else {
							locals.add(trimmed);
						}
					}
					// Add local branches, marking synced if matching remote exists
					for (const name of locals) {
						refs.push({ name, type: 'branch', synced: remotes.has(name) });
						remotes.delete(name);
					}
					// Remaining remotes with no local match
					for (const name of remotes) {
						refs.push({ name: `origin/${name}`, type: 'remote' });
					}
				}
				return { hash: hash || '', message: message || '', relativeDate: relativeDate || '', refs };
			});
	}

	async getRecentCommits(n: number = 3): Promise<RecentCommit[]> {
		const result = await this.execGitCommand([
			'log',
			'--oneline',
			'-n',
			String(n),
			'--format=%h|%s|%ar|%D'
		]);
		if (!result.success) return [];
		return this.parseCommitLog(result.output);
	}

	async getCommitsAheadOf(targetBranch: string): Promise<RecentCommit[]> {
		const result = await this.execGitCommand([
			'log',
			`${targetBranch}..HEAD`,
			'--format=%h|%s|%ar|%D'
		]);
		if (!result.success || !result.output.trim()) return [];
		return this.parseCommitLog(result.output);
	}

	async getForkCommit(targetBranch: string): Promise<RecentCommit | null> {
		const mergeBaseResult = await this.execGitCommand(['merge-base', 'HEAD', targetBranch]);
		if (!mergeBaseResult.success || !mergeBaseResult.output.trim()) return null;
		const mergeBase = mergeBaseResult.output.trim();

		const result = await this.execGitCommand([
			'log',
			mergeBase,
			'-n',
			'1',
			'--format=%h|%s|%ar|%D'
		]);
		if (!result.success || !result.output.trim()) return null;
		const commits = this.parseCommitLog(result.output);
		const commit = commits[0];
		if (!commit) return null;
		return { ...commit, isFork: true };
	}

	/**
	 * Parse reflog for checkout events, returning branch names with their most recent
	 * checkout timestamp, ordered most-recent-first.
	 */
	async getCheckoutHistory(): Promise<Array<{ branch: string; date: string }>> {
		const result = await this.execGitCommand(['reflog', '--format=%gd|%gs', '--date=iso']);

		if (!result.success) return [];

		const checkouts: Array<{ branch: string; date: string }> = [];
		const seen = new Set<string>();

		for (const line of result.output.split('\n')) {
			if (!line.trim()) continue;
			const parts = line.split('|');
			if (parts.length < 2) continue;

			const [selector, action] = parts;
			// Match "checkout: moving from X to Y"
			const match = action?.match(/checkout: moving from .+ to (.+)/);
			if (!match) continue;

			// Extract the reflog entry date from the selector (e.g. "HEAD@{2026-02-15 16:46:39 +0100}")
			const dateMatch = selector?.match(/\{(.+)\}/);
			if (!dateMatch) continue;
			const date = dateMatch[1].trim();

			const branch = match[1].trim();
			if (seen.has(branch)) continue; // only keep most recent per branch
			seen.add(branch);
			checkouts.push({ branch, date });
		}

		return checkouts;
	}

	async getStaleBranches(): Promise<string[]> {
		const result = await this.execGitCommand(['remote', 'prune', 'origin', '--dry-run']);
		if (!result.success) return [];

		// Output lines look like: " * [would prune] origin/feature/auth"
		const stale: string[] = [];
		for (const line of (result.output + '\n' + (result.error || '')).split('\n')) {
			const match = line.match(/\[would prune\]\s+(.+)/);
			if (match) stale.push(match[1].trim());
		}
		return stale;
	}

	async pruneRemote(): Promise<string[]> {
		const result = await this.execGitCommand(['remote', 'prune', 'origin']);
		if (!result.success) {
			throw new Error(`Failed to prune remote: ${result.error}`);
		}

		const pruned: string[] = [];
		for (const line of (result.output + '\n' + (result.error || '')).split('\n')) {
			const match = line.match(/\[pruned\]\s+(.+)/);
			if (match) pruned.push(match[1].trim());
		}
		return pruned;
	}

	async getAutoPruneEnabled(): Promise<boolean> {
		const result = await this.execGitCommand(['config', '--get', 'remote.origin.prune']);
		return result.success && result.output.trim() === 'true';
	}

	async setAutoPrune(enabled: boolean): Promise<void> {
		const result = await this.execGitCommand([
			'config',
			'remote.origin.prune',
			enabled ? 'true' : 'false'
		]);
		if (!result.success) {
			throw new Error(`Failed to set auto-prune: ${result.error}`);
		}
	}

	async findMergedBranches(target: string): Promise<string[]> {
		const currentBranch = await this.getCurrentBranch();

		// Step 1: branches fully merged (fast-forward / real merge)
		const mergedResult = await this.execGitCommand(['branch', '--merged', target]);
		const triviallyMerged = new Set<string>();
		if (mergedResult.success) {
			for (const line of mergedResult.output.split('\n')) {
				const name = line.replace(/^\*?\s+/, '').trim();
				if (name && name !== target && name !== currentBranch) {
					triviallyMerged.add(name);
				}
			}
		}

		// Step 2: for remaining branches, detect squash merges via patch-id.
		const allResult = await this.execGitCommand(['branch', '--format=%(refname:short)']);
		if (!allResult.success) return [...triviallyMerged];

		const allBranches = allResult.output
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		const remaining = allBranches.filter(
			(b) => b !== target && b !== currentBranch && !triviallyMerged.has(b)
		);
		if (remaining.length === 0) return [...triviallyMerged];

		// Build a set of patch-ids for all commits on the target (from oldest merge-base)
		const targetPatchIds = new Set<string>();
		let earliestBase: string | null = null;

		for (const branch of remaining) {
			const baseResult = await this.execGitCommand(['merge-base', target, branch]);
			if (!baseResult.success || !baseResult.output.trim()) continue;
			const mb = baseResult.output.trim();
			if (!earliestBase) {
				earliestBase = mb;
			} else {
				// Pick the older (more ancestral) merge-base
				const isAncestor = await this.execGitCommand([
					'merge-base',
					'--is-ancestor',
					mb,
					earliestBase
				]);
				if (isAncestor.success) earliestBase = mb;
			}
		}

		if (earliestBase) {
			// Collect patch-ids for each commit on target since the earliest merge-base
			const logResult = await this.execGitCommand([
				'log',
				'--format=%H',
				`${earliestBase}..${target}`
			]);
			if (logResult.success) {
				for (const sha of logResult.output.split('\n').filter((l) => l.trim())) {
					const pidResult = await this.execGitPipeline(
						['diff', `${sha}^`, sha],
						['patch-id', '--stable']
					);
					if (pidResult.success && pidResult.output.trim()) {
						const pid = pidResult.output.trim().split(/\s+/)[0];
						if (pid) targetPatchIds.add(pid);
					}
				}
			}
		}

		const merged = [...triviallyMerged];

		for (const branch of remaining) {
			// Compute the branch's combined patch-id
			const baseResult = await this.execGitCommand(['merge-base', target, branch]);
			if (!baseResult.success || !baseResult.output.trim()) continue;
			const mergeBase = baseResult.output.trim();

			const pidResult = await this.execGitPipeline(
				['diff', mergeBase, branch],
				['patch-id', '--stable']
			);
			if (!pidResult.success || !pidResult.output.trim()) continue;

			const branchPid = pidResult.output.trim().split(/\s+/)[0];
			if (branchPid && targetPatchIds.has(branchPid)) {
				merged.push(branch);
			}
		}

		return merged;
	}

	async getCommitDiff(hash: string): Promise<string> {
		if (!/^[0-9a-f]+$/i.test(hash)) {
			throw new Error('Invalid commit hash');
		}

		const result = await this.execGitCommand(['show', '--stat', '--patch', hash]);

		if (!result.success) {
			throw new Error(`Failed to get commit diff: ${result.error}`);
		}

		return result.output;
	}

	async getRepositoryStatus(): Promise<any> {
		const result = await this.execGitCommand(['status', '--porcelain=2']);

		if (!result.success) {
			throw new Error(`Failed to get repository status: ${result.error}`);
		}

		return result.output;
	}

	async getBranchDiff(branchName: string): Promise<GitCommandResult> {
		if (!(await this.isGitRepo())) {
			return { success: false, output: '', error: 'Not a git repository' };
		}

		try {
			const args = ['diff', `${this.targetBranch}...${branchName}`];
			const { stdout, stderr } = await execFileAsync('git', args, {
				cwd: this.repoPath,
				timeout: 15000,
				maxBuffer: 50 * 1024 * 1024
			});
			// Preserve raw output — trimming corrupts patch format
			return { success: true, output: stdout, error: stderr.trim() || undefined };
		} catch (error: any) {
			return { success: false, output: '', error: error.message || 'Unknown error' };
		}
	}

	async applyPatch(patchContent: string): Promise<GitCommandResult> {
		const tempPath = join(tmpdir(), `astling-patch-${Date.now()}.patch`);
		try {
			await writeFile(tempPath, patchContent, 'utf-8');
			return await this.execGitCommand(['apply', tempPath]);
		} finally {
			await unlink(tempPath).catch(() => {});
		}
	}
}

// Singleton instance
export const gitService = new GitService();
