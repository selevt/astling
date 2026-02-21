<script lang="ts">
	import type { TreeNode } from '$lib/tree/types';
	import type { RecentCommit } from '$lib/server/git/types';
	import TreeNodeComponent from './TreeNode.svelte';

	let {
		roots,
		showHistoryFor,
		branchCommits,
		onToggleHistory,
		onCommitClick,
		selectedBranch,
		onSelect,
		onCheckout,
		onToggleStar,
		onDelete,
		editingBranchName,
		onEditComplete,
		renamingBranchName,
		onRenameComplete,
		onError
	}: {
		roots: TreeNode[];
		showHistoryFor: string | null;
		branchCommits: RecentCommit[];
		onToggleHistory: (path: string) => void;
		onCommitClick?: (hash: string, message: string) => void;
		selectedBranch: string | null;
		onSelect: (name: string) => void;
		onCheckout: (name: string) => void;
		onToggleStar: (name: string) => void;
		onDelete: (name: string) => void;
		editingBranchName: string | null;
		onEditComplete: () => void;
		renamingBranchName: string | null;
		onRenameComplete: () => void;
		onError: (message: string) => void;
	} = $props();
</script>

<div class="tree-view">
	{#each roots as node (node.path)}
		<TreeNodeComponent
			{node}
			depth={0}
			{showHistoryFor}
			{branchCommits}
			{onToggleHistory}
			{onCommitClick}
			{selectedBranch}
			{onSelect}
			{onCheckout}
			{onToggleStar}
			{onDelete}
			{editingBranchName}
			{onEditComplete}
			{renamingBranchName}
			{onRenameComplete}
			{onError}
		/>
	{/each}
</div>

<style>
	.tree-view {
		padding: 16px;
	}
</style>
