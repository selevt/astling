<script lang="ts">
	import { renameBranch } from '../../routes/branches/data.remote';
	import Dialog from '$lib/components/Dialog.svelte';

	let {
		branchName,
		onSave,
		onCancel,
		onError
	}: {
		branchName: string;
		onSave: () => void;
		onCancel: () => void;
		onError?: (message: string) => void;
	} = $props();

	let newName = $state('');
	let isSubmitting = $state(false);
	let open = $state(true);

	$effect(() => {
		newName = branchName;
	});

	let isValid = $derived(newName.trim() !== '' && newName.trim() !== branchName);

	async function handleSubmit() {
		if (isSubmitting || !isValid) return;
		isSubmitting = true;
		try {
			await renameBranch({ oldName: branchName, newName: newName.trim() });
			onSave();
			open = false;
		} catch (error) {
			const message = `Failed to rename branch: ${error instanceof Error ? error.message : 'Unknown error'}`;
			if (onError) {
				onError(message);
			} else {
				alert(message);
			}
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		onCancel();
	}
</script>

<Dialog bind:open onClose={handleClose} title="Rename Branch">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="dialog-form-group">
			<label for="new-branch-name">New Name</label>
			<input id="new-branch-name" bind:value={newName} class="dialog-input" type="text" />
		</div>
		<div class="dialog-actions">
			<button type="button" class="dialog-btn dialog-btn-cancel" onclick={handleClose}
				>Cancel</button
			>
			<button
				type="submit"
				disabled={isSubmitting || !isValid}
				class="dialog-btn dialog-btn-primary"
			>
				{isSubmitting ? 'Renaming...' : 'Rename'}
			</button>
		</div>
	</form>
</Dialog>
