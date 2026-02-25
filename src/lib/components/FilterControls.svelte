<script lang="ts">
	import {
		getRepoPath,
		setRepoPath,
		getTargetBranch,
		setTargetBranch,
		createBranch,
		fetchRemote,
		getAutoFetch,
		setAutoFetchInterval
	} from '../../routes/branches/data.remote';
	import DownloadIcon from '$lib/icons/DownloadIcon.svelte';
	import { createBranchSchema } from '$lib/schemas/branch';
	import { onMount, onDestroy } from 'svelte';
	import Dialog from './Dialog.svelte';
	import GitBranchIcon from '$lib/icons/GitBranchIcon.svelte';
	import StarIcon from '$lib/icons/StarIcon.svelte';
	import SearchIcon from '$lib/icons/SearchIcon.svelte';
	import MergeIcon from '$lib/icons/MergeIcon.svelte';
	import PlusIcon from '$lib/icons/PlusIcon.svelte';
	import ListIcon from '$lib/icons/ListIcon.svelte';
	import TreeIcon from '$lib/icons/TreeIcon.svelte';
	import WorktreeIcon from '$lib/icons/WorktreeIcon.svelte';

	// Props
	let {
		currentFilter,
		searchTerm,
		sortBy,
		onFilterChange,
		onSearchChange,
		onSortChange,
		onFindMerged,
		showCreateForm = $bindable(false),
		createStartPoint = $bindable<string | null>(null),
		totalBranches = 0,
		starredCount = 0,
		viewMode = 'list' as 'list' | 'tree' | 'worktrees',
		onViewModeChange,
		onBranchCreated
	}: {
		currentFilter: string;
		searchTerm: string;
		sortBy: string;
		onFilterChange: (filter: string) => void;
		onSearchChange: (term: string) => void;
		onSortChange: (sort: string) => void;
		onFindMerged?: () => void;
		showCreateForm?: boolean;
		createStartPoint?: string | null;
		totalBranches?: number;
		starredCount?: number;
		viewMode?: 'list' | 'tree' | 'worktrees';
		onViewModeChange?: (mode: 'list' | 'tree' | 'worktrees') => void;
		onBranchCreated?: (name: string) => void;
	} = $props();

	let newBranchName = $state('');
	let isCreating = $state(false);
	let isFetching = $state(false);

	let repoPathInfo = $derived(await getRepoPath());
	let newRepoPath = $state('');

	let targetBranch = $derived(await getTargetBranch());
	let newTargetBranch = $state('');

	let editingConfig = $state(false);

	let fetchMeta = $derived(await getAutoFetch());
	let newAutoFetchInterval = $state(0);
	let now = $state(Date.now());
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	let createBranchForm = $derived(createBranch.preflight(createBranchSchema));

	$effect(() => {
		if (showCreateForm && createStartPoint) {
			createBranchForm.fields.startPoint.set(createStartPoint);
		} else {
			createBranchForm.fields.startPoint.set(targetBranch);
		}
	});

	onMount(async () => {
		await checkAutoFetch();
		pollTimer = setInterval(async () => {
			now = Date.now();
			await checkAutoFetch();
		}, 60_000);
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	async function saveConfig() {
		let repoOk = true;
		let branchOk = true;

		try {
			await setRepoPath(newRepoPath.trim());
		} catch (err) {
			alert(`Failed to set repo path: ${err instanceof Error ? err.message : String(err)}`);
			repoOk = false;
		}

		try {
			await setTargetBranch(newTargetBranch.trim());
		} catch (err) {
			alert(`Failed to set target branch: ${err instanceof Error ? err.message : String(err)}`);
			branchOk = false;
		}

		if (fetchMeta && newAutoFetchInterval !== fetchMeta.intervalSecs) {
			await setAutoFetchInterval(newAutoFetchInterval);
		}

		if (repoOk && branchOk) {
			editingConfig = false;
		}
	}

	function cancelConfig() {
		editingConfig = false;
		newRepoPath = repoPathInfo?.path ?? '';
		newTargetBranch = targetBranch;
		newAutoFetchInterval = fetchMeta?.intervalSecs ?? 0;
	}

	function formatLastFetch(lastFetch: number, _now: number): string {
		if (!lastFetch) return 'never';
		const diffSecs = Math.floor((Date.now() - lastFetch) / 1000);
		if (diffSecs < 60) return 'just now';
		if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
		if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
		return `${Math.floor(diffSecs / 86400)}d ago`;
	}

	async function checkAutoFetch() {
		if (!fetchMeta || fetchMeta.intervalSecs <= 0 || isFetching) return;
		if (Date.now() - fetchMeta.lastFetch >= fetchMeta.intervalSecs * 1000) {
			await handleFetch();
		}
	}

	async function handleFetch() {
		isFetching = true;
		try {
			await fetchRemote();
		} finally {
			isFetching = false;
		}
	}

	const filters = $derived([
		{ value: 'all', label: `All Branches (${totalBranches})` },
		{ value: 'starred', label: `Starred (${starredCount})` }
	]);

	const sortOptions = [
		{ value: 'name', label: 'Name' },
		{ value: 'recent', label: 'Recently Used' },
		{ value: 'date', label: 'Last Commit' }
	];
</script>

<div class="controls">
	<div class="repo-path-row">
		{#if !editingConfig}
			<div class="repo-info">
				{#if repoPathInfo !== null}
					<span class="config-item">
						<small>Repo:</small>
						<code class="repo-path">{repoPathInfo.path}</code>
						{#if repoPathInfo.worktreeOf}
							<span class="repo-worktree">(worktree of {repoPathInfo.worktreeOf})</span>
						{/if}
						{#if !repoPathInfo.valid}
							<span class="repo-invalid">(not a git repo)</span>
						{/if}
					</span>
				{/if}
				<span class="config-separator">|</span>
				<span class="config-item">
					<small>Target:</small>
					<code class="repo-path">{targetBranch}</code>
				</span>
				{#if fetchMeta}
					<span class="config-separator">|</span>
					<span class="config-item" title="Last git fetch">
						<small>Fetched:</small>
						<span class="fetch-time"
							>{formatLastFetch(
								fetchMeta.lastFetch,
								now
							)}{#if fetchMeta.intervalSecs > 0}{' · auto'}{/if}</span
						>
					</span>
				{/if}
			</div>
			<div class="repo-actions">
				<button
					class="edit-repo-btn"
					onclick={() => {
						newRepoPath = repoPathInfo?.path ?? '';
						newTargetBranch = targetBranch;
						newAutoFetchInterval = fetchMeta?.intervalSecs ?? 0;
						editingConfig = true;
					}}>Change</button
				>
			</div>
		{:else}
			<div class="config-edit">
				<div class="config-edit-fields">
					<label class="config-edit-label">
						<small>Repo:</small>
						<input type="text" bind:value={newRepoPath} class="repo-input" />
					</label>
					<label class="config-edit-label">
						<small>Target:</small>
						<input type="text" bind:value={newTargetBranch} class="repo-input" />
					</label>
					<label class="config-edit-label">
						<small>Auto-fetch:</small>
						<select bind:value={newAutoFetchInterval} class="repo-select">
							<option value={0}>Off</option>
							<option value={300}>5 min</option>
							<option value={900}>15 min</option>
							<option value={1800}>30 min</option>
							<option value={3600}>1 hour</option>
						</select>
					</label>
				</div>
				<div class="config-edit-actions">
					<button class="save-repo-btn" onclick={saveConfig}>Save</button>
					<button class="cancel-repo-btn" onclick={cancelConfig}>Cancel</button>
				</div>
			</div>
		{/if}
	</div>
	<div class="filters">
		{#each filters as filter (filter.value)}
			<button
				class="filter-btn"
				class:active={currentFilter === filter.value}
				onclick={() => onFilterChange(filter.value)}
				title={filter.label}
			>
				<span class="filter-icon">
					{#if filter.value === 'all'}
						<GitBranchIcon />
					{:else if filter.value === 'starred'}
						<StarIcon />
					{/if}
				</span>
				<span class="filter-label">{filter.label}</span>
			</button>
		{/each}
		<div class="view-toggle" role="group" aria-label="View mode">
			<button
				class="filter-btn"
				class:active={viewMode === 'list'}
				onclick={() => onViewModeChange?.('list')}
				title="List view"
			>
				<ListIcon />
			</button>
			<button
				class="filter-btn"
				class:active={viewMode === 'tree'}
				onclick={() => onViewModeChange?.('tree')}
				title="Tree view"
			>
				<TreeIcon />
			</button>
			<button
				class="filter-btn"
				class:active={viewMode === 'worktrees'}
				onclick={() => onViewModeChange?.('worktrees')}
				title="Worktrees view"
			>
				<WorktreeIcon />
			</button>
		</div>
	</div>

	<div class="search-sort">
		<div class="search-box">
			<input
				id="branch-search"
				type="text"
				placeholder="Search branches..."
				bind:value={searchTerm}
				oninput={(e) => onSearchChange(e.currentTarget.value)}
				class="search-input"
			/>
			<span class="search-icon">
				<SearchIcon />
			</span>
		</div>

		<div class="sort-box">
			<label for="sort-select" class="sort-label">Sort:</label>
			<select
				id="sort-select"
				bind:value={sortBy}
				onchange={(e) => onSortChange(e.currentTarget.value)}
				class="sort-select"
			>
				{#each sortOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<button class="fetch-btn" onclick={handleFetch} disabled={isFetching} title="Fetch all remotes">
			<DownloadIcon />
			{isFetching ? 'Fetching...' : 'Fetch'}
		</button>

		<button
			class="find-merged-btn"
			onclick={() => onFindMerged?.()}
			title="Find branches merged into target"
		>
			<MergeIcon />
			Find Merged
		</button>

		<button class="create-branch-btn" onclick={() => (showCreateForm = !showCreateForm)}>
			<PlusIcon />
			New Branch
		</button>
	</div>
</div>

{#if showCreateForm}
	<Dialog bind:open={showCreateForm} title="Create New Branch">
		<form
			{...createBranchForm.enhance(async ({ submit, form }) => {
				const branchName = (new FormData(form).get('name') as string) ?? '';
				await submit();
				form.reset();
				const issues = createBranchForm.fields?.allIssues() ?? [];
				if (issues.length === 0) {
					showCreateForm = false;
					createStartPoint = null;
					onBranchCreated?.(branchName);
				}
			})}
			oninput={() => createBranchForm.validate({ preflightOnly: true })}
		>
			<div class="dialog-form-group">
				<label for="branch-name">Branch Name:</label>
				<input
					{...createBranchForm.fields.name.as('text')}
					id="branch-name"
					placeholder="feature/new-feature"
					class="dialog-input"
				/>
				{#each createBranchForm.fields.name.issues() as issue (issue.message)}
					<p class="issue">{issue.message}</p>
				{/each}
			</div>

			<div class="dialog-form-group">
				<label for="start-point">Start From:</label>
				<select
					{...createBranchForm.fields.startPoint.as('select')}
					id="start-point"
					class="dialog-select"
				>
					{#if createStartPoint && createStartPoint !== targetBranch && createStartPoint !== 'HEAD'}
						<option value={createStartPoint}>{createStartPoint}</option>
					{/if}
					<option value={targetBranch}>{targetBranch}</option>
					<option value="HEAD">HEAD (current commit)</option>
				</select>
			</div>

			<div class="dialog-actions">
				<button
					type="button"
					onclick={() => {
						showCreateForm = false;
						createStartPoint = null;
					}}
					class="dialog-btn dialog-btn-cancel"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!!createBranchForm.pending ||
						(createBranchForm.fields?.name.issues()?.length ?? 0) > 0}
					class="dialog-btn dialog-btn-primary"
				>
					{createBranchForm.pending ? 'Creating...' : 'Create Branch'}
				</button>
			</div>
		</form>
	</Dialog>
{/if}

<style>
	.controls {
		background: var(--color-bg-surface);
		padding: 16px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		margin-bottom: 16px;
	}

	.filters {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.filter-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.filter-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-input);
	}

	.filter-btn.active {
		background: var(--color-accent-blue);
		color: var(--color-accent-blue-text);
		border-color: var(--color-accent-blue);
	}

	.filter-icon {
		font-size: 16px;
	}

	.filter-label {
		font-size: 13px;
		font-weight: 500;
	}

	.view-toggle {
		display: flex;
		gap: 4px;
		margin-left: auto;
	}

	.search-sort {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-box {
		position: relative;
		flex: 1;
		min-width: 200px;
		max-width: 400px;
	}

	.search-input {
		width: 100%;
		padding: 8px 12px 8px 36px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		font-size: 14px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px var(--color-focus-ring);
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-secondary);
		font-size: 14px;
	}

	.sort-box {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sort-label {
		font-size: 14px;
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.sort-select {
		padding: 8px 12px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		font-size: 14px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.sort-select:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px var(--color-focus-ring);
	}

	.fetch-btn {
		padding: 8px 16px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.fetch-btn:hover:not(:disabled) {
		background: var(--color-bg-hover);
		border-color: var(--color-border-input);
	}

	.fetch-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.find-merged-btn {
		padding: 8px 16px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.find-merged-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-input);
	}

	.create-branch-btn {
		padding: 8px 16px;
		background: var(--color-accent-green);
		color: var(--color-accent-green-text);
		border: 1px solid var(--color-accent-green);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.create-branch-btn:hover {
		background: var(--color-accent-green-hover);
		border-color: var(--color-accent-green-hover);
	}

	.repo-path-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		gap: 8px;
	}

	.repo-info {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text-secondary);
		min-width: 0;
		flex-wrap: wrap;
	}

	.config-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.config-separator {
		color: var(--color-border-input);
		user-select: none;
	}

	.repo-path {
		font-size: 12px;
		background: var(--color-bg-surface-secondary);
		padding: 2px 6px;
		border-radius: 4px;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.repo-invalid {
		color: var(--color-error-text);
		font-size: 12px;
		font-weight: 500;
	}

	.repo-worktree {
		color: var(--color-text-muted);
		font-size: 12px;
	}

	.repo-actions {
		flex-shrink: 0;
	}

	.edit-repo-btn {
		padding: 4px 10px;
		font-size: 12px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.edit-repo-btn:hover {
		background: var(--color-bg-hover);
		color: var(--color-text-primary);
	}

	.config-edit {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		flex: 1;
	}

	.config-edit-fields {
		display: flex;
		gap: 12px;
		flex: 1;
		flex-wrap: wrap;
	}

	.config-edit-label {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 160px;
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.config-edit-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.repo-edit {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.repo-input {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		font-size: 13px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
	}

	.repo-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px var(--color-focus-ring);
	}

	.save-repo-btn,
	.cancel-repo-btn {
		padding: 4px 10px;
		font-size: 12px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.save-repo-btn {
		background: var(--color-accent-blue);
		color: var(--color-accent-blue-text);
		border: 1px solid var(--color-accent-blue);
	}

	.cancel-repo-btn {
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border-input);
	}

	.cancel-repo-btn:hover {
		background: var(--color-bg-hover);
	}

	.issue {
		color: var(--color-error);
		font-size: 12px;
		margin-top: 4px;
	}

	.fetch-time {
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	.repo-select {
		padding: 3px 6px;
		border: 1px solid var(--color-border-input);
		border-radius: 4px;
		font-size: 12px;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		cursor: pointer;
	}
</style>
