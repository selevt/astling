import type { BranchWithMetadata } from '$lib/server/git/types';
import type { BranchLeafNode, BranchTree, DirectoryNode, TreeNode } from './types';

export function buildTree(branches: BranchWithMetadata[]): BranchTree {
	// Map of dirPath (e.g. "feature/") -> DirectoryNode
	const dirMap = new Map<string, DirectoryNode>();

	// Ensure a DirectoryNode exists for the given path and all its ancestors.
	// Returns the deepest DirectoryNode for dirPath.
	function ensureDir(dirPath: string): DirectoryNode {
		if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;

		// e.g. dirPath = "a/b/c/"  → segments = ["a","b","c"]
		const segments = dirPath.slice(0, -1).split('/');
		const label = segments[segments.length - 1];

		const node: DirectoryNode = {
			kind: 'dir',
			path: dirPath,
			label,
			children: [],
			branchCount: 0,
			hasCurrentBranch: false,
			availableActions: []
		};
		dirMap.set(dirPath, node);

		// Attach to parent dir (or roots handled later)
		if (segments.length > 1) {
			const parentPath = segments.slice(0, -1).join('/') + '/';
			const parent = ensureDir(parentPath);
			parent.children.push(node);
		}

		return node;
	}

	// Roots: top-level items (dirs whose parent is "root", plus leaves with no slash)
	const rootDirs = new Set<string>();
	const rootLeaves: BranchLeafNode[] = [];

	for (const branch of branches) {
		const slashIdx = branch.name.indexOf('/');

		if (slashIdx === -1) {
			// No slash — goes directly to roots as a leaf
			rootLeaves.push({ kind: 'branch', path: branch.name, branch });
		} else {
			// Walk all prefix directories
			const parts = branch.name.split('/');
			// e.g. "a/b/c" → dirs: "a/", "a/b/"  (not the last segment which is the branch)
			for (let i = 1; i < parts.length; i++) {
				const dirPath = parts.slice(0, i).join('/') + '/';
				ensureDir(dirPath);
				if (i === 1) rootDirs.add(dirPath);
			}

			// Attach leaf to its direct parent dir
			const parentPath = parts.slice(0, -1).join('/') + '/';
			const parent = dirMap.get(parentPath)!;
			parent.children.push({ kind: 'branch', path: branch.name, branch });
		}
	}

	// Bottom-up: compute branchCount and hasCurrentBranch recursively
	function computeStats(node: TreeNode): { count: number; hasCurrent: boolean } {
		if (node.kind === 'branch') {
			return { count: 1, hasCurrent: node.branch.current };
		}
		let count = 0;
		let hasCurrent = false;
		for (const child of node.children) {
			const s = computeStats(child);
			count += s.count;
			hasCurrent = hasCurrent || s.hasCurrent;
		}
		node.branchCount = count;
		node.hasCurrentBranch = hasCurrent;
		return { count, hasCurrent };
	}

	// Sort children: dirs alphabetically first, then leaves (preserving input order)
	function sortChildren(node: DirectoryNode) {
		node.children.sort((a, b) => {
			if (a.kind === 'dir' && b.kind !== 'dir') return -1;
			if (a.kind !== 'dir' && b.kind === 'dir') return 1;
			if (a.kind === 'dir' && b.kind === 'dir') return a.label.localeCompare(b.label);
			return 0; // leaves keep their input order
		});
		for (const child of node.children) {
			if (child.kind === 'dir') sortChildren(child);
		}
	}

	// Build roots array: dirs (sorted) then leaves (input order)
	const rootDirNodes = Array.from(rootDirs)
		.sort()
		.map((path) => dirMap.get(path)!);

	const roots: TreeNode[] = [...rootDirNodes, ...rootLeaves];

	// Sort each dir's children
	for (const node of rootDirNodes) {
		sortChildren(node);
	}

	// Compute stats bottom-up
	for (const node of roots) {
		computeStats(node);
	}

	return { roots, totalBranches: branches.length };
}
