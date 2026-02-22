<script lang="ts">
	import type { TreeNode, DirectoryNode } from '$lib/tree/types';
	import type { BranchWithMetadata, RecentCommit } from '$lib/server/git/types';
	import BranchCard from './BranchCard.svelte';
	import DirectoryCard from './DirectoryCard.svelte';
	import TreeNodeComponent from './TreeNode.svelte';
	import { isExpanded, toggleExpanded } from '$lib/tree/treeNav.svelte';

	let {
		node,
		depth = 0,
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
		onError,
		focusedTreePath,
		onDeleteDirectory
	}: {
		node: TreeNode;
		depth?: number;
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
		focusedTreePath: string | null;
		onDeleteDirectory: (node: DirectoryNode) => void;
	} = $props();
</script>

{#if node.kind === 'branch'}
	<div style="padding-left: calc({depth} * 20px)">
		<BranchCard
			branch={node.branch}
			selected={selectedBranch === node.branch.name}
			{onSelect}
			{onCheckout}
			{onToggleStar}
			{onDelete}
			showDescriptionForm={editingBranchName === node.branch.name}
			{onEditComplete}
			showRenameForm={renamingBranchName === node.branch.name}
			{onRenameComplete}
			{onError}
			showCommitHistory={showHistoryFor === node.branch.name}
			commitHistory={showHistoryFor === node.branch.name ? branchCommits : []}
			commitHistoryLoading={false}
			onToggleHistory={() => onToggleHistory(node.branch.name)}
			{onCommitClick}
		/>
	</div>
{:else}
	<DirectoryCard
		{node}
		expanded={isExpanded(node.path)}
		{depth}
		onToggleExpand={() => toggleExpanded(node.path)}
		selected={focusedTreePath === node.path}
		onDeleteAll={() => onDeleteDirectory(node)}
	/>
	{#if isExpanded(node.path)}
		<div class="dir-children">
			{#each node.children as child (child.path)}
				<TreeNodeComponent
					node={child}
					depth={depth + 1}
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
					{focusedTreePath}
					{onDeleteDirectory}
				/>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.dir-children {
		padding-left: 12px;
		border-left: 1px solid var(--color-border);
		margin-left: 16px;
		margin-bottom: 4px;
	}
</style>
