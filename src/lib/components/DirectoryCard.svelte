<script lang="ts">
	import type { DirectoryNode } from '$lib/tree/types';
	import FolderIcon from '$lib/icons/FolderIcon.svelte';

	let {
		node,
		expanded,
		depth,
		onToggleExpand,
		selected
	}: {
		node: DirectoryNode;
		expanded: boolean;
		depth: number;
		onToggleExpand: () => void;
		selected?: boolean;
	} = $props();
</script>

<div class="dir-card" class:selected data-tree-node={node.path} style="--tree-depth: {depth}">
	<div class="dir-header">
		<button class="expand-btn" onclick={onToggleExpand} aria-expanded={expanded}>
			<span class="chevron">{expanded ? '▾' : '▸'}</span>
		</button>
		<span class="folder-icon"><FolderIcon width={15} height={15} /></span>
		<span class="dir-label">{node.label}</span>
		<span class="branch-count">{node.branchCount}</span>
		{#if node.hasCurrentBranch}
			<span class="current-badge">current</span>
		{/if}
	</div>
</div>

<style>
	.dir-card {
		border: 1px solid var(--color-border);
		border-radius: 6px;
		margin-bottom: 4px;
		background: var(--color-bg-surface);
	}

	.dir-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		padding-left: calc(12px + var(--tree-depth, 0) * 20px);
		cursor: default;
		user-select: none;
	}

	.expand-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 16px;
		line-height: 1;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.expand-btn:hover {
		color: var(--color-text-primary);
	}

	.folder-icon {
		display: flex;
		align-items: center;
		color: var(--color-accent-yellow, #d4a017);
	}

	.dir-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		font-family: monospace;
	}

	.branch-count {
		font-size: 11px;
		background: var(--color-bg-elevated, var(--color-bg-surface));
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1px 7px;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.current-badge {
		font-size: 11px;
		background: var(--color-accent-green);
		color: var(--color-accent-green-text);
		border-radius: 10px;
		padding: 1px 7px;
		font-weight: 500;
	}

	.dir-card.selected {
		border-color: var(--color-accent);
		outline: 2px solid var(--color-accent);
		outline-offset: -1px;
	}
</style>
