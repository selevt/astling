<script lang="ts">
	import { untrack } from 'svelte';
	import Dialog from './Dialog.svelte';
	import { getCommitDiff } from '../../routes/branches/data.remote';

	let {
		open = $bindable(false),
		hash,
		message
	}: {
		open?: boolean;
		hash: string;
		message: string;
	} = $props();

	let diff: string | null = $state(null);
	let error: string | null = $state(null);
	let loading = $state(false);

	interface DiffFile {
		header: string;
		hunks: string[];
	}

	let parsed = $derived.by(() => {
		if (!diff) return null;

		const lines = diff.split('\n');
		let commitLines: string[] = [];
		let statLines: string[] = [];
		let files: DiffFile[] = [];
		let currentFile: DiffFile | null = null;
		// Phases: 'commit' -> 'stat' -> 'diff'
		let phase: 'commit' | 'stat' | 'diff' = 'commit';

		for (const line of lines) {
			if (phase === 'commit') {
				// The stat section starts after a lone "---" separator
				if (line === '---') {
					phase = 'stat';
					continue;
				}
				// git show indents the commit message body with 4 spaces
				commitLines.push(line.startsWith('    ') ? line.slice(4) : line);
				continue;
			}

			if (line.startsWith('diff --git')) {
				phase = 'diff';
				if (currentFile) files.push(currentFile);
				const match = line.match(/^diff --git a\/.+ b\/(.+)$/);
				currentFile = { header: match ? match[1] : line, hunks: [] };
				continue;
			}

			if (phase === 'stat') {
				if (line.trim()) statLines.push(line);
				continue;
			}

			if (!currentFile) continue;
			// Skip per-file meta lines
			if (line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file') ||
				line.startsWith('old mode') || line.startsWith('new mode') || line.startsWith('similarity') ||
				line.startsWith('rename from') || line.startsWith('rename to') ||
				line.startsWith('--- ') || line.startsWith('+++ ')) continue;
			currentFile.hunks.push(line);
		}
		if (currentFile) files.push(currentFile);

		return { commitLines, statLines, files };
	});

	function lineClass(line: string): string {
		if (line.startsWith('@@')) return 'hunk-header';
		if (line.startsWith('+')) return 'added';
		if (line.startsWith('-')) return 'removed';
		return '';
	}

	async function fetchDiff(h: string) {
		loading = true;
		diff = null;
		error = null;
		try {
			const result = await getCommitDiff(h);
			if (result.success) {
				diff = result.diff;
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open && hash) {
			const h = hash;
			untrack(() => fetchDiff(h));
		}
	});

	function handleClose() {
		open = false;
		diff = null;
		error = null;
	}
</script>

<Dialog bind:open onClose={handleClose} title="{hash ? hash.slice(0, 7) : ''} {message}">
	{#if loading}
		<p class="loading">Loading diff...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if parsed}
		{#if parsed.commitLines.length > 0}
			<pre class="commit-block">{parsed.commitLines.join('\n')}</pre>
		{/if}

		{#if parsed.statLines.length > 0}
			<pre class="stat-block">{parsed.statLines.join('\n')}</pre>
		{/if}

		{#each parsed.files as file}
			<div class="file-block">
				<div class="file-header">{file.header}</div>
				<pre class="file-diff">{#each file.hunks as line}<span class={lineClass(line)}>{line}</span>{'\n'}{/each}</pre>
			</div>
		{/each}
	{/if}
</Dialog>

<style>
	.loading {
		color: var(--color-text-secondary);
		font-size: 14px;
	}

	.error {
		color: var(--color-error-text);
		font-size: 14px;
	}

	.commit-block {
		margin: 0 0 16px 0;
		padding: 12px;
		background: var(--color-bg-elevated, var(--color-bg-surface));
		border: 1px solid var(--color-border);
		border-radius: 6px;
		font-family: monospace;
		font-size: 13px;
		line-height: 1.5;
		white-space: pre-wrap;
		color: var(--color-text-primary);
	}

	.stat-block {
		margin: 0 0 16px 0;
		padding: 12px;
		background: var(--color-bg-elevated, var(--color-bg-surface));
		border: 1px solid var(--color-border);
		border-radius: 6px;
		font-family: monospace;
		font-size: 13px;
		line-height: 1.5;
		white-space: pre-wrap;
		color: var(--color-text-secondary);
	}

	.file-block {
		margin-bottom: 12px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
	}

	.file-block:last-child {
		margin-bottom: 0;
	}

	.file-header {
		font-family: monospace;
		font-size: 13px;
		font-weight: 600;
		padding: 8px 12px;
		background: var(--color-bg-elevated, var(--color-bg-surface));
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-primary);
	}

	.file-diff {
		margin: 0;
		padding: 8px 12px;
		font-family: monospace;
		font-size: 13px;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-x: auto;
	}

	.added {
		color: var(--color-accent-green);
	}

	.removed {
		color: var(--color-error-text);
	}

	.hunk-header {
		color: var(--color-text-secondary);
		font-style: italic;
		display: block;
		margin-top: 4px;
	}
</style>
