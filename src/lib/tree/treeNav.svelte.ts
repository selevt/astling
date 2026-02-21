import type { TreeNode, DirectoryNode } from './types';

let expandedPaths = $state(new Map<string, boolean>());
let focusedTreePath = $state<string | null>(null);

export function isExpanded(path: string): boolean {
	return expandedPaths.get(path) ?? true; // default open, matches existing behaviour
}

export function setExpanded(path: string, value: boolean): void {
	expandedPaths = new Map(expandedPaths).set(path, value);
}

export function toggleExpanded(path: string): void {
	setExpanded(path, !isExpanded(path));
}

export function getFocusedTreePath(): string | null {
	return focusedTreePath;
}

export function setFocusedTreePath(p: string | null): void {
	focusedTreePath = p;
}

export function expandAncestors(roots: TreeNode[], branchName: string): void {
	function search(nodes: TreeNode[], ancestors: string[]): boolean {
		for (const node of nodes) {
			if (node.kind === 'branch') {
				if (node.branch.name === branchName) {
					for (const path of ancestors) setExpanded(path, true);
					return true;
				}
			} else {
				if (search(node.children, [...ancestors, node.path])) return true;
			}
		}
		return false;
	}
	search(roots, []);
}

export function findNodeAndParent(
	roots: TreeNode[],
	focusedPath: string
): { node: TreeNode; parent: DirectoryNode | null } | null {
	function search(
		nodes: TreeNode[],
		parent: DirectoryNode | null
	): { node: TreeNode; parent: DirectoryNode | null } | null {
		for (const node of nodes) {
			const key = node.kind === 'branch' ? node.branch.name : node.path;
			if (key === focusedPath) return { node, parent };
			if (node.kind === 'dir') {
				const found = search(node.children, node);
				if (found) return found;
			}
		}
		return null;
	}
	return search(roots, null);
}

export function getVisibleNodes(roots: TreeNode[]): TreeNode[] {
	const result: TreeNode[] = [];
	function walk(nodes: TreeNode[]) {
		for (const node of nodes) {
			result.push(node);
			if (node.kind === 'dir' && isExpanded(node.path)) {
				walk(node.children);
			}
		}
	}
	walk(roots);
	return result;
}
