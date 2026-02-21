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

<svg {width} {height} viewBox="0 0 16 16" fill="currentColor" class={className} {...rest}>
	<title>List view</title>
	<path
		d="M2 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3-1h9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm-3 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3-1h9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm-3 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3-1h9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1z"
	/>
</svg>
