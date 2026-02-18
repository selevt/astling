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
	type: 'branch' | 'remote' | 'tag' | 'head';
	/** true when a matching origin/ remote ref exists */
	synced?: boolean;
}

export interface RecentCommit {
	hash: string;
	message: string;
	relativeDate: string;
	refs: RefBadge[];
	isFork?: boolean;
}
