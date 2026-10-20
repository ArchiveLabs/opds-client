<script lang="ts">
	import AvailabilityBadge from "$lib/components/AvailabilityBadge.svelte";
	import { displayDateDiff } from "$lib/utils/dateDiff";

	export let availability: { type: string; until?: Date | string } | undefined = undefined;
	export let canPurchase: boolean = false;
	export let hasOpenAccess: boolean = false;
	export let loading: boolean = false;
</script>

{#if loading || canPurchase || availability || hasOpenAccess}
	<div class="badges">
		<AvailabilityBadge
			{availability}
			{canPurchase}
			{hasOpenAccess}
			{loading}
		/>
		{#if availability?.type === "ready" && availability.until}
			<a
				class="date-pill"
				href="https://help.archive.org/help/borrowing-from-the-lending-library/"
				target="_blank"
				rel="noopener noreferrer"
			>Autorenew in {displayDateDiff(new Date(), new Date(availability.until))}</a>
		{:else if availability?.type === "unavailable" && availability.until}
			<span class="date-pill"
			>Available in {displayDateDiff(new Date(), new Date(availability.until))}</span>
		{/if}
	</div>
{/if}

<style>
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gap-tiny);
		align-items: center;
	}
	.date-pill {
		width: fit-content;
		text-decoration: none;
		font-size: inherit;
		color: var(--text-subtle);
	}
	a.date-pill:hover {
		color: var(--text-normal);
	}
</style>
