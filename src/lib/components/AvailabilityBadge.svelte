<script lang="ts">
	export let availability: { type: string; until?: Date | string } | undefined = undefined;
	export let canPurchase: boolean = false;
	export let hasOpenAccess: boolean = false;
	export let loading: boolean = false;

	import { fade } from "svelte/transition";
</script>

{#if loading}
	<p class="availability-skeleton" aria-hidden="true">&nbsp;</p>
{:else if availability?.type === "ready"}
	<p in:fade={{ duration: 200 }} class="book-available">Borrowed</p>
{:else if hasOpenAccess}
	<p in:fade={{ duration: 200 }} class="badge-unlock">Open Access</p>
{:else if availability?.type === "available"}
	<p in:fade={{ duration: 200 }} class="badge-book">Available to borrow</p>
{:else if canPurchase}
	<p in:fade={{ duration: 200 }} class="badge-dollar">Available for purchase</p>
{:else if availability?.type === "unavailable"}
	<p in:fade={{ duration: 200 }} class="badge-clock">Checked out</p>
{/if}

<style>
	p {
		width: fit-content;
		font-size: var(--text-size-sm);
		user-select: none;
	}
	.badge-unlock::before,
	.badge-dollar::before,
	.badge-book::before,
	.badge-clock::before {
		content: '';
		display: inline-block;
		width: 10px;
		height: 10px;
		margin-right: 0.3rem;
		background-color: currentColor;
	}
	.badge-unlock::before {
		mask: url("../../unlock.svg") no-repeat center;
		-webkit-mask: url("../../unlock.svg") no-repeat center;
	}
	.badge-dollar::before {
		mask: url("../../dollar.svg") no-repeat center;
		-webkit-mask: url("../../dollar.svg") no-repeat center;
	}
	.badge-book::before {
		mask: url("../../book.svg") no-repeat center;
		-webkit-mask: url("../../book.svg") no-repeat center;
	}
	.badge-clock::before {
		mask: url("../../clock.svg") no-repeat center;
		-webkit-mask: url("../../clock.svg") no-repeat center;
	}
	.availability-skeleton {
		width: 6rem;
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
