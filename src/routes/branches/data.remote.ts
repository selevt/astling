import { query, command, form } from '$app/server';
import * as v from 'valibot';
import { gitService } from '$lib/server/git/commands';
import { metadataService } from '$lib/server/storage/metadata';
import type { GitBranch, BranchWithMetadata, RecentCommit } from '$lib/server/git/types';

// Repo configuration helpers
export const getRepoPath = query(async () => {
    try {
        const path = gitService.getRepoPath();
        const valid = await gitService.validateRepoPath(path);
        return { path, valid };
    } catch (err) {
        console.error('Failed to get repo path:', err);
        throw new Error('Failed to get repo path');
    }
});

export const setRepoPath = command(
    v.pipe(v.string(), v.nonEmpty('Repository path is required')),
    async (path) => {
        try {
            const valid = await gitService.validateRepoPath(path);
            if (!valid) {
                throw new Error('Path is not a git repository');
            }

            // Update both services
            gitService.setRepoPath(path);
            metadataService.setRepoPath(path);

            // Ensure metadata exists and sync branches
            const rawBranches = await gitService.getAllBranches();
            await metadataService.mergeWithGitBranches(rawBranches.map(b => b.name));

            // Refresh dependent queries
            await getBranches().refresh();
            await getStats().refresh();

            return { success: true, path };
        } catch (error) {
            console.error('Failed to set repo path:', error);
            throw new Error(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

// Query to get all branches with their metadata
export const getBranches = query(async () => {
	// Validate configured repo before attempting git operations. If not valid, return
	// an empty branch list so the app can render and the UI control (repo info)
	// can surface the actual problem to the user.
	const repoPath = gitService.getRepoPath();
	const valid = await gitService.validateRepoPath(repoPath);
	if (!valid) {
		console.warn(`Configured repository is not valid: ${repoPath}`);
		return [];
	}

	try {
		const rawBranches = await gitService.getAllBranches();
		const branchNames = rawBranches.map((b) => b.name);

		// Merge metadata with git branches, then sync reflog checkout history
		await metadataService.mergeWithGitBranches(branchNames);
		const checkoutHistory = await gitService.getCheckoutHistory();
		await metadataService.syncReflogCheckouts(checkoutHistory);
		const metadata = await metadataService.getAll();

		const branches: BranchWithMetadata[] = rawBranches.map((branch) => ({
			...branch,
			...metadata[branch.name]
		}));

		return branches;
	} catch (error) {
		console.error('Failed to get branches:', error);
		throw new Error(`Failed to fetch branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Query to get recent branches based on checkout date
export const getRecentBranches = query(v.optional(v.number(), 10), async (limit = 10) => {
	try {
		const branches = await getBranches();
		return branches
			.filter(b => b.lastCheckedOut)
			.sort((a, b) => {
				const dateA = new Date(a.lastCheckedOut!).getTime();
				const dateB = new Date(b.lastCheckedOut!).getTime();
				return dateB - dateA;
			})
			.slice(0, limit);
	} catch (error) {
		console.error('Failed to get recent branches:', error);
		throw new Error(`Failed to fetch recent branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Query to get only starred branches
export const getStarredBranches = query(async () => {
	try {
		const branches = await getBranches();
		return branches.filter(b => b.starred);
	} catch (error) {
		console.error('Failed to get starred branches:', error);
		throw new Error(`Failed to fetch starred branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Query to get a specific branch by name
export const getBranch = query(v.string(), async (branchName) => {
	try {
		const branches = await getBranches();
		const branch = branches.find(b => b.name === branchName);
		
		if (!branch) {
			throw new Error(`Branch '${branchName}' not found`);
		}
		
		return branch;
	} catch (error) {
		console.error(`Failed to get branch '${branchName}':`, error);
		throw new Error(`Failed to fetch branch '${branchName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Query to get current branch
export const getCurrentBranch = query(async () => {
	try {
		const currentBranchName = await gitService.getCurrentBranch();
		if (!currentBranchName) {
			throw new Error('No current branch found');
		}
		
		return await getBranch(currentBranchName);
	} catch (error) {
		console.error('Failed to get current branch:', error);
		throw new Error(`Failed to fetch current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Command to checkout a branch (updates recent tracking)
export const checkoutBranch = command(v.string(), async (branchName) => {
	try {
		await gitService.checkoutBranch(branchName);
		await metadataService.updateCheckoutDate(branchName);

		// Refresh queries that depend on current branch state
		await getBranches().refresh();
		await getStarredBranches().refresh();
		await getStats().refresh();
		await getRecentCommits().refresh();

		return { success: true, branch: branchName };
	} catch (error) {
		console.error(`Failed to checkout branch '${branchName}':`, error);
		throw new Error(`Failed to checkout branch '${branchName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Command to create a new branch
export const createBranch = command(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty('Branch name is required')),
		startPoint: v.optional(v.string(), 'HEAD')
	}),
	async ({ name, startPoint }) => {
		try {
			await gitService.createBranch(name, startPoint);
			await metadataService.updateCheckoutDate(name);
			
			// Refresh queries that depend on branch list
			await getBranches().refresh();
			await getStarredBranches().refresh();
			await getStats().refresh();
			await getRecentCommits().refresh();
			
			return { success: true, branch: name };
		} catch (error) {
			console.error(`Failed to create branch '${name}':`, error);
			throw new Error(`Failed to create branch '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
);

// Command to toggle branch star status
export const toggleStar = command(v.string(), async (branchName) => {
	try {
		const updated = await metadataService.toggleStar(branchName);
		
        // Refresh relevant queries
        // Only refresh the queries that depend on metadata changed. Caller components
        // can rely on optimistic updates, but keep server cache consistent.
        await getBranches().refresh();
        await getStarredBranches().refresh();
        await getBranch(branchName).refresh();
		
		return { success: true, starred: updated.starred };
	} catch (error) {
		console.error(`Failed to toggle star for branch '${branchName}':`, error);
		throw new Error(`Failed to toggle star for branch '${branchName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Command to update branch description
export const updateDescription = command(
	v.object({
		branch: v.pipe(v.string(), v.nonEmpty('Branch name is required')),
		description: v.string()
	}),
	async ({ branch, description }) => {
		try {
			await metadataService.updateDescription(branch, description);
			
            // Refresh relevant queries
            await getBranches().refresh();
            await getBranch(branch).refresh();
			
			return { success: true, branch, description };
		} catch (error) {
			console.error(`Failed to update description for branch '${branch}':`, error);
			throw new Error(`Failed to update description for branch '${branch}': ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
);

// Command to delete a branch
export const deleteBranch = command(
	v.object({
		branch: v.pipe(v.string(), v.nonEmpty('Branch name is required')),
		force: v.optional(v.boolean(), false),
		remote: v.optional(v.boolean(), false)
	}),
	async ({ branch, force, remote }) => {
		try {
			await gitService.deleteBranch(branch, { force, remote });
			await metadataService.delete(branch);
			
			// Refresh queries that depend on branch list
			await getBranches().refresh();
			await getStarredBranches().refresh();
			await getStats().refresh();
			await getRecentCommits().refresh();
			
			return { success: true, branch };
		} catch (error) {
			console.error(`Failed to delete branch '${branch}':`, error);
			throw new Error(`Failed to delete branch '${branch}': ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
);

// Query to get recent commits
export const getRecentCommits = query(async () => {
	try {
		return await gitService.getRecentCommits(3);
	} catch (error) {
		console.error('Failed to get recent commits:', error);
		return [];
	}
});

// Query to get metadata statistics
export const getStats = query(async () => {
	try {
		const stats = await metadataService.getStats();
		const branches = await getBranches();
		const currentBranch = branches.find(b => b.current);
		
		return {
			...stats,
			totalGitBranches: branches.length,
			currentBranch: currentBranch?.name || null
		};
	} catch (error) {
		console.error('Failed to get stats:', error);
		throw new Error(`Failed to fetch statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Command to pull changes for a branch
export const pullBranch = command(v.optional(v.string()), async (branchName) => {
	try {
		await gitService.pullBranch(branchName);
		
		return { success: true, branch: branchName || 'current' };
	} catch (error) {
		console.error(`Failed to pull branch '${branchName || 'current'}':`, error);
		throw new Error(`Failed to pull branch '${branchName || 'current'}': ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Command to push a branch
export const pushBranch = command(
	v.object({
		branch: v.pipe(v.string(), v.nonEmpty('Branch name is required')),
		setUpstream: v.optional(v.boolean(), false)
	}),
	async ({ branch, setUpstream }) => {
		try {
			await gitService.pushBranch(branch, setUpstream);
			
			return { success: true, branch, setUpstream };
		} catch (error) {
			console.error(`Failed to push branch '${branch}':`, error);
			throw new Error(`Failed to push branch '${branch}': ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
);
