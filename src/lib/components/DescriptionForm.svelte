<script lang="ts">
	import { updateDescription } from '../../routes/branches/data.remote';
	import Dialog from '$lib/components/Dialog.svelte';

	let {
		branchName,
		currentDescription,
		onSave,
		onCancel
	}: {
		branchName: string;
		currentDescription?: string;
		onSave: () => void;
		onCancel: () => void;
	} = $props();

	let description = $state('');
	let isSubmitting = $state(false);
	let open = $state(true);

	$effect(() => {
		description = currentDescription || '';
	});

	async function handleSubmit() {
		if (isSubmitting) return;

		isSubmitting = true;
		try {
			await updateDescription({ branch: branchName, description });
			onSave();
			open = false;
		} catch (error) {
			console.error('Failed to update description:', error);
			alert(
				`Failed to update description: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		onCancel();
	}
</script>

<Dialog bind:open onClose={handleClose} title="Edit Description for {branchName}">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="dialog-form-group">
			<label for="description">Description</label>
			<textarea
				id="description"
				bind:value={description}
				placeholder="Add a description for this branch..."
				rows={4}
				class="dialog-textarea"
			></textarea>
			<div class="description-help">{description.length}/200 characters</div>
		</div>

		<div class="dialog-actions">
			<button type="button" class="dialog-btn dialog-btn-cancel" onclick={handleClose}
				>Cancel</button
			>
			<button type="submit" disabled={isSubmitting} class="dialog-btn dialog-btn-primary">
				{isSubmitting ? 'Saving...' : 'Save'}
			</button>
		</div>
	</form>
</Dialog>

<style>
	.dialog-textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		font-size: 14px;
		font-family: inherit;
		resize: vertical;
		min-height: 100px;
		box-sizing: border-box;
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
	}

	.dialog-textarea:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px var(--color-focus-ring);
	}

	.description-help {
		margin-top: 4px;
		font-size: 12px;
		color: var(--color-text-secondary);
		text-align: right;
	}
</style>
