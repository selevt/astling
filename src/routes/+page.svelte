<script lang="ts">
	import {
		getBranches,
		getStarredBranches,
		getStats,
		getRecentCommits,
		getRepoPath,
		checkoutBranch,
		createBranch,
		toggleStar,
		deleteBranch,
		getStaleBranches,
		pruneRemote,
		setAutoPrune,
		dismissPruneSuggestion,
		backupBranch,
		restorePatch,
		getTargetBranch,
		getBranchCommits,
		deleteBranches
	} from './branches/data.remote';
	import BranchCard from '$lib/components/BranchCard.svelte';
	import CommitList from '$lib/components/CommitList.svelte';
	import FilterControls from '$lib/components/FilterControls.svelte';
	import BranchTreeView from '$lib/components/BranchTreeView.svelte';
	import DeleteDirectoryDialog from '$lib/components/DeleteDirectoryDialog.svelte';
	import { buildTree, collectBranchNames } from '$lib/tree/buildTree';
	import type { DirectoryNode } from '$lib/tree/types';
	import ErrorDialog from '$lib/components/ErrorDialog.svelte';
	import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
	import MergedBranchesDialog from '$lib/components/MergedBranchesDialog.svelte';
	import CommitDetailDialog from '$lib/components/CommitDetailDialog.svelte';
	import type { BranchWithMetadata, RecentCommit } from '$lib/server/git/types';
	import { createKeyboardNav } from '$lib/keyboard/handler.svelte';
	import { expandAncestors, setExpanded } from '$lib/tree/treeNav.svelte';
	import HelpOverlay from '$lib/keyboard/HelpOverlay.svelte';
	import faviconUrl from '$lib/assets/favicon.svg';
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import UploadIcon from '$lib/icons/UploadIcon.svelte';
	import RefreshIcon from '$lib/icons/RefreshIcon.svelte';
	import ErrorIcon from '$lib/icons/ErrorIcon.svelte';
	import GitBranchIcon from '$lib/icons/GitBranchIcon.svelte';

	function getErrorMessage(err: unknown): string {
		if (err && typeof err === 'object' && 'message' in err) {
			return String(err.message);
		}
		return String(err);
	}

	// State
	let viewMode = $state<'list' | 'tree'>('list');
	let filter = $state('all');
	let searchTerm = $state('');
	let sortBy = $state('recent');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let showCreateForm = $state(false);
	let createStartPoint = $state<string | null>(null);
	let editingBranchName = $state<string | null>(null);
	let renamingBranchName = $state<string | null>(null);
	let showError = $state(false);
	let errorMessage = $state('');
	let showMergedDialog = $state(false);
	let showDeleteDialog = $state(false);
	let deleteBranchName = $state('');
	let deleteError = $state<string | null>(null);
	let showCommitDialog = $state(false);
	let showHistoryFor = $state<string | null>(null);
	let showDeleteDirDialog = $state(false);
	let deleteDirPath = $state('');
	let deleteDirBranches = $state<string[]>([]);
	let deleteDirSkippedCurrent = $state(false);
	let selectedCommitHash = $state('');
	let selectedCommitMessage = $state('');
	let restoreFileInput: HTMLInputElement;

	function showErrorDialog(msg: string) {
		errorMessage = msg;
		showError = true;
	}

	async function withViewTransition(action: () => Promise<boolean>): Promise<boolean> {
		if (!document.startViewTransition) {
			return action();
		}
		let success = false;
		let vt: ReturnType<typeof document.startViewTransition> | null = null;
		vt = document.startViewTransition(async () => {
			try {
				success = await action();
			} catch (err) {
				vt?.skipTransition();
				throw err;
			}
			if (success) {
				await tick();
			} else {
				vt?.skipTransition();
			}
		});
		await vt.finished;
		return success;
	}

	// Remote-derived sources (async-derived)
	let all = $derived(await getBranches());
	let starred = $derived(await getStarredBranches());
	let statsData = $derived(await getStats());
	let recentCommits = $derived(await getRecentCommits());
	let pruneInfo = $derived(await getStaleBranches());
	let isPruning = $state(false);
	let branchCommits = $derived(showHistoryFor ? await getBranchCommits(showHistoryFor) : []);
	let branchTree = $derived.by(() => {
		if (viewMode !== 'tree') return null;
		return buildTree(branchListPlain as BranchWithMetadata[]);
	});

	// Compose visible branch list as an async-derived signal. Template will
	// await it where needed.
	let branchListPlain = $derived.by(() => {
		const allBranches = all as BranchWithMetadata[] | undefined;
		const starredBranches = starred as BranchWithMetadata[] | undefined;

		let raw: BranchWithMetadata[] = [];
		switch (filter) {
			case 'starred':
				raw = starredBranches || [];
				break;
			default:
				raw = allBranches || [];
		}

		const term = (searchTerm || '').toLowerCase().trim();
		if (term) {
			raw = raw.filter(
				(branch) =>
					branch.name.toLowerCase().includes(term) ||
					branch.message.toLowerCase().includes(term) ||
					branch.author.toLowerCase().includes(term) ||
					(branch.description || '').toLowerCase().includes(term)
			);
		}

		raw.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name);
				case 'recent': {
					const dateA = a.lastCheckedOut ? new Date(a.lastCheckedOut).getTime() : 0;
					const dateB = b.lastCheckedOut ? new Date(b.lastCheckedOut).getTime() : 0;
					return dateB - dateA;
				}
				case 'date': {
					const commitDateA = new Date(a.date).getTime();
					const commitDateB = new Date(b.date).getTime();
					return commitDateB - commitDateA;
				}
				default:
					return 0;
			}
		});

		return raw;
	});

	async function reload() {
		isLoading = true;
		const minDelay = new Promise((r) => setTimeout(r, 400));
		await Promise.all([invalidateAll(), minDelay]);
		isLoading = false;
	}

	function handleFilterChange(newFilter: string) {
		filter = newFilter;
	}

	function handleSearchChange(newTerm: string) {
		searchTerm = newTerm;
	}

	function handleSortChange(newSort: string) {
		sortBy = newSort;
	}

	async function handleCheckout(name: string) {
		try {
			await withViewTransition(async () => {
				const result = await checkoutBranch(name);
				if (!result.success) showErrorDialog(result.error);
				return result.success;
			});
		} catch (err) {
			console.error('Failed to checkout:', err);
			showErrorDialog(getErrorMessage(err));
		}
	}

	async function handleToggleStar(name: string) {
		try {
			await toggleStar(name).updates(getBranches(), getStarredBranches());
		} catch (err) {
			console.error('Failed to toggle star:', err);
			showErrorDialog(getErrorMessage(err));
		}
	}

	function handleDelete(name: string) {
		deleteBranchName = name;
		deleteError = null;
		showDeleteDialog = true;
	}

	function handleDeleteDirectory(node: DirectoryNode) {
		deleteDirPath = node.path;
		deleteDirBranches = collectBranchNames(node);
		deleteDirSkippedCurrent = node.hasCurrentBranch;
		showDeleteDirDialog = true;
	}

	async function performDeleteDirectory() {
		showDeleteDirDialog = false;
		await withViewTransition(async () => {
			await deleteBranches(deleteDirBranches);
			if (deleteDirBranches.includes(nav.selectedBranch ?? '')) {
				nav.selectedBranch = null;
			}
			return true;
		});
	}

	async function performDelete(force: boolean) {
		const name = deleteBranchName;
		const list = branchListPlain as BranchWithMetadata[];
		const idx = list.findIndex((b) => b.name === name);
		await withViewTransition(async () => {
			const result = await deleteBranch({ branch: name, force, remote: false });
			if (!result.success) {
				deleteError = result.error;
				showDeleteDialog = true;
				return false;
			}
			showDeleteDialog = false;
			// Move selection to next branch (or previous if last)
			if (idx >= 0 && list.length > 1) {
				const nextIdx = idx < list.length - 1 ? idx + 1 : idx - 1;
				nav.selectedBranch = list[nextIdx].name;
			} else {
				nav.selectedBranch = null;
			}
			return true;
		});
	}

	async function handlePrune() {
		isPruning = true;
		try {
			await pruneRemote();
		} catch (err) {
			showErrorDialog(getErrorMessage(err));
		} finally {
			isPruning = false;
		}
	}

	async function handleAutoPrune() {
		isPruning = true;
		try {
			await setAutoPrune();
		} catch (err) {
			showErrorDialog(getErrorMessage(err));
		} finally {
			isPruning = false;
		}
	}

	async function handleDismissPrune() {
		try {
			await dismissPruneSuggestion();
		} catch (err) {
			console.error('Failed to dismiss prune suggestion:', err);
		}
	}

	async function handleBackup(name: string) {
		try {
			const result = await backupBranch(name);
			if (!result.success) {
				showErrorDialog(result.error);
				return;
			}
			const date = new Date().toISOString().slice(0, 10);
			const filename = `${name.replace(/\//g, '-')}_${date}.patch`;
			const blob = new Blob([result.patch || ''], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			showErrorDialog(getErrorMessage(err));
		}
	}

	function handleRestoreClick() {
		restoreFileInput?.click();
	}

	async function handleRestoreFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const content = await file.text();
			const result = await restorePatch(content);
			if (!result.success) {
				showErrorDialog(result.error);
			}
		} catch (err) {
			showErrorDialog(getErrorMessage(err));
		} finally {
			input.value = '';
		}
	}

	const nav = createKeyboardNav(() => branchListPlain as BranchWithMetadata[], {
		setFilter: (f) => {
			filter = f;
		},
		focusSearch: () => document.getElementById('branch-search')?.focus(),
		getViewMode: () => viewMode,
		checkoutSelected: (b) => {
			if (!b.current) handleCheckout(b.name);
		},
		toggleStarSelected: (b) => handleToggleStar(b.name),
		deleteSelected: (b, force) => {
			if (!b.current) {
				if (force) {
					deleteBranchName = b.name;
					performDelete(true);
				} else {
					handleDelete(b.name);
				}
			}
		},
		deleteDirectory: handleDeleteDirectory,
		refresh: reload,
		createBranch: () => {
			showCreateForm = true;
		},
		createBranchFrom: (b) => {
			createStartPoint = b.name;
			showCreateForm = true;
		},
		editDescription: (b) => {
			editingBranchName = b.name;
		},
		renameBranch: (b) => {
			renamingBranchName = b.name;
		},
		findMerged: () => {
			showMergedDialog = true;
		},
		backupBranch: (b) => handleBackup(b.name),
		toggleHistory: (b) => {
			showHistoryFor = showHistoryFor === b.name ? null : b.name;
		},
		isHistoryOpen: () => showHistoryFor !== null,
		closeHistory: () => {
			showHistoryFor = null;
		},
		getTreeRoots: () => branchTree?.roots ?? null,
		setViewMode: (mode) => {
			viewMode = mode;
			showHistoryFor = null;
			if (mode === 'tree' && nav.selectedBranch) {
				const tree = buildTree(branchListPlain as BranchWithMetadata[]);
				expandAncestors(tree.roots, nav.selectedBranch);
			}
		}
	});

	async function handleBranchCreated(name: string) {
		const parts = name.split('/');
		for (let i = 1; i < parts.length; i++) {
			setExpanded(parts.slice(0, i).join('/') + '/', true);
		}
		nav.selectedBranch = name;
		await tick();
		requestAnimationFrame(() => {
			document.querySelector(`[data-branch="${name}"]`)?.scrollIntoView({ block: 'nearest' });
		});
	}
