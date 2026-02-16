<script lang="ts">
	import Dialog from './Dialog.svelte';

	let {
		open = $bindable(false),
		branchName,
		errorMessage = null,
		onConfirm,
		onForceDelete,
		onCancel
	}: {
		open?: boolean;
		branchName: string;
		errorMessage?: string | null;
		onConfirm: () => void;
		onForceDelete: () => void;
		onCancel: () => void;
	} = $props();

	let title = $derived(errorMessage ? 'Delete Failed' : 'Delete Branch');

	function handleCancel() {
		open = false;
		onCancel();
	}

	function handleConfirm() {
		open = false;
		onConfirm();
	}

	function handleForceDelete() {
		open = false;
		onForceDelete();
	}
</script>

<Dialog bind:open onClose={handleCancel} {title}>
	{#if errorMessage}
		<pre class="delete-error-message">{errorMessage}</pre>
	{:else}
		<p class="delete-confirm-message">
			Are you sure you want to delete branch <strong>'{branchName}'</strong>?
		</p>
	{/if}
	<div class="delete-actions">
		<button type="button" class="delete-btn" onclick={handleCancel}>Cancel</button>
		{#if errorMessage}
			<button type="button" class="delete-btn delete-btn-danger" onclick={handleForceDelete}>
				Force Delete
			</button>
		{:else}
			<button type="button" class="delete-btn delete-btn-danger" onclick={handleConfirm}>
				Delete
			</button>
		{/if}
	</div>
</Dialog>

<style>
	.delete-confirm-message {
		margin: 0 0 20px 0;
		font-size: 14px;
		color: var(--color-text-primary);
		line-height: 1.5;
	}

	.delete-error-message {
		margin: 0 0 20px 0;
		padding: 12px;
		background: var(--color-bg-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		font-family: monospace;
		font-size: 13px;
		color: var(--color-error-text);
		white-space: pre-wrap;
		word-break: break-word;
		line-height: 1.4;
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

	.delete-btn-danger:hover {
		background: var(--color-error-text);
		color: white;
	}

</style>
