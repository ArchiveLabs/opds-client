<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
        import '../main.css';
        import '../loader.css';
        import '../search.svg';
        import '../shelf.svg';
        import '../checkmark.svg';
        import '../back-button.svg';
	let { children } = $props();
	export const ssr = false;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
