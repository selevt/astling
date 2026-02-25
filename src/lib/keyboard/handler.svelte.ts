import type { BranchWithMetadata, GitWorktree } from '$lib/server/git/types';
import type { DirectoryNode, TreeNode } from '$lib/tree/types';
import {
	getFocusedTreePath,
	setFocusedTreePath,
	isExpanded,
	setExpanded,
	getVisibleNodes,
	findNodeAndParent,
	collapseAll
} from '$lib/tree/treeNav.svelte';

export interface KeyboardNavActions {
	setFilter: (f: string) => void;
	focusSearch: () => void;
	checkoutSelected: (branch: BranchWithMetadata) => void;
	toggleStarSelected: (branch: BranchWithMetadata) => void;
	deleteSelected: (branch: BranchWithMetadata, force?: boolean) => void;
	deleteDirectory: (node: DirectoryNode) => void;
	refresh: () => void;
	createBranch: () => void;
	createBranchFrom: (branch: BranchWithMetadata) => void;
	editDescription: (branch: BranchWithMetadata) => void;
	renameBranch: (branch: BranchWithMetadata) => void;
	findMerged: () => void;
	fetch: () => void;
	backupBranch: (branch: BranchWithMetadata) => void;
	toggleHistory: (branch: BranchWithMetadata) => void;
	isHistoryOpen: () => boolean;
	closeHistory: () => void;
	getViewMode: () => 'list' | 'tree' | 'worktrees';
	getTreeRoots: () => TreeNode[] | null;
	setViewMode: (mode: 'list' | 'tree' | 'worktrees') => void;
	getWorktreeList: () => GitWorktree[];
}

