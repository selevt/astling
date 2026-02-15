<script lang="ts">
  	import { checkoutBranch, toggleStar, deleteBranch, updateDescription, getBranches, getStarredBranches, getBranch, getStats, getRecentCommits } from '../../routes/branches/data.remote';
	import DescriptionForm from './DescriptionForm.svelte';
	import type { BranchWithMetadata } from '$lib/server/git/types';

	function getErrorMessage(err: unknown): string {
		if (err && typeof err === 'object' && 'message' in err) {
			return String(err.message);
		}
		return String(err);
	}

	let {
		branch,
		selected = false,
		onCheckout,
		onToggleStar,
		onDelete,
		onEditComplete,
		onError,
		showDescriptionForm = false
	}: {
		branch: BranchWithMetadata;
		selected?: boolean;
		onCheckout?: (name: string) => void;
		onToggleStar?: (name: string) => void;
		onDelete?: (name: string) => void;
		onEditComplete?: () => void;
		onError?: (message: string) => void;
		showDescriptionForm?: boolean;
	} = $props();
	let showDescription = $state(false);
	let isLoading = $state(false);
	
	async function handleCheckout() {
		if (isLoading) return;
		isLoading = true;

		try {
			const result = await checkoutBranch(branch.name);
			if (!result.success) {
				onError?.(result.error);
				onCheckout?.(branch.name);
				return;
			}
			onCheckout?.(branch.name);
		} catch (error) {
			console.error('Failed to checkout:', error);
			onError?.(getErrorMessage(error));
		} finally {
			isLoading = false;
		}
	}
	
	async function handleToggleStar(event: MouseEvent) {
		event.stopPropagation();

		try {
			// Request server-side updates for relevant queries after the command completes
			// Use client-driven updates without optimistic overrides so the UI refreshes
			const result = await toggleStar(branch.name).updates(
				getBranches(),
				getStarredBranches(),
				getBranch(branch.name)
			);

		// Update the local branch object with the server result so the UI updates
		if (result && typeof result.starred === 'boolean') {
			// Re-assign the branch object so Svelte reactivity picks up the change
			branch = { ...branch, starred: result.starred };
			// notify parent to refresh lists that are derived from cached queries
			onToggleStar?.(branch.name);
		}
		} catch (error) {
			console.error('Failed to toggle star:', error);
			alert(`Failed to toggle star: ${getErrorMessage(error)}`);
		}
	}
	
	async function handleDelete(event: MouseEvent) {
		event.stopPropagation();
		
		if (!confirm(`Are you sure you want to delete branch '${branch.name}'?`)) {
			return;
		}
		
		try {
			await deleteBranch({ branch: branch.name, force: false, remote: false });
			onDelete?.(branch.name);
		} catch (error) {
			console.error('Failed to delete branch:', error);
			alert(`Failed to delete branch: ${getErrorMessage(error)}`);
		}
	}
	
	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'Never';
		
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) {
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			if (diffHours === 0) {
				const diffMins = Math.floor(diffMs / (1000 * 60));
				return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
			}
			return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	}
	
	function getAheadBehindText(): string {
		if (branch.ahead && branch.behind) {
			return `↑${branch.ahead} ↓${branch.behind}`;
		} else if (branch.ahead) {
			return `↑${branch.ahead}`;
		} else if (branch.behind) {
			return `↓${branch.behind}`;
		}
		return '';
	}
	
	function handleEditDescription() {
		showDescriptionForm = true;
	}
	
	function handleSaveDescription() {
		showDescriptionForm = false;
		showDescription = true;
		onEditComplete?.();
	}
	
	function handleCancelDescription() {
		showDescriptionForm = false;
		onEditComplete?.();
	}
</script>

