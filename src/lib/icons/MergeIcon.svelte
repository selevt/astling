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
	<circle cx="18" cy="18" r="3" />
	<circle cx="6" cy="6" r="3" />
	<path d="M6 21V9a9 9 0 0 0 9 9" />
</svg>
