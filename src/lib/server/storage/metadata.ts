import { readFile, writeFile, access, constants } from 'fs/promises';
import { join, dirname } from 'path';
import type { BranchMetadata } from '../git/types';

export class MetadataService {
    private metadataPath: string;
    private cache: Map<string, BranchMetadata> | null = null;
    private lastRead: number = 0;
    private readonly CACHE_TTL = 5000; // 5 seconds

    constructor(repoPath?: string) {
        // Default metadata to a subfolder to avoid polluting the app repo. Allow override
        const base = repoPath ?? process.env.GIT_REPO_PATH ?? join(process.cwd(), 'test-repo');
        this.metadataPath = join(base, '.git', 'branches.json');
    }

    getMetadataPath(): string {
        return this.metadataPath;
    }

    setRepoPath(repoPath: string) {
        this.metadataPath = join(repoPath, '.git', 'branches.json');
    }

	private async ensureMetadataFile(): Promise<void> {
		try {
			await access(this.metadataPath, constants.F_OK);
		} catch {
			// Ensure parent directory exists, then create the file with an empty object
			const dir = dirname(this.metadataPath);
			try {
				await import('fs/promises').then(fs => fs.mkdir(dir, { recursive: true }));
			} catch (err) {
				// ignore mkdir errors, will surface on write if needed
			}
			await this.dumpMetadata({});
		}
	}

	private async dumpMetadata(metadata: Record<string, BranchMetadata>): Promise<void> {
		await writeFile(this.metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
	}

	private async readMetadata(): Promise<Record<string, BranchMetadata>> {
		// Check cache first
		const now = Date.now();
		if (this.cache && (now - this.lastRead) < this.CACHE_TTL) {
			const result: Record<string, BranchMetadata> = {};
			this.cache.forEach((value, key) => {
				result[key] = value;
			});
			return result;
		}

		try {
			await this.ensureMetadataFile();
			const data = await readFile(this.metadataPath, 'utf-8');
			const metadata = JSON.parse(data);
			
			// Update cache
			this.cache = new Map(Object.entries(metadata));
			this.lastRead = now;
			
			return metadata;
		} catch (error) {
			console.warn('Failed to read metadata file, starting with empty metadata:', error);
			return {};
		}
	}

	private async writeMetadata(metadata: Record<string, BranchMetadata>): Promise<void> {
		try {
			await this.ensureMetadataFile();
			await this.dumpMetadata(metadata);
			
			// Update cache
			this.cache = new Map(Object.entries(metadata));
			this.lastRead = Date.now();
		} catch (error) {
			throw new Error(`Failed to write metadata file: ${error}`);
		}
	}

	async getAll(): Promise<Record<string, BranchMetadata>> {
		return await this.readMetadata();
	}

	async get(branchName: string): Promise<BranchMetadata | null> {
		const metadata = await this.readMetadata();
		return metadata[branchName] || null;
	}

	async createOrUpdate(branchName: string, updates: Partial<BranchMetadata>): Promise<BranchMetadata> {
		const metadata = await this.readMetadata();
		
		const existing = metadata[branchName] || {
			starred: false,
			checkoutCount: 0
		};

		const updated: BranchMetadata = {
			...existing,
			...updates
		};

		metadata[branchName] = updated;
		await this.writeMetadata(metadata);

		return updated;
	}

	async updateCheckoutDate(branchName: string): Promise<BranchMetadata> {
		const existing = await this.get(branchName);
		
		return await this.createOrUpdate(branchName, {
			lastCheckedOut: new Date().toISOString(),
			checkoutCount: (existing?.checkoutCount || 0) + 1
		});
	}

	async toggleStar(branchName: string): Promise<BranchMetadata> {
		const existing = await this.get(branchName);
		const newStarState = !(existing?.starred || false);
		
		return await this.createOrUpdate(branchName, {
			starred: newStarState
		});
	}

	async updateDescription(branchName: string, description: string): Promise<BranchMetadata> {
		return await this.createOrUpdate(branchName, {
			description: description.trim() || undefined
		});
	}

	async rename(oldName: string, newName: string): Promise<void> {
		const metadata = await this.readMetadata();
		if (metadata[oldName]) {
			metadata[newName] = metadata[oldName];
			delete metadata[oldName];
			await this.writeMetadata(metadata);
		}
	}

	async delete(branchName: string): Promise<void> {
		const metadata = await this.readMetadata();
		delete metadata[branchName];
		await this.writeMetadata(metadata);
	}

	async clearCache(): Promise<void> {
		this.cache = null;
		this.lastRead = 0;
	}

	async getStats(): Promise<{
		totalBranches: number;
		starredBranches: number;
		withDescription: number;
		recentlyUsed: number; // Used in last 7 days
	}> {
		const metadata = await this.readMetadata();
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const stats = {
			totalBranches: Object.keys(metadata).length,
			starredBranches: 0,
			withDescription: 0,
			recentlyUsed: 0
		};

		for (const branch of Object.values(metadata)) {
			if (branch.starred) stats.starredBranches++;
			if (branch.description) stats.withDescription++;
			if (branch.lastCheckedOut && new Date(branch.lastCheckedOut) > sevenDaysAgo) {
				stats.recentlyUsed++;
			}
		}

		return stats;
	}

	/**
	 * Sync checkout history from git reflog into metadata. Only updates a branch's
	 * lastCheckedOut if the reflog date is newer than what we already have.
	 */
	async syncReflogCheckouts(checkouts: Array<{ branch: string; date: string }>): Promise<void> {
		if (checkouts.length === 0) return;

		const metadata = await this.readMetadata();
		let hasChanges = false;

		for (const { branch, date } of checkouts) {
			const existing = metadata[branch];
			if (!existing) continue; // only update known branches

			const reflogTime = new Date(date).getTime();
			const existingTime = existing.lastCheckedOut
				? new Date(existing.lastCheckedOut).getTime()
				: 0;

			if (reflogTime > existingTime) {
				existing.lastCheckedOut = new Date(date).toISOString();
				existing.checkoutCount = (existing.checkoutCount || 0) + 1;
				hasChanges = true;
			}
		}

		if (hasChanges) {
			await this.writeMetadata(metadata);
		}
	}

	async mergeWithGitBranches(gitBranches: string[]): Promise<void> {
		const metadata = await this.readMetadata();
		let hasChanges = false;

		// Add entries for branches that don't exist in metadata
		for (const branchName of gitBranches) {
			if (!metadata[branchName]) {
				metadata[branchName] = {
					starred: false,
					checkoutCount: 0
				};
				hasChanges = true;
			}
		}

		// Remove entries for branches that no longer exist in git
		const gitBranchSet = new Set(gitBranches);
		for (const metadataBranchName of Object.keys(metadata)) {
			if (!gitBranchSet.has(metadataBranchName)) {
				delete metadata[metadataBranchName];
				hasChanges = true;
			}
		}

		if (hasChanges) {
			await this.writeMetadata(metadata);
		}
	}
}

// Singleton instance
export const metadataService = new MetadataService();
