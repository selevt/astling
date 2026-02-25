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
	<title>Worktrees view</title>
	<!-- Stacked folder boxes representing multiple worktrees -->
	<path
		d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.086a1 1 0 0 1 .707.293L7.207 3.207A1 1 0 0 0 7.914 3.5H13.5A1.5 1.5 0 0 1 15 5v1.5H1V3.5z"
		opacity="0.4"
	/>
	<path d="M1 6.5h14v4A1.5 1.5 0 0 1 13.5 12h-11A1.5 1.5 0 0 1 1 10.5v-4z" opacity="0.7" />
	<path
		d="M0 9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3.5A1.5 1.5 0 0 1 14.5 14h-13A1.5 1.5 0 0 1 0 12.5V9z"
	/>
</svg>
