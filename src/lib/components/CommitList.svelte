<script lang="ts">
	import type { RecentCommit } from '$lib/server/git/types';
	import ForkIcon from '$lib/icons/ForkIcon.svelte';
	import CloudIcon from '$lib/icons/CloudIcon.svelte';

	let {
		commits,
		initialVisible = 3,
		loading = false,
		onCommitClick
	}: {
		commits: RecentCommit[];
		initialVisible?: number;
		loading?: boolean;
		onCommitClick?: (hash: string, message: string) => void;
	} = $props();

	let showAll = $state(false);
	let forkCommit = $derived(commits.find((c) => c.isFork) ?? null);
	let aheadCommits = $derived(forkCommit ? commits.filter((c) => !c.isFork) : commits);
	let visible = $derived(showAll ? aheadCommits : aheadCommits.slice(0, initialVisible));
	let hasMore = $derived(aheadCommits.length > initialVisible);

	$effect(() => {
		// Reset expanded state when commits change (e.g. different branch selected)
		commits;
		showAll = false;
	});
</script>

{#snippet commitRow(commit: RecentCommit)}
	<button
		class="commit-row"
		class:commit--fork={commit.isFork}
		type="button"
		onclick={() => onCommitClick?.(commit.hash, commit.message)}
	>
		<code class="commit-hash">{commit.hash}</code>{#if commit.isFork}<ForkIcon
				class="fork-icon"
				aria-label="fork point"
			/>{/if}
		{#each commit.refs as ref (ref.name)}
			<span class="ref-badge ref-badge--{ref.type}"
				>{ref.name}{#if ref.synced}<CloudIcon class="ref-cloud" />{/if}</span
			>
		{/each}
		<span class="commit-message">{commit.message}</span>
		<span class="commit-date">{commit.relativeDate}</span>
	</button>
{/snippet}

{#if loading}
	<div class="commits-loading">
		<span class="skeleton"></span>
		<span class="skeleton skeleton--wide"></span>
		<span class="skeleton"></span>
	</div>
{:else if commits.length === 0}
	<p class="commits-empty">No commits found.</p>
{:else}
	<div class="branch-commits-list">
		{#each visible as commit (commit.hash)}
			{@render commitRow(commit)}
		{/each}
	</div>
	{#if hasMore}
		<button class="commits-expand-toggle" onclick={() => (showAll = !showAll)}>
			{showAll ? '▲ fewer' : `▼ ${aheadCommits.length - initialVisible} more`}
		</button>
	{/if}
	{#if forkCommit}
		{@render commitRow(forkCommit)}
	{/if}
{/if}

<style>
	.branch-commits-list {
		border-top: 1px solid var(--color-border-input);
		padding-top: 10px;
	}

	.commits-expand-toggle {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px 6px;
		width: 100%;
		text-align: left;
		opacity: 0.6;
	}
	.commits-expand-toggle:hover {
		opacity: 1;
	}

	.commit--fork {
		color: var(--color-text-secondary);
		opacity: 0.7;
	}

	:global(.fork-icon) {
		width: 12px;
		height: 12px;
		margin-left: 4px;
		flex-shrink: 0;
		vertical-align: -1px;
		color: var(--color-text-secondary);
	}

	.commit-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 4px;
		font-size: 14px;
		width: 100%;
		background: none;
		border: none;
		color: inherit;
		text-align: left;
		cursor: pointer;
		border-radius: 4px;
		transition: background 0.15s ease;
	}

	.commit-row:hover {
		background: var(--color-bg-hover);
	}

	.commit-row:not(:last-child) {
		border-bottom: 1px solid var(--color-border-input);
		border-radius: 0;
		padding-bottom: 6px;
	}

	.commit-hash {
		font-family: monospace;
		font-size: 13px;
		color: var(--color-text-secondary);
		background: var(--color-bg-elevated, var(--color-bg-surface));
		padding: 2px 6px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.commit-message {
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.commit-date {
		color: var(--color-text-secondary);
		font-size: 13px;
		flex-shrink: 0;
		text-align: right;
	}

	.ref-badge {
		font-size: 11px;
		font-weight: 500;
		padding: 1px 6px;
		border-radius: 10px;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.ref-badge--branch {
		background: var(--color-badge-green-bg);
		color: var(--color-badge-green-text);
		border: 1px solid var(--color-badge-green-border);
	}

	.ref-badge--remote {
		background: var(--color-badge-blue-bg);
		color: var(--color-badge-blue-text);
		border: 1px solid var(--color-badge-blue-border);
	}

	.ref-badge--tag {
		background: var(--color-badge-yellow-bg);
		color: var(--color-badge-yellow-text);
		border: 1px solid var(--color-badge-yellow-border);
	}

	:global(.ref-cloud) {
		width: 12px !important;
		height: 12px !important;
		margin-left: 4px;
		vertical-align: -2px;
		flex-shrink: 0;
	}

	.commits-loading {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px 0;
	}

	.skeleton {
		display: block;
		height: 20px;
		width: 60%;
		background: var(--color-bg-hover);
		border-radius: 4px;
		animation: shimmer 1.2s infinite;
	}

	.skeleton--wide {
		width: 85%;
	}

	@keyframes shimmer {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	.commits-empty {
		font-size: 13px;
		color: var(--color-text-secondary);
		margin: 4px 0;
	}
</style>
