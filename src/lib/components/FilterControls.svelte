<script lang="ts">
	import {
		getRepoPath,
		setRepoPath,
		setTargetBranch,
		createBranch
	} from '../../routes/branches/data.remote';
	import { createBranchSchema } from '$lib/schemas/branch';
	import { onMount } from 'svelte';
	import Dialog from './Dialog.svelte';
	import GitBranchIcon from '$lib/icons/GitBranchIcon.svelte';
	import StarIcon from '$lib/icons/StarIcon.svelte';
	import SearchIcon from '$lib/icons/SearchIcon.svelte';
	import MergeIcon from '$lib/icons/MergeIcon.svelte';
	import PlusIcon from '$lib/icons/PlusIcon.svelte';
	import ListIcon from '$lib/icons/ListIcon.svelte';
	import TreeIcon from '$lib/icons/TreeIcon.svelte';

	// Props
	let {
		currentFilter,
		searchTerm,
		sortBy,
		onFilterChange,
		onSearchChange,
		onSortChange,
		getTargetBranch,
		onFindMerged,
		showCreateForm = $bindable(false),
		createStartPoint = $bindable<string | null>(null),
		totalBranches = 0,
		starredCount = 0,
		viewMode = 'list' as 'list' | 'tree',
		onViewModeChange
	}: {
		currentFilter: string;
		searchTerm: string;
		sortBy: string;
		onFilterChange: (filter: string) => void;
		onSearchChange: (term: string) => void;
		onSortChange: (sort: string) => void;
		getTargetBranch: () => Promise<string>;
		onFindMerged?: () => void;
		showCreateForm?: boolean;
		createStartPoint?: string | null;
		totalBranches?: number;
		starredCount?: number;
		viewMode?: 'list' | 'tree';
		onViewModeChange?: (mode: 'list' | 'tree') => void;
	} = $props();

	let newBranchName = $state('');
	let newBranchStart = $state('HEAD');
	let isCreating = $state(false);

	let repoPathInfo: { path: string; valid: boolean } | null = $state(null);
	let newRepoPath = $state('');

	let targetBranch = $state('main');
	let newTargetBranch = $state('');

	let editingConfig = $state(false);

	let createBranchForm = $derived(createBranch.preflight(createBranchSchema));

	$effect(() => {
		if (showCreateForm && createStartPoint) {
			createBranchForm.fields.startPoint.set(createStartPoint);
		} else {
			createBranchForm.fields.startPoint.set(targetBranch);
		}
	});

	async function refreshRepoInfo() {
		try {
			const data = await getRepoPath();
			repoPathInfo = { path: data.path, valid: data.valid };
			newRepoPath = repoPathInfo.path ?? '';
		} catch (err) {
			console.error('refreshRepoInfo error', err);
			repoPathInfo = { path: '', valid: false };
			newRepoPath = '';
		}
	}

	// Load initial repo info on mount
	onMount(async () => {
		refreshRepoInfo();
		try {
			const tb = await getTargetBranch();
			targetBranch = tb;
			newTargetBranch = tb;
			newBranchStart = tb;
		} catch (err) {
			console.error('Failed to fetch target branch:', err);
		}
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
			targetBranch = newTargetBranch.trim();
		} catch (err) {
			alert(`Failed to set target branch: ${err instanceof Error ? err.message : String(err)}`);
			branchOk = false;
		}

		if (repoOk) {
			await refreshRepoInfo();
		}

		if (repoOk && branchOk) {
			editingConfig = false;
		}
	}

	function cancelConfig() {
		editingConfig = false;
		newRepoPath = repoPathInfo?.path ?? '';
		newTargetBranch = targetBranch;
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
			</div>
			<div class="repo-actions">
				<button class="edit-repo-btn" onclick={() => { editingConfig = true; }}>Change</button>
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
				await submit();
				form.reset();
				const issues = createBranchForm.fields?.allIssues() ?? [];
				if (issues.length === 0) {
					showCreateForm = false;
					createStartPoint = null;
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
</style>
