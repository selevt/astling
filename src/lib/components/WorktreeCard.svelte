<script lang="ts">
	import type { GitWorktree } from '$lib/server/git/types';

	let {
		worktree,
		selected = false,
		onSelect
	}: {
		worktree: GitWorktree;
		selected?: boolean;
		onSelect?: (path: string) => void;
	} = $props();

	function abbreviatePath(path: string): string {
		return path.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
	}
</script>

<div
	class="worktree-card"
	class:selected
	role="button"
	tabindex="0"
	data-worktree={worktree.path}
	onclick={() => onSelect?.(worktree.path)}
	onkeydown={(e) => e.key === 'Enter' && onSelect?.(worktree.path)}
>
	<div class="worktree-header">
		<span class="badge" class:badge-main={worktree.isMain} class:badge-linked={!worktree.isMain}>
			{worktree.isMain ? 'main' : 'linked'}
		</span>
		{#if worktree.branch !== null}
			<code class="branch-name">{worktree.branch}</code>
		{:else}
			<em class="detached-head">detached HEAD</em>
		{/if}
	</div>
	<div class="worktree-path" title={worktree.path}>
		{abbreviatePath(worktree.path)}
	</div>
</div>

<style>
	.worktree-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 16px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-bg-surface);
		cursor: pointer;
		transition: all 0.15s ease;
		margin-bottom: 8px;
	}

	.worktree-card:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-input);
	}

	.worktree-card.selected {
		border-color: var(--color-accent-blue);
		background: var(--color-bg-hover);
		box-shadow: 0 0 0 2px var(--color-focus-ring);
	}

	.worktree-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.badge {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		flex-shrink: 0;
	}

	.badge-main {
		background: var(--color-accent-blue);
		color: var(--color-accent-blue-text);
	}

	.badge-linked {
		background: var(--color-bg-surface-secondary);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border-input);
	}

	.branch-name {
		font-family: monospace;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.detached-head {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.worktree-path {
		font-size: 12px;
		color: var(--color-text-secondary);
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