<div class="branch-card" class:current={branch.current} class:selected data-branch={branch.name}>
	<div class="branch-header">
		<div class="branch-info">
			<h3 class="branch-name">
				{branch.name}
				{#if branch.current}
					<span class="current-badge">current</span>
				{/if}
			</h3>
			<div class="branch-meta">
				<span class="author">{branch.author}</span>
				<span class="date">{formatDate(branch.lastCheckedOut)}</span>
				{#if getAheadBehindText()}
					<span class="ahead-behind">{getAheadBehindText()}</span>
				{/if}
			</div>
		</div>
		<div class="branch-actions">
			<button 
				class="star-btn" 
				class:starred={branch.starred}
				onclick={handleToggleStar}
				title={branch.starred ? 'Unstar branch' : 'Star branch'}
			>
				{branch.starred ? '⭐' : '☆'}
			</button>
			<button 
				class="checkout-btn" 
				class:loading={isLoading}
				class:current={branch.current}
				onclick={handleCheckout}
				disabled={branch.current || isLoading}
				title={branch.current ? 'Already on this branch' : 'Checkout branch'}
			>
				{isLoading ? '...' : branch.current ? 'Active' : 'Checkout'}
			</button>
			<button 
				class="delete-btn" 
				onclick={handleDelete}
				disabled={branch.current}
				title={branch.current ? 'Cannot delete current branch' : 'Delete branch'}
			>
				🗑️
			</button>
		</div>
	</div>
	
	<div class="commit-info">
		<p class="commit-message">{branch.message}</p>
		<span class="commit-hash">{branch.hash.slice(0, 8)}</span>
	</div>
	
	<div class="description-section">
		<button 
			class="description-toggle"
			onclick={() => branch.description ? (showDescription = !showDescription) : handleEditDescription()}
		>
			📝 {branch.description ? (showDescription ? 'Hide' : 'Edit') : 'Add'} Description
		</button>
		{#if branch.description && showDescription}
			<p class="description">{branch.description}</p>
		{/if}
	</div>
	
	{#if showDescriptionForm}
		<DescriptionForm
			branchName={branch.name}
			currentDescription={branch.description}
			onSave={handleSaveDescription}
			onCancel={handleCancelDescription}
		/>
	{/if}
</div>

<style>
	.branch-card {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 12px;
		background: var(--color-bg-surface);
		transition: all 0.2s ease;
	}

	.branch-card:hover {
		border-color: var(--color-accent-blue);
		box-shadow: 0 2px 8px var(--color-shadow);
	}

	.branch-card.current {
		border-color: var(--color-accent-green);
		background: var(--color-bg-current-branch);
	}

	.branch-card.selected {
		border-color: var(--color-accent-blue);
		background: var(--color-bg-hover);
	}

	.branch-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12px;
	}

	.branch-info {
		flex: 1;
		min-width: 0;
	}

	.branch-name {
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.current-badge {
		font-size: 10px;
		font-weight: 500;
		color: white;
		background: var(--color-accent-green);
		padding: 2px 6px;
		border-radius: 12px;
		text-transform: uppercase;
	}

	.branch-meta {
		display: flex;
		gap: 12px;
		font-size: 12px;
		color: var(--color-text-secondary);
		flex-wrap: wrap;
	}

	.ahead-behind {
		color: var(--color-accent-blue);
		font-weight: 500;
	}

	.branch-actions {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.star-btn, .checkout-btn, .delete-btn {
		padding: 6px 12px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		background: var(--color-bg-surface);
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s ease;
		min-width: 32px;
		text-align: center;
	}

	.star-btn {
		width: 36px;
		height: 32px;
		padding: 0;
		line-height: 1;
	}

	.star-btn:hover, .checkout-btn:hover, .delete-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-input);
	}

	.star-btn.starred {
		background: var(--color-star-bg);
		border-color: var(--color-accent-star);
		color: var(--color-accent-star);
	}

	.checkout-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.checkout-btn.current {
		background: var(--color-accent-green);
		color: white;
		border-color: var(--color-accent-green);
	}

	.checkout-btn.loading {
		animation: pulse 1.5s infinite;
	}

	.delete-btn {
		color: var(--color-error-text);
		border-color: var(--color-error-border);
	}

	.delete-btn:hover:not(:disabled) {
		background: var(--color-error-bg);
		border-color: var(--color-error-text);
	}

	.delete-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.commit-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.commit-message {
		margin: 0;
		font-size: 14px;
		color: var(--color-text-primary);
		font-style: italic;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.commit-hash {
		font-family: monospace;
		font-size: 12px;
		color: var(--color-text-secondary);
		background: var(--color-bg-surface-secondary);
		padding: 2px 6px;
		border-radius: 4px;
		margin-left: 8px;
	}

	.description-section {
		margin-top: 12px;
	}

	.description-toggle {
		background: none;
		border: none;
		color: var(--color-accent-blue);
		cursor: pointer;
		font-size: 12px;
		padding: 4px 0;
		text-decoration: underline;
	}

	.description-toggle:hover {
		color: var(--color-accent-blue-hover);
	}

	.description {
		margin: 8px 0 0 0;
		padding: 8px;
		background: var(--color-bg-surface-secondary);
		border-left: 3px solid var(--color-accent-blue);
		border-radius: 4px;
		font-size: 14px;
		color: var(--color-text-primary);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
</style>
