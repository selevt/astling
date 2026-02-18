<script lang="ts">
	let {
		width = 16,
		height = 16,
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
	viewBox="0 0 16 16"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	{...rest}
>
	<path d="M1.5 8a6.5 6.5 0 0 1 11.25-4.5M14.5 8a6.5 6.5 0 0 1-11.25 4.5" />
	<polyline points="13 1 13 4.5 9.5 4.5" />
	<polyline points="3 15 3 11.5 6.5 11.5" />
</svg>
