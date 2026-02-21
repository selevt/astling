<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';

	let { onClose }: { onClose: () => void } = $props();
</script>

<Dialog open={true} {onClose} title="Keyboard Shortcuts">
	<div class="help-grid">
		<div class="help-section">
			<h3>Navigation</h3>
			<dl>
				<dt><kbd>j</kbd> / <kbd>ArrowDown</kbd></dt>
				<dd>Move down</dd>
				<dt><kbd>k</kbd> / <kbd>ArrowUp</kbd></dt>
				<dd>Move up</dd>
				<dt><kbd>gg</kbd></dt>
				<dd>Jump to first</dd>
				<dt><kbd>G</kbd></dt>
				<dd>Jump to last</dd>
				<dt><kbd>/</kbd></dt>
				<dd>Focus search</dd>
				<dt><kbd>Esc</kbd></dt>
				<dd>Dismiss / blur</dd>
			</dl>
		</div>
		<div class="help-section">
			<h3>Actions</h3>
			<dl>
				<dt><kbd>o</kbd></dt>
				<dd>Checkout branch</dd>
				<dt><kbd>s</kbd></dt>
				<dd>Toggle star</dd>
				<dt><kbd>d</kbd></dt>
				<dd>Delete branch</dd>
				<dt><kbd>D</kbd></dt>
				<dd>Force delete branch</dd>
				<dt><kbd>e</kbd></dt>
				<dd>Edit description</dd>
				<dt><kbd>R</kbd></dt>
				<dd>Rename branch</dd>
				<dt><kbd>b</kbd></dt>
				<dd>Backup branch</dd>
				<dt><kbd>l</kbd></dt>
				<dd>Toggle commit history</dd>
				<dt><kbd>c</kbd></dt>
				<dd>Create branch</dd>
				<dt><kbd>C</kbd></dt>
				<dd>Create branch from selected</dd>
				<dt><kbd>r</kbd></dt>
				<dd>Refresh</dd>
			</dl>
		</div>
		<div class="help-section">
			<h3>Filters</h3>
			<dl>
				<dt><kbd>g a</kbd></dt>
				<dd>All branches</dd>
				<dt><kbd>g s</kbd></dt>
				<dd>Starred</dd>
				<dt><kbd>g m</kbd></dt>
				<dd>Find merged</dd>
			</dl>
		</div>
		<div class="help-section">
			<h3>Tree View</h3>
			<dl>
				<dt><kbd>v</kbd></dt>
				<dd>Toggle list / tree view</dd>
				<dt><kbd>h</kbd></dt>
				<dd>Collapse directory</dd>
				<dt><kbd>l</kbd></dt>
				<dd>Expand directory (on dir node)</dd>
			</dl>
		</div>
	</div>
	<p class="help-hint">Press <kbd>?</kbd> or <kbd>Esc</kbd> to close</p>
</Dialog>

<style>
	.help-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 20px;
		min-width: 560px;
	}

	.help-section h3 {
		margin: 0 0 10px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.help-section dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 12px;
		align-items: baseline;
	}

	.help-section dt {
		text-align: right;
	}

	.help-section dd {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-primary);
	}

	.help-hint {
		margin: 20px 0 0 0;
		text-align: center;
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	kbd {
		display: inline-block;
		padding: 2px 6px;
		font-family: monospace;
		font-size: 12px;
		color: var(--color-text-primary);
		background: var(--color-bg-surface-secondary);
		border: 1px solid var(--color-border-input);
		border-radius: 4px;
		line-height: 1.4;
	}
</style>
