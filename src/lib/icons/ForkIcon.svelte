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
	<title>Base commit — where this branch diverged from the target</title>
	<path
		d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v1.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm3-8.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z"
	/>
</svg>
