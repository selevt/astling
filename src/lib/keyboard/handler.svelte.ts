import type { BranchWithMetadata } from '$lib/server/git/types';

export interface KeyboardNavActions {
	setFilter: (f: string) => void;
	focusSearch: () => void;
	checkoutSelected: (branch: BranchWithMetadata) => void;
	toggleStarSelected: (branch: BranchWithMetadata) => void;
	deleteSelected: (branch: BranchWithMetadata, force?: boolean) => void;
	refresh: () => void;
	createBranch: () => void;
	editDescription: (branch: BranchWithMetadata) => void;
	renameBranch: (branch: BranchWithMetadata) => void;
	findMerged: () => void;
	backupBranch: (branch: BranchWithMetadata) => void;
	toggleHistory: (branch: BranchWithMetadata) => void;
	isHistoryOpen: () => boolean;
	closeHistory: () => void;
}

export function createKeyboardNav(
	getBranchList: () => BranchWithMetadata[],
	actions: KeyboardNavActions
) {
	// State (runes)
	let selectedBranch = $state<string | null>(null);
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

	// Scroll selected card into view
	$effect(() => {
		if (selectedBranch) {
			const el = document.querySelector(`[data-branch="${CSS.escape(selectedBranch)}"]`);
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

	function jumpFirst() {
		const list = getBranchList();
		if (list.length > 0 && selectedIndex !== 0) {
			selectedBranch = list[0].name;
		} else {
			selectedBranch = null;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function jumpLast() {
		const list = getBranchList();
		if (list.length > 0) selectedBranch = list[list.length - 1].name;
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

		// Handle second key in g-prefix sequence
		if (pendingKey === 'g') {
			e.preventDefault();
			const second = e.key;
			clearPending();

			switch (second) {
				case 'g':
					jumpFirst();
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
			}
			return;
		}

		switch (e.key) {
			case 'j':
			case 'ArrowDown':
				e.preventDefault();
				moveSelection(1);
				break;
			case 'k':
			case 'ArrowUp':
				e.preventDefault();
				moveSelection(-1);
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
				jumpLast();
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
			case ' ': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.toggleStarSelected(b);
				break;
			}
			case 'd': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.deleteSelected(b);
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
			case 'l': {
				e.preventDefault();
				const b = getSelectedBranch();
				if (b) actions.toggleHistory(b);
				break;
			}
			case 'Escape':
				// Let open dialogs handle Escape natively
				if (document.querySelector('dialog[open]')) return;
				e.preventDefault();
				// Cascading dismiss
				if (showHelp) {
					showHelp = false;
				} else if (actions.isHistoryOpen()) {
					actions.closeHistory();
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
		handleKeydown,
		getSelectedBranch
	};
}
