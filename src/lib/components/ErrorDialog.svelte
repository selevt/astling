<script lang="ts">
	import Dialog from './Dialog.svelte';

	let {
		open = $bindable(false),
		title = 'Error',
		message,
		onClose,
		onResolve
	}: {
		open?: boolean;
		title?: string;
		message: string;
		onClose?: () => void;
		onResolve?: (action: string) => void;
	} = $props();

	function handleClose() {
		open = false;
		onClose?.();
	}

	function handleResolve(action: string) {
		open = false;
		onResolve?.(action);
	}
</script>

<Dialog bind:open onClose={handleClose} {title}>
	<pre class="error-message">{message}</pre>
	<div class="error-actions">
		<button type="button" class="error-btn" onclick={handleClose}>Cancel</button>
		{#if onResolve}
			<button
				type="button"
				class="error-btn error-btn-discard"
				onclick={() => handleResolve('discard')}
			>
				Discard Changes
			</button>
		{/if}
	</div>
</Dialog>

<style>
	.error-message {
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

	.error-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.error-btn {
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

	.error-btn:hover {
		background: var(--color-bg-hover);
	}

	.error-btn-discard {
		background: var(--color-error-bg);
		color: var(--color-error-text);
		border-color: var(--color-error-border);
	}

	.error-btn-discard:hover {
		background: var(--color-error-text);
		color: white;
	}
</style>
