import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { access, constants } from 'fs/promises';
import type { GitBranch, GitCommandResult, BranchDeleteOptions, RecentCommit } from './types';

const execAsync = promisify(exec);

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

	private async execGitCommand(command: string): Promise<GitCommandResult> {
		if (!(await this.isGitRepo())) {
			return {
				success: false,
				output: '',
				error: 'Not a git repository'
			};
		}

		try {
			const fullCommand = `cd "${this.repoPath}" && git ${command}`;
			console.log('Executing git command:', fullCommand);
			
			const { stdout, stderr } = await execAsync(fullCommand, {
				timeout: 15000  // Increased timeout
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

	async getAllBranches(): Promise<GitBranch[]> {
		// Get all branches with detailed info
		const result = await this.execGitCommand('branch -vv --format="%(refname:short)|%(objectname)|%(subject)|%(authorname)|%(committerdate:iso8601)|%(HEAD)"');

		// If the configured path is not a git repository, return empty list instead of throwing
		if (!result.success) {
			if (result.error && result.error.includes('Not a git repository')) {
				return [];
			}
			throw new Error(`Failed to get branches: ${result.error}`);
		}

		const lines = result.output.split('\n').filter(line => line.trim());
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
					.replace(/^\* /, '')           // Remove current branch marker
					.replace(/\[.*?\]$/, '')       // Remove [tracking-info]
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
		const result = await this.execGitCommand(`checkout "${branchName}"`);
		
		if (!result.success) {
			throw new Error(`Failed to checkout branch '${branchName}': ${result.error}`);
		}
	}

	async createBranch(branchName: string, startPoint: string = 'HEAD'): Promise<void> {
		const result = await this.execGitCommand(`checkout -b "${branchName}" "${startPoint}"`);
		
		if (!result.success) {
			throw new Error(`Failed to create branch '${branchName}': ${result.error}`);
		}
	}

	async renameBranch(oldName: string, newName: string): Promise<void> {
		const result = await this.execGitCommand(`branch -m "${oldName}" "${newName}"`);

		if (!result.success) {
			throw new Error(`Failed to rename branch '${oldName}' to '${newName}': ${result.error}`);
		}
	}

	async deleteBranch(branchName: string, options: BranchDeleteOptions = {}): Promise<void> {
		let command = 'branch -d';
		if (options.force) {
			command = 'branch -D';
		}
		
		const result = await this.execGitCommand(`${command} "${branchName}"`);
		
		if (!result.success) {
			throw new Error(`Failed to delete branch '${branchName}': ${result.error}`);
		}

		// Also delete remote branch if requested
		if (options.remote) {
			const remoteResult = await this.execGitCommand(`push origin --delete "${branchName}"`);
			if (!remoteResult.success) {
				console.warn(`Failed to delete remote branch '${branchName}': ${remoteResult.error}`);
			}
		}
	}

	async getCurrentBranch(): Promise<string | null> {
		const result = await this.execGitCommand('branch --show-current');
		
		if (!result.success) {
			throw new Error(`Failed to get current branch: ${result.error}`);
		}

		return result.output || null;
	}

	async pullBranch(branchName?: string): Promise<void> {
		const command = branchName ? `pull origin "${branchName}"` : 'pull';
		const result = await this.execGitCommand(command);
		
		if (!result.success) {
			throw new Error(`Failed to pull${branchName ? ` branch '${branchName}'` : ''}: ${result.error}`);
		}
	}

	async pushBranch(branchName: string, setUpstream: boolean = false): Promise<void> {
		const command = setUpstream ? `push -u origin "${branchName}"` : `push origin "${branchName}"`;
		const result = await this.execGitCommand(command);
		
		if (!result.success) {
			throw new Error(`Failed to push branch '${branchName}': ${result.error}`);
		}
	}

	async getRecentCommits(n: number = 3): Promise<RecentCommit[]> {
		const result = await this.execGitCommand(`log --oneline -n ${n} --format="%h|%s|%ar"`);

		if (!result.success) {
			return [];
		}

		return result.output
			.split('\n')
			.filter(line => line.trim())
			.map(line => {
				const [hash, message, relativeDate] = line.split('|');
				return { hash: hash || '', message: message || '', relativeDate: relativeDate || '' };
			});
	}

	/**
	 * Parse reflog for checkout events, returning branch names with their most recent
	 * checkout timestamp, ordered most-recent-first.
	 */
	async getCheckoutHistory(): Promise<Array<{ branch: string; date: string }>> {
		const result = await this.execGitCommand(
			'reflog --format="%gd|%gs" --date=iso'
		);

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

	async getRepositoryStatus(): Promise<any> {
		const result = await this.execGitCommand('status --porcelain=2');
		
		if (!result.success) {
			throw new Error(`Failed to get repository status: ${result.error}`);
		}

		return result.output;
	}
}

// Singleton instance
export const gitService = new GitService();
