<script lang="ts">
import { createBranch, getRepoPath, setRepoPath } from '../../routes/branches/data.remote';
import { onMount } from 'svelte';
import Dialog from './Dialog.svelte';
	
	// Props
	let { 
		currentFilter, 
		searchTerm, 
		sortBy,
		onFilterChange,
		onSearchChange,
		onSortChange,
		onCreateBranch
	}: {
		currentFilter: string;
		searchTerm: string;
		sortBy: string;
		onFilterChange: (filter: string) => void;
		onSearchChange: (term: string) => void;
		onSortChange: (sort: string) => void;
		onCreateBranch?: (name: string) => void;
	} = $props();
	
	let showCreateForm = $state(false);
	let newBranchName = $state('');
	let newBranchStart = $state('HEAD');
	let isCreating = $state(false);

	let repoPathInfo: { path: string; valid: boolean } | null = $state(null);
	let editingRepoPath = $state(false);
	let newRepoPath = $state('');

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
    onMount(() => {
        refreshRepoInfo();
    });

    async function saveRepoPath() {
        try {
            await setRepoPath(newRepoPath.trim());
            editingRepoPath = false;
            await refreshRepoInfo();
        } catch (err) {
            alert(`Failed to set repo path: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
	
	const filters = [
		{ value: 'all', label: 'All Branches', icon: '🌳' },
		{ value: 'starred', label: 'Starred', icon: '⭐' }
	];
	
	const sortOptions = [
		{ value: 'name', label: 'Name' },
		{ value: 'recent', label: 'Recently Used' },
		{ value: 'date', label: 'Last Commit' }
	];
	
	async function handleCreateBranch() {
		if (!newBranchName.trim() || isCreating) return;
		
		isCreating = true;
		try {
			await createBranch({ name: newBranchName.trim(), startPoint: newBranchStart });
			newBranchName = '';
			showCreateForm = false;
			onCreateBranch?.(newBranchName.trim());
		} catch (error) {
			console.error('Failed to create branch:', error);
			alert(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isCreating = false;
		}
	}
	
	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showCreateForm = false;
			newBranchName = '';
		}
	}
	
	$effect(() => {
		if (showCreateForm) {
			document.addEventListener('keydown', handleKeyPress);
		} else {
			document.removeEventListener('keydown', handleKeyPress);
		}
		
		return () => {
			document.removeEventListener('keydown', handleKeyPress);
		};
	});
</script>

<div class="controls">
    <div class="repo-path-row">
        {#if repoPathInfo !== null}
            {#if !editingRepoPath}
                <div class="repo-info">
                    <small>Repo:</small>
                    <code class="repo-path">{repoPathInfo?.path ?? ''}</code>
                    {#if !repoPathInfo?.valid}
                        <span class="repo-invalid">(not a git repo)</span>
                    {/if}
                </div>
                <div class="repo-actions">
                    <button class="edit-repo-btn" onclick={() => { editingRepoPath = true; }}>Change</button>
                </div>
            {:else}
                <div class="repo-edit">
                    <input type="text" bind:value={newRepoPath} class="repo-input" />
                    <button class="save-repo-btn" onclick={saveRepoPath}>Save</button>
                    <button class="cancel-repo-btn" onclick={() => { editingRepoPath = false; newRepoPath = repoPathInfo?.path ?? ''; }}>Cancel</button>
                </div>
            {/if}
        {/if}
    </div>
	<div class="filters">
		{#each filters as filter}
			<button
				class="filter-btn"
				class:active={currentFilter === filter.value}
				onclick={() => onFilterChange(filter.value)}
				title={filter.label}
			>
				<span class="filter-icon">{filter.icon}</span>
				<span class="filter-label">{filter.label}</span>
			</button>
		{/each}
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
			<span class="search-icon">🔍</span>
		</div>
		
		<div class="sort-box">
			<label for="sort-select" class="sort-label">Sort:</label>
			<select
				id="sort-select"
				bind:value={sortBy}
				onchange={(e) => onSortChange(e.currentTarget.value)}
				class="sort-select"
			>
				{#each sortOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		
		<button
			class="create-branch-btn"
			onclick={() => showCreateForm = !showCreateForm}
		>
			➕ New Branch
		</button>
	</div>
</div>

{#if showCreateForm}
	<Dialog bind:open={showCreateForm} title="Create New Branch">
		<form onsubmit={(e) => { e.preventDefault(); handleCreateBranch(); }}>
			<div class="dialog-form-group">
				<label for="branch-name">Branch Name:</label>
				<input
					id="branch-name"
					type="text"
					bind:value={newBranchName}
					placeholder="feature/new-feature"
					required
					class="dialog-input"
				/>
			</div>
			
			<div class="dialog-form-group">
				<label for="start-point">Start From:</label>
				<select
					id="start-point"
					bind:value={newBranchStart}
					class="dialog-select"
				>
					<option value="HEAD">HEAD (current commit)</option>
					<option value="main">main</option>
					<option value="master">master</option>
					<option value="develop">develop</option>
				</select>
			</div>
			
			<div class="dialog-actions">
				<button
					type="button"
					onclick={() => showCreateForm = false}
					class="dialog-btn dialog-btn-cancel"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!newBranchName.trim() || isCreating}
					class="dialog-btn dialog-btn-primary"
				>
					{isCreating ? 'Creating...' : 'Create Branch'}
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
		color: white;
		border-color: var(--color-accent-blue);
	}

	.filter-icon {
		font-size: 16px;
	}

	.filter-label {
		font-size: 13px;
		font-weight: 500;
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

	.create-branch-btn {
		padding: 8px 16px;
		background: var(--color-accent-green);
		color: white;
		border: 1px solid var(--color-accent-green);
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
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

	.save-repo-btn, .cancel-repo-btn {
		padding: 4px 10px;
		font-size: 12px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.save-repo-btn {
		background: var(--color-accent-blue);
		color: white;
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
</style>