export function createKeyboardNav(
	getBranchList: () => BranchWithMetadata[],
	actions: KeyboardNavActions
) {
	// State (runes)
	let selectedBranch = $state<string | null>(null);
	let selectedWorktreePath = $state<string | null>(null);
	let showHelp = $state(false);
	let pendingKey = $state<string | null>(null);

	// Derived
	let selectedIndex = $derived(
		selectedBranch ? getBranchList().findIndex((b) => b.name === selectedBranch) : -1
	);

	// Clear selection when branch leaves filtered list
	$effect(() => {
		const list = getBranchList();
		if (selectedBranch && !list.some((b) => b.name === selectedBranch)) {
			selectedBranch = null;
		}
	});

	// Scroll selected branch card into view
	$effect(() => {
		if (selectedBranch) {
			const el = document.querySelector(`[data-branch="${CSS.escape(selectedBranch)}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		}
	});

	// Scroll focused directory node into view
	$effect(() => {
		const path = getFocusedTreePath();
		if (path && path !== selectedBranch) {
			const el = document.querySelector(`[data-tree-node="${CSS.escape(path)}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		}
	});

	// Scroll selected worktree card into view
	$effect(() => {
		if (selectedWorktreePath) {
			const el = document.querySelector(`[data-worktree="${CSS.escape(selectedWorktreePath)}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		}
	});

	// Navigation helpers
	function moveSelection(delta: number) {
		const list = getBranchList();
		if (list.length === 0) return;
		const currentIdx = selectedIndex;
		let newIdx: number;
		if (currentIdx === -1) {
			if (delta < 0) return;
			newIdx = 0;
		} else if (delta < 0 && currentIdx === 0) {
			selectedBranch = null;
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		} else {
			newIdx = Math.max(0, Math.min(list.length - 1, currentIdx + delta));
		}
		selectedBranch = list[newIdx].name;
	}

	function moveTreeSelection(delta: number) {
		const roots = actions.getTreeRoots();
		if (!roots) return;
		const nodes = getVisibleNodes(roots);
		if (!nodes.length) return;
		const focused = getFocusedTreePath() ?? selectedBranch;
		const idx = nodes.findIndex((n) =>
			n.kind === 'branch' ? n.branch.name === focused : n.path === focused
		);
		const newIdx =
			idx === -1
				? delta > 0
					? 0
					: nodes.length - 1
				: Math.max(0, Math.min(nodes.length - 1, idx + delta));
		const node = nodes[newIdx];
		if (node.kind === 'branch') {
			selectedBranch = node.branch.name;
			setFocusedTreePath(node.branch.name);
		} else {
			selectedBranch = null;
			setFocusedTreePath(node.path);
		}
	}

	function moveWorktreeSelection(delta: number) {
		const list = actions.getWorktreeList();
		if (list.length === 0) return;
		const currentIdx = selectedWorktreePath
			? list.findIndex((w) => w.path === selectedWorktreePath)
			: -1;
		let newIdx: number;
		if (currentIdx === -1) {
			if (delta < 0) return;
			newIdx = 0;
		} else if (delta < 0 && currentIdx === 0) {
			selectedWorktreePath = null;
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		} else {
			newIdx = Math.max(0, Math.min(list.length - 1, currentIdx + delta));
		}
		selectedWorktreePath = list[newIdx].path;
	}

	function jumpFirst() {
		const list = getBranchList();
		if (list.length > 0 && selectedIndex !== 0) {
			selectedBranch = list[0].name;
		} else {
			selectedBranch = null;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function jumpTreeFirst() {
		const roots = actions.getTreeRoots();
		if (!roots) return;
		const nodes = getVisibleNodes(roots);
		if (!nodes.length) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		const node = nodes[0];
		const firstPath = node.kind === 'branch' ? node.branch.name : node.path;
		if (getFocusedTreePath() === firstPath) {
			selectedBranch = null;
			setFocusedTreePath(null);
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		if (node.kind === 'branch') {
			selectedBranch = node.branch.name;
			setFocusedTreePath(node.branch.name);
		} else {
			selectedBranch = null;
			setFocusedTreePath(node.path);
		}
	}

	function jumpLast() {
		const list = getBranchList();
		if (list.length > 0) selectedBranch = list[list.length - 1].name;
	}

	function jumpTreeLast() {
		const roots = actions.getTreeRoots();
		if (!roots) return;
		const nodes = getVisibleNodes(roots);
		if (!nodes.length) return;
		const node = nodes[nodes.length - 1];
		if (node.kind === 'branch') {
			selectedBranch = node.branch.name;
			setFocusedTreePath(node.branch.name);
		} else {
			selectedBranch = null;
			setFocusedTreePath(node.path);
		}
	}

	function getSelectedBranch(): BranchWithMetadata | undefined {
		if (!selectedBranch) return undefined;
		return getBranchList().find((b) => b.name === selectedBranch);
	}

	// Keydown handler (inline, replaces createKeydownHandler)
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function clearPending() {
		pendingKey = null;
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Never intercept keys when a modifier is held
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		const active = document.activeElement;
		const isInput =
			active instanceof HTMLInputElement ||
			active instanceof HTMLTextAreaElement ||
			active instanceof HTMLSelectElement;

		// When focused on an input, only handle Escape
		if (isInput) {
			if (e.key === 'Escape') {
				e.preventDefault();
				(active as HTMLElement).blur();
			}
			return;
		}

		// Let buttons and links handle their own activation keys natively
		const isInteractive =
			active instanceof HTMLButtonElement || active instanceof HTMLAnchorElement;
		if (isInteractive && (e.key === 'Enter' || e.key === ' ')) return;

		const inTreeMode = actions.getViewMode() === 'tree';
		const inWorktreeMode = actions.getViewMode() === 'worktrees';

		// Handle second key in g-prefix sequence
		if (pendingKey === 'g') {
			e.preventDefault();
			const second = e.key;
			clearPending();

			switch (second) {
				case 'g':
					if (inWorktreeMode) {
						const wFirst = actions.getWorktreeList()[0]?.path ?? null;
						if (selectedWorktreePath === wFirst) {
							selectedWorktreePath = null;
							window.scrollTo({ top: 0, behavior: 'smooth' });
						} else {
							selectedWorktreePath = wFirst;
						}
					} else if (inTreeMode) {
						jumpTreeFirst();
					} else {
						jumpFirst();
					}
					break;
				case 'a':
					actions.setFilter('all');
					break;
				case 's':
					actions.setFilter('starred');
					break;
				case 'm':
					actions.findMerged();
					break;
				case 'f':
					actions.fetch();
					break;
				case 'w':
					actions.setViewMode('worktrees');
					break;
				case 'b':
					if (inWorktreeMode) actions.setViewMode('list');
					break;
			}
			return;
		}

		switch (e.key) {
			case 'j':
			case 'ArrowDown':
				e.preventDefault();
				if (inWorktreeMode) {
					moveWorktreeSelection(1);
				} else if (inTreeMode) {
					moveTreeSelection(1);
				} else {
					moveSelection(1);
				}
				break;
			case 'k':
			case 'ArrowUp':
				e.preventDefault();
				if (inWorktreeMode) {
					moveWorktreeSelection(-1);
				} else if (inTreeMode) {
					moveTreeSelection(-1);
				} else {
					moveSelection(-1);
				}
				break;
			case 'g':
				e.preventDefault();
				pendingKey = 'g';
				timeoutId = setTimeout(() => {
					pendingKey = null;
					timeoutId = null;
				}, 500);
				break;
			case 'G':
				e.preventDefault();
				if (inWorktreeMode) {
					const wList = actions.getWorktreeList();
					if (wList.length > 0) selectedWorktreePath = wList[wList.length - 1].path;
				} else if (inTreeMode) {
					jumpTreeLast();
				} else {
					jumpLast();
				}
				break;
			case '/':
				e.preventDefault();
				actions.focusSearch();
				break;
			case 'o': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.checkoutSelected(b);
				break;
			}
			case 's': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.toggleStarSelected(b);
				break;
			}
			case 'd': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) {
					actions.deleteSelected(b);
				} else if (inTreeMode) {
					const p = getFocusedTreePath();
					const roots = actions.getTreeRoots();
					const result = p && roots ? findNodeAndParent(roots, p) : null;
					if (result?.node.kind === 'dir') actions.deleteDirectory(result.node);
				}
				break;
			}
			case 'D': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.deleteSelected(b, true);
				break;
			}
			case '?':
				e.preventDefault();
				showHelp = !showHelp;
				break;
			case 'r':
				e.preventDefault();
				actions.refresh();
				break;
			case 'c':
				e.preventDefault();
				actions.createBranch();
				break;
			case 'C': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.createBranchFrom(b);
				break;
			}
			case 'e': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.editDescription(b);
				break;
			}
			case 'R': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.renameBranch(b);
				break;
			}
			case 'b': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.backupBranch(b);
				break;
			}
			case 'h':
				if (inTreeMode) {
					e.preventDefault();
					const p = getFocusedTreePath();
					if (p) {
						const roots = actions.getTreeRoots();
						const result = roots ? findNodeAndParent(roots, p) : null;
						if (result) {
							const { node, parent } = result;
							if (node.kind === 'dir' && isExpanded(node.path)) {
								// Expanded dir: collapse it
								setExpanded(node.path, false);
							} else if (parent) {
								// Branch or collapsed dir: collapse parent and move focus there
								setExpanded(parent.path, false);
								setFocusedTreePath(parent.path);
								selectedBranch = null;
							}
						}
					}
				}
				break;
			case 'H':
				if (inTreeMode) {
					e.preventDefault();
					const roots = actions.getTreeRoots();
					if (roots) collapseAll(roots);
				}
				break;
			case 'l': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) {
					actions.toggleHistory(b);
				} else if (inTreeMode) {
					const p = getFocusedTreePath();
					if (p) setExpanded(p, true);
				}
				break;
			}
			case 'v':
				e.preventDefault();
				if (actions.getViewMode() === 'list') {
					actions.setViewMode('tree');
					if (selectedBranch) setFocusedTreePath(selectedBranch);
				} else {
					actions.setViewMode('list');
					setFocusedTreePath(null);
				}
				break;
			case 'Escape':
				// Let open dialogs handle Escape natively
				if (document.querySelector('dialog[open]')) return;
				e.preventDefault();
				// Cascading dismiss
				if (showHelp) {
					showHelp = false;
				} else if (actions.isHistoryOpen()) {
					actions.closeHistory();
				} else if (inWorktreeMode && selectedWorktreePath !== null) {
					selectedWorktreePath = null;
				} else if (inTreeMode && getFocusedTreePath() !== null) {
					setFocusedTreePath(null);
					selectedBranch = null;
				} else if (selectedBranch !== null) {
					selectedBranch = null;
				}
				break;
		}
	}

	return {
		get selectedBranch() {
			return selectedBranch;
		},
		set selectedBranch(v: string | null) {
			selectedBranch = v;
		},
		get selectedWorktreePath() {
			return selectedWorktreePath;
		},
		set selectedWorktreePath(v: string | null) {
			selectedWorktreePath = v;
		},
		get showHelp() {
			return showHelp;
		},
		set showHelp(v: boolean) {
			showHelp = v;
		},
		get pendingKey() {
			return pendingKey;
		},
		get selectedIndex() {
			return selectedIndex;
		},
		get focusedTreePath() {
			return getFocusedTreePath();
		},
		handleKeydown,
		getSelectedBranch
	};
}
