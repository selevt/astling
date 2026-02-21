import type { BranchWithMetadata } from '$lib/server/git/types';

export type DirectoryAction = never; // extend: | 'delete-all' | ...

export interface BranchLeafNode {
	kind: 'branch';
	path: string; // full git branch name
	branch: BranchWithMetadata;
}

export interface DirectoryNode {
	kind: 'dir';
	path: string; // prefix + trailing slash, e.g. "feature/"
	label: string; // just the segment, e.g. "feature"
	children: TreeNode[]; // dirs first, then leaves
	branchCount: number;
	hasCurrentBranch: boolean;
	availableActions: DirectoryAction[];
}

export type TreeNode = BranchLeafNode | DirectoryNode;

export interface BranchTree {
	roots: TreeNode[];
	totalBranches: number;
}
