<script lang="ts">
  import { getBranches, getStarredBranches, getStats, getRecentCommits, getRepoPath, checkoutBranch, toggleStar, deleteBranch, getStaleBranches, pruneRemote, setAutoPrune, dismissPruneSuggestion } from './branches/data.remote';
  import BranchCard from '$lib/components/BranchCard.svelte';
  import FilterControls from '$lib/components/FilterControls.svelte';
  import ErrorDialog from '$lib/components/ErrorDialog.svelte';
  import DeleteConfirmDialog from '$lib/components/DeleteConfirmDialog.svelte';
  import MergedBranchesDialog from '$lib/components/MergedBranchesDialog.svelte';
  import CommitDetailDialog from '$lib/components/CommitDetailDialog.svelte';
  import type { BranchWithMetadata, RecentCommit } from '$lib/server/git/types';
  import { createKeyboardNav } from '$lib/keyboard/handler.svelte';
  import HelpOverlay from '$lib/keyboard/HelpOverlay.svelte';
  import faviconUrl from '$lib/assets/favicon.svg';
  import { invalidateAll } from '$app/navigation';

  function getErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      return String(err.message);
    }
    return String(err);
  }

	// State
  let filter = $state('all');
  let searchTerm = $state('');
  let sortBy = $state('recent');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let showCreateForm = $state(false);
  let editingBranchName = $state<string | null>(null);
  let renamingBranchName = $state<string | null>(null);
  let showError = $state(false);
  let errorMessage = $state('');
  let showMergedDialog = $state(false);
  let showDeleteDialog = $state(false);
  let deleteBranchName = $state('');
  let deleteError = $state<string | null>(null);
  let showCommitDialog = $state(false);
  let selectedCommitHash = $state('');
  let selectedCommitMessage = $state('');

  function showErrorDialog(msg: string) {
    errorMessage = msg;
    showError = true;
  }

  // Remote-derived sources (async-derived)
  let all = $derived(await getBranches());
  let starred = $derived(await getStarredBranches());
  let statsData = $derived(await getStats());
  let recentCommits = $derived(await getRecentCommits());
  let pruneInfo = $derived(await getStaleBranches());
  let isPruning = $state(false);

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
      raw = raw.filter((branch) =>
        branch.name.toLowerCase().includes(term) ||
        branch.message.toLowerCase().includes(term) ||
        branch.author.toLowerCase().includes(term) ||
        ((branch.description || '').toLowerCase().includes(term))
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
      const result = await checkoutBranch(name);
      if (!result.success) {
        showErrorDialog(result.error);
        return;
      }
    } catch (err) {
      console.error('Failed to checkout:', err);
      showErrorDialog(getErrorMessage(err));
    }
  }

  async function handleToggleStar(name: string) {
    try {
      await toggleStar(name).updates(
        getBranches(),
        getStarredBranches()
      );
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

  async function performDelete(force: boolean) {
    const name = deleteBranchName;
    const list = branchListPlain as BranchWithMetadata[];
    const idx = list.findIndex(b => b.name === name);
    const result = await deleteBranch({ branch: name, force, remote: false });
    if (!result.success) {
      deleteError = result.error;
      showDeleteDialog = true;
      return;
    }
    showDeleteDialog = false;
    // Move selection to next branch (or previous if last)
    if (idx >= 0 && list.length > 1) {
      const nextIdx = idx < list.length - 1 ? idx + 1 : idx - 1;
      nav.selectedBranch = list[nextIdx].name;
    } else {
      nav.selectedBranch = null;
    }
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

  const nav = createKeyboardNav(
    () => branchListPlain as BranchWithMetadata[],
    {
      setFilter: (f) => { filter = f; },
      focusSearch: () => document.getElementById('branch-search')?.focus(),
      checkoutSelected: (b) => { if (!b.current) handleCheckout(b.name); },
      toggleStarSelected: (b) => handleToggleStar(b.name),
      deleteSelected: (b) => { if (!b.current) handleDelete(b.name); },
      refresh: reload,
      createBranch: () => { showCreateForm = true; },
      editDescription: (b) => { editingBranchName = b.name; },
      renameBranch: (b) => { renamingBranchName = b.name; },
      findMerged: () => { showMergedDialog = true; },
    }
  );
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
				<button
					class="refresh-btn"
					onclick={reload}
					disabled={isLoading}
					title="Refresh data"
				>
					<svg class="refresh-icon" class:spinning={isLoading} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M1.5 8a6.5 6.5 0 0 1 11.25-4.5M14.5 8a6.5 6.5 0 0 1-11.25 4.5"/>
						<polyline points="13 1 13 4.5 9.5 4.5"/>
						<polyline points="3 15 3 11.5 6.5 11.5"/>
					</svg>
				</button>
			</div>
		</div>
	</header>

	{#if statsData}
		<section class="stats-section">
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-number">{statsData.totalGitBranches}</div>
					<div class="stat-label">Total Branches</div>
				</div>
				<div class="stat-card">
					<div class="stat-number">{statsData.starredBranches}</div>
					<div class="stat-label">Starred</div>
				</div>
			</div>
			<div class="branch-commits-card">
				<div class="branch-commits-header">
					<span class="branch-commits-label">Current Branch</span>
					<code class="branch-commits-name">{statsData.currentBranch || 'None'}</code>
				</div>
				{#if recentCommits.length > 0}
					<div class="branch-commits-list">
						{#each recentCommits as commit (commit.hash)}
							<button class="commit-row" type="button" onclick={() => { selectedCommitHash = commit.hash; selectedCommitMessage = commit.message; showCommitDialog = true; }}>
								<code class="commit-hash">{commit.hash}</code>
								{#each commit.refs as ref}
									<span class="ref-badge ref-badge--{ref.type}">{ref.name}{#if ref.synced}<svg class="ref-cloud" viewBox="0 0 24 24" fill="currentColor"><title>on remote</title><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" opacity="0.55"/></svg>{/if}</span>
								{/each}
								<span class="commit-message">{commit.message}</span>
								<span class="commit-date">{commit.relativeDate}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	{#if pruneInfo && pruneInfo.staleRefs.length > 0}
		<section class="prune-banner">
			<div class="prune-content">
				<div class="prune-text">
					<strong>{pruneInfo.staleRefs.length}</strong> stale remote tracking reference{pruneInfo.staleRefs.length === 1 ? '' : 's'}
				</div>
				<div class="prune-actions">
					<button class="prune-btn prune-btn-primary" onclick={handlePrune} disabled={isPruning}>
						{isPruning ? 'Pruning...' : 'Prune now'}
					</button>
					<button class="prune-btn prune-btn-secondary" onclick={handleAutoPrune} disabled={isPruning}>
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
			searchTerm={searchTerm}
			sortBy={sortBy}
			onFilterChange={handleFilterChange}
			onSearchChange={handleSearchChange}
			onSortChange={handleSortChange}
			onFindMerged={() => showMergedDialog = true}
			bind:showCreateForm
		/>

		{#if error}
			<div class="error-message">
				<h3>⚠️ Error</h3>
				<p>{error}</p>
				<button onclick={reload}>Try Again</button>
			</div>
		{:else if isLoading}
			<div class="loading-state">
				<svg class="loading-spinner" width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M1.5 8a6.5 6.5 0 0 1 11.25-4.5M14.5 8a6.5 6.5 0 0 1-11.25 4.5"/>
					<polyline points="13 1 13 4.5 9.5 4.5"/>
					<polyline points="3 15 3 11.5 6.5 11.5"/>
				</svg>
				<h3>Loading branches...</h3>
			</div>
		{:else}
			<div class="results-header">
				<h2>
					{#if filter === 'starred'}
					  Starred Branches
					{:else}
					  All Branches
					{/if}
				</h2>
                <p class="results-count">
                    {(branchListPlain as BranchWithMetadata[]).length} branch{(branchListPlain as BranchWithMetadata[]).length === 1 ? '' : 'es'}
                    {searchTerm && ` matching "${searchTerm}"`}
                </p>
			</div>

            {#if (branchListPlain as BranchWithMetadata[]).length === 0}
				<div class="empty-state">
					<div class="empty-icon">🌱</div>
					<h3>No branches found</h3>
					<p>
						{searchTerm 
							? `No branches match your search for "${searchTerm}"`
							: filter === 'starred'
							? 'No starred branches yet'
							: 'No branches found'
						}
					</p>
                    {#if searchTerm}
                        <button onclick={() => { searchTerm = ''; /* branchList is derived so no explicit load needed */ }}>Clear Search</button>
                    {/if}
				</div>
                {:else}
                <div class="branches-list">
                    {#each (branchListPlain as BranchWithMetadata[]) as branch (branch.name)}
                        <BranchCard
                          {branch}
                          selected={nav.selectedBranch === branch.name}
                          onCheckout={handleCheckout}
                          onToggleStar={handleToggleStar}
                          onDelete={(name) => handleDelete(name)}
                          showDescriptionForm={editingBranchName === branch.name}
                          onEditComplete={() => editingBranchName = null}
                          showRenameForm={renamingBranchName === branch.name}
                          onRenameComplete={() => renamingBranchName = null}
                          onError={showErrorDialog}
                        />
                    {/each}
                </div>
            {/if}
		{/if}
	</section>
</div>

{#if nav.pendingKey}
	<div class="pending-key-badge">g...</div>
{/if}

{#if nav.showHelp}
	<HelpOverlay onClose={() => nav.showHelp = false} />
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
		onCancel={() => showDeleteDialog = false}
	/>
{/if}

{#if showMergedDialog}
	<MergedBranchesDialog bind:open={showMergedDialog} onComplete={reload} />
{/if}

{#if showCommitDialog}
	<CommitDetailDialog bind:open={showCommitDialog} hash={selectedCommitHash} message={selectedCommitMessage} />
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

	.refresh-btn {
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

	.refresh-btn:hover:not(:disabled) {
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
		to { transform: rotate(360deg); }
	}

	.stats-section {
		margin-bottom: 24px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.stat-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 20px;
		text-align: center;
	}

	.stat-number {
		font-size: 32px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 4px;
	}

	.stat-label {
		font-size: 14px;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.main-content {
		background: var(--color-bg-surface);
		border-radius: 8px;
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.results-header {
		padding: 16px 16px 8px 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.results-header h2 {
		margin: 0 0 4px 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.results-count {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 14px;
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
		font-size: 48px;
		margin-bottom: 16px;
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
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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

	.branch-commits-list {
		border-top: 1px solid var(--color-border);
		padding-top: 10px;
	}

	.commit-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 4px;
		font-size: 14px;
		width: 100%;
		background: none;
		border: none;
		color: inherit;
		text-align: left;
		cursor: pointer;
		border-radius: 4px;
		transition: background 0.15s ease;
	}

	.commit-row:hover {
		background: var(--color-bg-hover);
	}

	.commit-row:not(:last-child) {
		border-bottom: 1px solid var(--color-border);
		border-radius: 0;
		padding-bottom: 6px;
	}

	.commit-hash {
		font-family: monospace;
		font-size: 13px;
		color: var(--color-text-secondary);
		background: var(--color-bg-elevated, var(--color-bg-surface));
		padding: 2px 6px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.commit-message {
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.commit-date {
		color: var(--color-text-secondary);
		font-size: 13px;
		flex-shrink: 0;
		text-align: right;
	}

	.ref-badge {
		font-size: 11px;
		font-weight: 500;
		padding: 1px 6px;
		border-radius: 10px;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.ref-badge--branch {
		--badge-bg: var(--color-badge-green-bg);
		--badge-border: var(--color-badge-green-border);
		background: var(--badge-bg);
		color: var(--color-badge-green-text);
		border: 1px solid var(--badge-border);
	}

	.ref-badge--remote {
		--badge-bg: var(--color-badge-blue-bg);
		--badge-border: var(--color-badge-blue-border);
		background: var(--badge-bg);
		color: var(--color-badge-blue-text);
		border: 1px solid var(--badge-border);
	}

	.ref-badge--tag {
		--badge-bg: var(--color-badge-yellow-bg);
		--badge-border: var(--color-badge-yellow-border);
		background: var(--badge-bg);
		color: var(--color-badge-yellow-text);
		border: 1px solid var(--badge-border);
	}

	.ref-cloud {
		width: 14px;
		height: 10px;
		margin-left: 3px;
		vertical-align: -1px;
		flex-shrink: 0;
	}

	.ref-badge--head {
		background: var(--color-accent-purple-bg, #e8d5f5);
		color: var(--color-accent-purple-text, #5b2d8e);
		border: 1px solid var(--color-accent-purple-border, #c9a3e0);
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
