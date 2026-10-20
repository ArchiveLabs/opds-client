<script lang="ts">
	import { opds } from "$lib/stores/opdsStore";
	export let consentContext: { href: string; title?: string };
	export let oncancel: () => void;
	export let headingEl: HTMLElement | undefined = undefined;
</script>

<div role="dialog" aria-modal="true" aria-labelledby="consentTitle" id="consentScreen">
	<h3 id="consentTitle" tabindex="-1" bind:this={headingEl}>You are leaving Internet Archive</h3>
	<p>
		You are leaving Internet Archive's site for <strong
			>{opds.renderPublisher(consentContext.title) ||
				"External publisher"}</strong
		>, which is a separate, independent site.
	</p>
	<div class="consent-actions">
		<a
			role="button"
			class="small acquisition raised"
			href={consentContext.href}
			target="_blank"
			rel="noopener noreferrer"
			on:click={oncancel}
		>
			Continue
		</a>
	</div>
</div>

<style>
	.consent-actions {
		display: flex;
		flex-direction: column;
		gap: var(--gap-small, 0.75rem);
		margin-top: var(--gap-small, 1.5rem);
	}
</style>
