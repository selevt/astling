<script lang="ts">
	let {
		width = 14,
		height = 14,
		class: className = '',
		...rest
	}: {
		width?: number;
		height?: number;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<svg
	{width}
	{height}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	{...rest}
>
	<polyline points="3 6 5 6 21 6" />
	<path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6" />
	<path d="M10 11v6" />
	<path d="M14 11v6" />
	<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
</svg>
