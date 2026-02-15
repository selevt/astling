<script lang="ts">
  import { updateDescription } from '../../routes/branches/data.remote';

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

  // initialize empty and sync via effect to avoid capturing initial prop only
  let description = $state('');
  let isSubmitting = $state(false);

  let dialogEl: HTMLDialogElement | null = null;

  $effect(() => {
    // keep local description in sync when prop changes
    description = currentDescription || '';
  });

  async function handleSubmit() {
    if (isSubmitting) return;

    isSubmitting = true;
    try {
      await updateDescription({ branch: branchName, description });
      onSave();
    } catch (error) {
      console.error('Failed to update description:', error);
      alert(`Failed to update description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      isSubmitting = false;
    }
  }

  // open the native dialog when mounted
  // use lifecycle function from svelte
  import { onMount } from 'svelte';

  onMount(() => {
    if (dialogEl && typeof dialogEl.showModal === 'function') {
      try {
        dialogEl.showModal();
      } catch (e) {
        // some browsers may throw if already open — ignore
      }
    }
  });

  function handleCancel() {
    // close the dialog and notify parent
    if (dialogEl && !dialogEl.open) return;
    try {
      dialogEl?.close();
    } catch (e) {}
    onCancel();
  }

  function handleDialogCancel(event: Event) {
    // the native 'cancel' event represents Escape or .close() behavior
    event.preventDefault();
    onCancel();
  }
</script>

<dialog bind:this={dialogEl} oncancel={handleDialogCancel} class="modal-dialog">
  <form method="dialog" class="modal-content" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <header class="modal-header">
      <h3>Edit Description for {branchName}</h3>
      <button type="button" class="close-btn" onclick={handleCancel}>✕</button>
    </header>

    <div class="form-body">
      <label for="description">Description</label>
      <textarea
        id="description"
        bind:value={description}
        placeholder="Add a description for this branch..."
        rows={4}
        class="description-textarea"
      ></textarea>
      <div class="description-help">{description.length}/200 characters</div>
    </div>

    <footer class="form-actions">
      <button type="button" class="btn-cancel" onclick={handleCancel}>Cancel</button>
      <button type="submit" disabled={isSubmitting} class="btn-save">{isSubmitting ? 'Saving...' : 'Save'}</button>
    </footer>
  </form>
</dialog>

<style>
  dialog.modal-dialog {
    border: none;
    padding: 0;
    background: transparent;
  }

  .modal-content {
    background: var(--color-bg-surface);
    border-radius: 8px;
    box-shadow: 0 10px 25px var(--color-shadow-modal);
    min-width: 400px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--color-border);
  }

  .form-body {
    padding: 20px;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 4px;
    border-radius: 4px;
  }

  .description-textarea {
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

  .description-help {
    margin-top: 4px;
    font-size: 12px;
    color: var(--color-text-secondary);
    text-align: right;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid var(--color-border);
  }

  .btn-cancel, .btn-save {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-cancel {
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-input);
  }

  .btn-save {
    background: var(--color-accent-green);
    color: white;
    border: 1px solid var(--color-accent-green);
  }
</style>
