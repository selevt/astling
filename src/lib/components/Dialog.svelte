<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    onClose,
    children,
    title
  }: {
    open?: boolean;
    onClose?: () => void;
    children: Snippet;
    title?: string;
  } = $props();

  let dialogEl: HTMLDialogElement | null = $state(null);

  $effect(() => {
    if (open && dialogEl && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl && dialogEl.open) {
      dialogEl.close();
    }
  });

  $effect(() => {
    if (open && dialogEl?.open) {
      const firstInput = dialogEl.querySelector('input, select, textarea');
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }
    }
  });

  function handleCancel(e: Event) {
    e.preventDefault();
    open = false;
    onClose?.();
  }

  function handleClose(e: Event) {
    if (e.target === dialogEl) {
      open = false;
      onClose?.();
    }
  }

  function handleCloseButton() {
    open = false;
    onClose?.();
  }
</script>

<dialog
  bind:this={dialogEl}
  oncancel={handleCancel}
  onclick={handleClose}
  class="dialog"
>
  <div class="dialog-content">
    {#if title}
      <header class="dialog-header">
        <h3>{title}</h3>
        <button type="button" class="dialog-close" onclick={handleCloseButton}>✕</button>
      </header>
    {/if}
    <div class="dialog-body">
      {@render children()}
    </div>
  </div>
</dialog>

<style>
  :global(dialog.dialog) {
    border: none;
    padding: 0;
    background: transparent;
    color: inherit;
  }

  :global(dialog.dialog::backdrop) {
    background: var(--color-overlay);
  }

  .dialog-content {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    box-shadow: 0 10px 25px var(--color-shadow-modal);
    min-width: 400px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border);
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .dialog-close {
    background: none;
    border: 1px solid var(--color-border-input);
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    color: var(--color-text-secondary);
    padding: 4px 10px;
  }

  .dialog-close:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .dialog-body {
    padding: 20px 24px;
  }

  :global(.dialog-form-group) {
    margin-bottom: 16px;
  }

  :global(.dialog-form-group label) {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  :global(.dialog-input),
  :global(.dialog-select),
  :global(.dialog-textarea) {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border-input);
    border-radius: 6px;
    font-size: 14px;
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
    box-sizing: border-box;
  }

  :global(.dialog-input:focus),
  :global(.dialog-select:focus),
  :global(.dialog-textarea:focus) {
    outline: none;
    border-color: var(--color-accent-blue);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }

  :global(.dialog-actions) {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 16px 24px;
    border-top: 1px solid var(--color-border);
  }

  :global(.dialog-btn) {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.dialog-btn-cancel) {
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-input);
  }

  :global(.dialog-btn-primary) {
    background: var(--color-accent-green);
    color: white;
    border: 1px solid var(--color-accent-green);
  }

  :global(.dialog-btn-primary:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
