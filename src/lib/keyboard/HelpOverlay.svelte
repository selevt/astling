<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();
</script>

<div class="help-overlay" role="dialog" aria-label="Keyboard shortcuts">
	<div class="help-content">
		<div class="help-header">
			<h2>Keyboard Shortcuts</h2>
			<button class="help-close" onclick={onClose}>x</button>
		</div>
		<div class="help-grid">
			<div class="help-section">
				<h3>Navigation</h3>
				<dl>
					<dt><kbd>j</kbd> / <kbd>ArrowDown</kbd></dt><dd>Move down</dd>
					<dt><kbd>k</kbd> / <kbd>ArrowUp</kbd></dt><dd>Move up</dd>
					<dt><kbd>gg</kbd></dt><dd>Jump to first</dd>
					<dt><kbd>G</kbd></dt><dd>Jump to last</dd>
					<dt><kbd>/</kbd></dt><dd>Focus search</dd>
					<dt><kbd>Esc</kbd></dt><dd>Dismiss / blur</dd>
				</dl>
			</div>
			<div class="help-section">
				<h3>Actions</h3>
				<dl>
					<dt><kbd>o</kbd></dt><dd>Checkout branch</dd>
					<dt><kbd>Space</kbd></dt><dd>Toggle star</dd>
					<dt><kbd>d</kbd></dt><dd>Delete branch</dd>
					<dt><kbd>r</kbd></dt><dd>Refresh</dd>
				</dl>
			</div>
			<div class="help-section">
				<h3>Filters</h3>
				<dl>
					<dt><kbd>g a</kbd></dt><dd>All branches</dd>
					<dt><kbd>g s</kbd></dt><dd>Starred</dd>
				</dl>
			</div>
		</div>
		<p class="help-hint">Press <kbd>?</kbd> or <kbd>Esc</kbd> to close</p>
	</div>
</div>

<style>
	.help-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.help-content {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 24px 32px;
		max-width: 600px;
		width: 90vw;
		box-shadow: 0 10px 25px var(--color-shadow-modal);
	}

	.help-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.help-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.help-close {
		background: none;
		border: 1px solid var(--color-border-input);
		border-radius: 6px;
		cursor: pointer;
		font-size: 16px;
		color: var(--color-text-secondary);
		padding: 4px 10px;
	}

	.help-close:hover {
		background: var(--color-bg-hover);
		color: var(--color-text-primary);
	}

	.help-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 20px;
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
