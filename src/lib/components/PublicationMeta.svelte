<script lang="ts">
	import { opds } from "$lib/stores/opdsStore.js";

	export let publication: any;

	$: pages = publication?.metadata?.numberOfPages;
	$: language = opds.renderLanguage(publication);
</script>

{#if pages || language}
	<ul class="publication-meta">
		{#if pages}
			<li>{pages} Pages</li>
		{/if}
		{#if language}
			<li>{language}</li>
		{/if}
	</ul>
{/if}

<style>
	.publication-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gap-xsmall);
		list-style: none;
		padding: 0;
		margin: 0;
		color: var(--text-subtle);
		font-size: var(--text-size-sm);
	}

	.publication-meta li + li::before {
		content: "•";
		margin-right: var(--gap-xsmall);
	}
</style>
