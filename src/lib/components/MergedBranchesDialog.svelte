<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { findMergedBranches, deleteMergedBranches } from '../../routes/branches/data.remote';
  import Dialog from './Dialog.svelte';

  let {
    open = $bindable(false),
    onComplete
  }: {
    open?: boolean;
    onComplete?: () => void;
  } = $props();

  type Phase = 'scanning' | 'results' | 'deleting' | 'done';

  let phase: Phase = $state('scanning');
  let branches: string[] = $state([]);
  let selected = new SvelteSet<string>();
  let error: string | null = $state(null);
  let result: { deleted: string[]; failed: Array<{ branch: string; error: string }> } | null = $state(null);

  let selectedCount = $derived(selected.size);
  let allSelected = $derived(selected.size === branches.length && branches.length > 0);

  $effect(() => {
    if (open) {
      phase = 'scanning';
      branches = [];
      selected.clear();
      error = null;
      result = null;
      scan();
    }
  });

  async function scan() {
    try {
      const found = await findMergedBranches();
      branches = found;
      for (const b of found) selected.add(b);
      phase = 'results';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      phase = 'results';
    }
  }

  function toggleAll() {
    if (allSelected) {
      selected.clear();
    } else {
      for (const b of branches) selected.add(b);
    }
  }

  function toggleBranch(branch: string) {
    if (selected.has(branch)) {
      selected.delete(branch);
    } else {
      selected.add(branch);
    }
  }

  async function handleDelete() {
    phase = 'deleting';
    try {
      result = await deleteMergedBranches([...selected]);
      phase = 'done';
      setTimeout(() => {
        open = false;
        onComplete?.();
      }, 1500);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      phase = 'results';
    }
  }
</script>

<Dialog bind:open={open} title="Merged Branch Cleanup">
  {#if phase === 'scanning'}
    <div class="scanning">
      <div class="spinner"></div>
      <p>Scanning for merged branches...</p>
    </div>
  {:else if phase === 'results'}
    {#if error}
      <p class="error-msg">{error}</p>
    {:else if branches.length === 0}
      <p class="empty-msg">No merged branches found — nothing to clean up.</p>
    {:else}
      <div class="branch-list">
        <label class="branch-row toggle-all" >
          <input type="checkbox" checked={allSelected} onchange={toggleAll} />
          <span class="toggle-all-label">
            {allSelected ? 'Deselect all' : 'Select all'} ({branches.length} branch{branches.length === 1 ? '' : 'es'})
          </span>
        </label>
        <div class="branch-items">
          {#each branches as branch (branch)}
            <label class="branch-row">
              <input type="checkbox" checked={selected.has(branch)} onchange={() => toggleBranch(branch)} />
              <span class="branch-name">{branch}</span>
            </label>
          {/each}
        </div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="dialog-btn dialog-btn-cancel" onclick={() => (open = false)}>
          Cancel
        </button>
        <button
          type="button"
          class="dialog-btn btn-delete"
          disabled={selectedCount === 0}
          onclick={handleDelete}
        >
          Delete {selectedCount} branch{selectedCount === 1 ? '' : 'es'}
        </button>
      </div>
    {/if}
  {:else if phase === 'deleting'}
    <div class="scanning">
      <div class="spinner"></div>
      <p>Deleting {selectedCount} branch{selectedCount === 1 ? '' : 'es'}...</p>
    </div>
  {:else if phase === 'done'}
    <div class="done-summary">
      {#if result}
        <p class="success-msg">{result.deleted.length} deleted{result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}</p>
      {/if}
    </div>
  {/if}
</Dialog>

<style>
  .scanning {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 0;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .scanning p {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .error-msg {
    color: var(--color-error-text);
    font-size: 14px;
  }

  .empty-msg {
    font-size: 14px;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 16px 0;
  }

  .branch-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .toggle-all {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 8px;
    margin-bottom: 4px;
  }

  .toggle-all-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .branch-items {
    max-height: 300px;
    overflow-y: auto;
  }

  .branch-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-text-primary);
  }

  .branch-row:hover {
    background: var(--color-bg-hover);
  }

  .branch-name {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
  }

  .btn-delete {
    background: var(--color-error-text);
    color: var(--color-error-btn-text, #fff);
    border: 1px solid var(--color-error-text);
  }

  .btn-delete:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .btn-delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .done-summary {
    text-align: center;
    padding: 24px 0;
  }

  .success-msg {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-accent-green, #4a4);
  }
</style>
