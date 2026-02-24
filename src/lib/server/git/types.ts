export interface GitWorktree {
	path: string;
	branch: string | null; // null = detached HEAD
	isMain: boolean;
}

export interface GitBranch {
	name: string;
	current: boolean;
	hash: string;
	message: string;
	author: string;
	date: string;
	ahead?: number;
	behind?: number;
	tracking?: string;
	lockedByWorktree?: string; // absolute path of worktree that has this branch checked out
}

export interface BranchMetadata {
	starred: boolean;
	description?: string;
	lastCheckedOut?: string;
	checkoutCount: number;
}

export interface BranchWithMetadata extends GitBranch, BranchMetadata {}

export interface GitCommandResult {
	success: boolean;
	output: string;
	error?: string;
}

export interface BranchDeleteOptions {
	force?: boolean;
	remote?: boolean;
}

export interface RefBadge {
	name: string;
	type: 'branch' | 'remote' | 'tag' | 'head' | 'worktree';
	/** true when a matching origin/ remote ref exists */
	synced?: boolean;
}

export interface RecentCommit {
	hash: string;
	message: string;
	relativeDate: string;
	absoluteDate: string;
	refs: RefBadge[];
	isFork?: boolean;
	behindCount?: number; // commits on target branch since this fork point
}
