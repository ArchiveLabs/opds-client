<script lang="ts">
	import { onMount, onDestroy } from "svelte";

	export let onclose: () => void;

	let lastFocusedElement: HTMLElement | null = null;
	let cardEl: HTMLElement;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onclose();
		}
	}

	onMount(() => {
		lastFocusedElement = document.activeElement as HTMLElement;
		// Focus the first heading or the card itself
		const heading = cardEl?.querySelector<HTMLElement>("h3[tabindex], h2[tabindex]");
		setTimeout(() => (heading || cardEl)?.focus(), 0);
		window.addEventListener("keydown", handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener("keydown", handleKeydown);
		lastFocusedElement?.focus();
	});
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="modal-overlay" on:click={onclose} role="presentation">
	<div class="modal-card" bind:this={cardEl} on:click|stopPropagation on:keydown|stopPropagation>
		<button class="modal-close" on:click={onclose} aria-label="Close">&times;</button>
		<slot />
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal-card {
		background-color: var(--bg-card);
		border-radius: var(--border-radius-menu);
		padding: var(--gap-medium);
		max-width: 400px;
		width: 90%;
		display: flex;
		flex-direction: column;
		gap: var(--gap-small);
		position: relative;
	}

	.modal-close {
		position: absolute;
		top: var(--gap-small);
		right: var(--gap-small);
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		color: var(--text-subtle);
		padding: 0.25rem;
	}

	.modal-card :global(h3) {
		margin: 0;
	}

	.modal-card :global(p) {
		margin: 0;
		color: var(--text-normal);
	}
</style>