</script>

<svelte:window onkeydown={nav.handleKeydown} />

<svelte:head>
	<title>astling</title>
	<meta name="description" content="A cute little branch manager for your git repo" />
</svelte:head>

<div class="container">
	<header class="header">
		<div class="header-content">
			<div class="header-title">
				<img src={faviconUrl} alt="astling" class="header-logo" />
				<div>
					<h1>astling</h1>
					<p>your friendly branch companion</p>
				</div>
			</div>
			<div class="header-actions">
				<button class="restore-btn" onclick={handleRestoreClick} title="Restore patch file">
					<UploadIcon />
				</button>
				<input
					bind:this={restoreFileInput}
					type="file"
					accept=".patch,.diff"
					onchange={handleRestoreFile}
					style="display:none"
				/>
				<button class="refresh-btn" onclick={reload} disabled={isLoading} title="Refresh data">
					<RefreshIcon class={`refresh-icon ${isLoading ? 'spinning' : ''}`} />
				</button>
			</div>
		</div>
	</header>

	{#if statsData}
		<section class="stats-section">
			<div class="branch-commits-card">
				<div class="branch-commits-header">
					<span class="branch-commits-label">Current Branch</span>
					<code class="branch-commits-name">{statsData.currentBranch || 'None'}</code>
				</div>
				<CommitList
					commits={recentCommits}
					initialVisible={3}
					onCommitClick={(hash, message) => {
						selectedCommitHash = hash;
						selectedCommitMessage = message;
						showCommitDialog = true;
					}}
				/>
			</div>
		</section>
	{/if}

	{#if pruneInfo && pruneInfo.staleRefs.length > 0}
		<section class="prune-banner">
			<div class="prune-content">
				<div class="prune-text">
					<strong>{pruneInfo.staleRefs.length}</strong> stale remote tracking reference{pruneInfo
						.staleRefs.length === 1
						? ''
						: 's'}
				</div>
				<div class="prune-actions">
					<button class="prune-btn prune-btn-primary" onclick={handlePrune} disabled={isPruning}>
						{isPruning ? 'Pruning...' : 'Prune now'}
					</button>
					<button
						class="prune-btn prune-btn-secondary"
						onclick={handleAutoPrune}
						disabled={isPruning}
					>
						Enable auto-prune
					</button>
					<button class="prune-btn prune-btn-dismiss" onclick={handleDismissPrune}>
						Dismiss
					</button>
				</div>
			</div>
		</section>
	{/if}

	<section class="main-content">
		<FilterControls
			currentFilter={filter}
			{searchTerm}
			{sortBy}
			onFilterChange={handleFilterChange}
			onSearchChange={handleSearchChange}
			onSortChange={handleSortChange}
			onFindMerged={() => (showMergedDialog = true)}
			{getTargetBranch}
			bind:showCreateForm
			bind:createStartPoint
			totalBranches={statsData?.totalGitBranches ?? 0}
			starredCount={statsData?.starredBranches ?? 0}
			{viewMode}
			onBranchCreated={handleBranchCreated}
			onViewModeChange={(mode) => {
				if (mode === 'tree' && nav.selectedBranch) {
					const tree = buildTree(branchListPlain as BranchWithMetadata[]);
					expandAncestors(tree.roots, nav.selectedBranch);
				}
				viewMode = mode;
				showHistoryFor = null;
			}}
		/>

		{#if error}
			<div class="error-message">
				<h3>
					<ErrorIcon style="vertical-align: middle; margin-right: 6px;" />
					Error
				</h3>
				<p>{error}</p>
				<button onclick={reload}>Try Again</button>
			</div>
		{:else if isLoading}
			<div class="loading-state">
				<RefreshIcon class="loading-spinner" width={32} height={32} />
				<h3>Loading branches...</h3>
			</div>
		{:else if (branchListPlain as BranchWithMetadata[]).length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<GitBranchIcon width={48} height={48} />
				</div>
				<h3>No branches found</h3>
				<p>
					{searchTerm
						? `No branches match your search for "${searchTerm}"`
						: filter === 'starred'
							? 'No starred branches yet'
							: 'No branches found'}
				</p>
				{#if searchTerm}
					<button
						onclick={() => {
							searchTerm = ''; /* branchList is derived so no explicit load needed */
						}}>Clear Search</button
					>
				{/if}
			</div>
		{:else if viewMode === 'list'}
			<div class="branches-list">
				{#each branchListPlain as BranchWithMetadata[] as branch (branch.name)}
					<BranchCard
						{branch}
						selected={nav.selectedBranch === branch.name}
						onSelect={(name) => (nav.selectedBranch = name)}
						onCheckout={handleCheckout}
						onToggleStar={handleToggleStar}
						onDelete={(name) => handleDelete(name)}
						showDescriptionForm={editingBranchName === branch.name}
						onEditComplete={() => (editingBranchName = null)}
						showRenameForm={renamingBranchName === branch.name}
						onRenameComplete={() => (renamingBranchName = null)}
						onError={showErrorDialog}
						showCommitHistory={showHistoryFor === branch.name}
						commitHistory={showHistoryFor === branch.name ? branchCommits : []}
						commitHistoryLoading={false}
						onToggleHistory={() => {
							showHistoryFor = showHistoryFor === branch.name ? null : branch.name;
						}}
						onCommitClick={(hash, message) => {
							selectedCommitHash = hash;
							selectedCommitMessage = message;
							showCommitDialog = true;
						}}
					/>
				{/each}
			</div>
		{:else if branchTree}
			<BranchTreeView
				roots={branchTree.roots}
				{showHistoryFor}
				{branchCommits}
				onToggleHistory={(path) => {
					showHistoryFor = showHistoryFor === path ? null : path;
				}}
				onCommitClick={(hash, message) => {
					selectedCommitHash = hash;
					selectedCommitMessage = message;
					showCommitDialog = true;
				}}
				selectedBranch={nav.selectedBranch}
				onSelect={(name) => (nav.selectedBranch = name)}
				onCheckout={handleCheckout}
				onToggleStar={handleToggleStar}
				onDelete={(name) => handleDelete(name)}
				onDeleteDirectory={handleDeleteDirectory}
				{editingBranchName}
				onEditComplete={() => (editingBranchName = null)}
				{renamingBranchName}
				onRenameComplete={() => (renamingBranchName = null)}
				onError={showErrorDialog}
				focusedTreePath={nav.focusedTreePath}
			/>
		{/if}
	</section>
</div>

{#if nav.pendingKey}
	<div class="pending-key-badge">g...</div>
{/if}

{#if nav.showHelp}
	<HelpOverlay onClose={() => (nav.showHelp = false)} />
{/if}

{#if showError}
	<ErrorDialog bind:open={showError} title="Error" message={errorMessage} />
{/if}

{#if showDeleteDialog}
	<DeleteConfirmDialog
		bind:open={showDeleteDialog}
		branchName={deleteBranchName}
		errorMessage={deleteError}
		onConfirm={() => performDelete(false)}
		onForceDelete={() => performDelete(true)}
		onCancel={() => (showDeleteDialog = false)}
	/>
{/if}

{#if showMergedDialog}
	<MergedBranchesDialog bind:open={showMergedDialog} onComplete={reload} />
{/if}

{#if showCommitDialog}
	<CommitDetailDialog
		bind:open={showCommitDialog}
		hash={selectedCommitHash}
		message={selectedCommitMessage}
	/>
{/if}

{#if showDeleteDirDialog}
	<DeleteDirectoryDialog
		bind:open={showDeleteDirDialog}
		dirPath={deleteDirPath}
		branches={deleteDirBranches}
		skippedCurrent={deleteDirSkippedCurrent}
		onConfirm={performDeleteDirectory}
		onCancel={() => (showDeleteDirDialog = false)}
	/>
{/if}

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.header {
		background: var(--color-bg-surface);
		border-radius: 8px;
		padding: 24px;
		margin-bottom: 24px;
		border: 1px solid var(--color-border);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.header-title h1 {
		margin: 0;
		font-size: 28px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.header-logo {
		width: 96px;
		height: 96px;
		margin: -20px 0;
	}

	.header-title p {
		margin: 2px 0 0 0;
		color: var(--color-text-secondary);
		font-size: 14px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.refresh-btn,
	.restore-btn {
		padding: 8px;
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.refresh-btn:hover:not(:disabled),
	.restore-btn:hover {
		color: var(--color-text-primary);
		border-color: var(--color-border-input);
		background: var(--color-bg-hover);
	}

	.refresh-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.refresh-icon.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.stats-section {
		margin-bottom: 24px;
	}

	.main-content {
		background: var(--color-bg-surface);
		border-radius: 8px;
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.branches-list {
		padding: 16px;
	}

	.loading-state {
		padding: 60px 20px;
		text-align: center;
	}

	.loading-spinner {
		margin-bottom: 16px;
		color: var(--color-text-secondary);
		animation: spin 0.8s linear infinite;
	}

	.loading-state h3 {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 18px;
	}

	.empty-state {
		padding: 60px 20px;
		text-align: center;
	}

	.empty-icon {
		line-height: 1;
		margin-bottom: 16px;
		color: var(--color-text-secondary);
	}

	.empty-state h3 {
		margin: 0 0 8px 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.empty-state p {
		margin: 0 0 20px 0;
		color: var(--color-text-secondary);
		font-size: 16px;
	}

	.error-message {
		padding: 40px 20px;
		text-align: center;
		background: var(--color-error-bg);
		margin: 16px;
		border-radius: 8px;
		border: 1px solid var(--color-error-border);
	}

	.error-message h3 {
		margin: 0 0 8px 0;
		font-size: 18px;
		color: var(--color-error-text);
	}

	.error-message p {
		margin: 0 0 20px 0;
		color: var(--color-text-primary);
	}

	.error-message button {
		padding: 8px 16px;
		background: var(--color-accent-blue);
		color: var(--color-accent-blue-text);
		border: 1px solid var(--color-accent-blue);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.branch-commits-card {
		margin-top: 16px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 16px;
	}

	.branch-commits-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}

	.branch-commits-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.branch-commits-name {
		font-family: monospace;
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
		background: var(--color-bg-elevated, var(--color-bg-surface));
		padding: 2px 8px;
		border-radius: 4px;
	}

	/* Prune banner */
	.prune-banner {
		margin-bottom: 24px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-warning-border, #d4a017);
		border-radius: 8px;
		padding: 16px 20px;
	}

	.prune-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.prune-text {
		font-size: 14px;
		color: var(--color-text-primary);
	}

	.prune-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.prune-btn {
		padding: 6px 14px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.prune-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.prune-btn-primary {
		background: var(--color-accent-blue);
		color: var(--color-accent-blue-text);
		border-color: var(--color-accent-blue);
	}

	.prune-btn-primary:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.prune-btn-secondary {
		background: transparent;
		color: var(--color-text-primary);
		border-color: var(--color-border);
	}

	.prune-btn-secondary:hover:not(:disabled) {
		background: var(--color-bg-hover);
	}

	.prune-btn-dismiss {
		background: transparent;
		color: var(--color-text-secondary);
		border-color: transparent;
	}

	.prune-btn-dismiss:hover {
		color: var(--color-text-primary);
	}

	/* Pending key badge */
	.pending-key-badge {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-accent-blue);
		color: var(--color-accent-blue);
		padding: 6px 12px;
		border-radius: 6px;
		font-family: monospace;
		font-size: 14px;
		font-weight: 600;
		box-shadow: 0 2px 8px var(--color-shadow);
		z-index: 900;
	}
</style>
