<script lang="ts">
	import Dialog from './Dialog.svelte';

	let {
		open = $bindable(false),
		dirPath,
		branches,
		skippedCurrent,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		dirPath: string;
		branches: string[];
		skippedCurrent: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	let visibleBranches = $derived(branches.length <= 6 ? branches : branches.slice(0, 5));
	let extraCount = $derived(branches.length > 6 ? branches.length - 5 : 0);

	function handleCancel() {
		open = false;
		onCancel();
	}

	function handleConfirm() {
		open = false;
		onConfirm();
	}
</script>

<Dialog bind:open onClose={handleCancel} title="Delete Directory Branches">
	{#if branches.length === 0}
		<p class="delete-confirm-message">
			No branches to delete (current branch is the only branch here).
		</p>
	{:else}
		<p class="delete-confirm-message">
			Delete all {branches.length} branch{branches.length === 1 ? '' : 'es'} in '{dirPath}'? This
			cannot be undone.
		</p>
	{/if}

	<ul class="branch-list">
		{#each visibleBranches as branch (branch)}
			<li>{branch}</li>
		{/each}
		{#if extraCount > 0}
			<li class="branch-list-more">+ {extraCount} more</li>
		{/if}
	</ul>

	{#if skippedCurrent}
		<p class="skipped-current-note">The current branch will not be deleted.</p>
	{/if}

	<div class="delete-actions">
		<button type="button" class="delete-btn" onclick={handleCancel}>Cancel</button>
		<button
			type="button"
			class="delete-btn delete-btn-danger"
			onclick={handleConfirm}
			disabled={branches.length === 0}
		>
			Delete
		</button>
	</div>
</Dialog>

<style>
	.delete-confirm-message {
		margin: 0 0 16px 0;
		font-size: 14px;
		color: var(--color-text-primary);
		line-height: 1.5;
	}

	.branch-list {
		margin: 0 0 16px 0;
		padding: 12px 12px 12px 28px;
		background: var(--color-bg-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		list-style: disc;
	}

	.branch-list li {
		font-family: monospace;
		font-size: 13px;
		color: var(--color-text-primary);
		line-height: 1.6;
	}

	.branch-list-more {
		font-family: monospace;
		font-size: 13px;
		color: var(--color-text-secondary);
		list-style: none;
		margin-left: -4px;
	}

	.skipped-current-note {
		margin: 0 0 16px 0;
		font-size: 13px;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.delete-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.delete-btn {
		padding: 8px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-input);
		transition: all 0.2s ease;
	}

	.delete-btn:hover {
		background: var(--color-bg-hover);
	}

	.delete-btn-danger {
		background: var(--color-error-bg);
		color: var(--color-error-text);
		border-color: var(--color-error-border);
	}

	.delete-btn-danger:hover:not(:disabled) {
		background: var(--color-error-text);
		color: white;
	}

	.delete-btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
