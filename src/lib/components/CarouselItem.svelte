<script lang="ts">
	import { opds } from "$lib/stores/opdsStore";
	import { dwellintersect } from "$lib/actions/dwellintersect.js";
	import PublicationImageCard from "$lib/components/PublicationImageCard.svelte";
	import AvailabilityBadge from "$lib/components/AvailabilityBadge.svelte";

	export let publication;

	let resolvedPublication = publication;
	let alternateResolved = false;
	let resolvingAlternate = false;

	function hasAlternatePublication(pub: any): boolean {
		return pub?.links?.some((l: any) => l?.rel === "alternate" && l?.type === "application/opds-publication+json") ?? false;
	}

	async function onDwell() {
		if (alternateResolved || resolvingAlternate) return;
		resolvingAlternate = true;
		resolvedPublication = await opds.resolveAlternateLinks(resolvedPublication);
		alternateResolved = true;
	}

	function handleNavClick(pub: any) {
		const selfLink = opds.getSelfLink(pub);
		if (selfLink) {
			opds.loadFromUrl(selfLink.href, selfLink.type ?? "", {
				history: "push",
				setLoading: false,
				data: pub,
			});
		}
	}

	function createHref(pub: any) {
		const selfLink = opds.getSelfLink(pub);
		return selfLink
			? `?opds=${encodeURIComponent(selfLink.href)}`
			: "#";
	}

	$: availability = opds.getAvailability(resolvedPublication);
	$: canPurchase = opds.canPurchase(resolvedPublication);
	$: openAccess = opds.getOpenAccess(resolvedPublication);
	$: loadingAvailability = hasAlternatePublication(publication) && !alternateResolved;
</script>

<li
	use:dwellintersect={{ dwell: 1000, callback: hasAlternatePublication(publication) ? onDwell : undefined }}
>
	<a
		class="card-link"
		href={createHref(publication)}
		on:click|preventDefault={() => handleNavClick(publication)}
		aria-label={publication.metadata.title}
	>
		<PublicationImageCard {publication} />
		<div class="card-text">
			<p
				class="bold"
				style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
			>
				{publication.metadata.title}
			</p>
			<p
				class="subtle"
				style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
			>
				{opds.renderAuthors(publication)}
			</p>
			<div class="badge-slot">
				<AvailabilityBadge
					{availability}
					{canPurchase}
					hasOpenAccess={!!openAccess}
					loading={loadingAvailability}
				/>
			</div>
		</div>
	</a>
</li>

<style>
	.card-link {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		height: 100%;
	}

	@media (hover: hover) {
		.card-link:hover :global(img) {
			transition: transform 0.1s ease;
			transform: scale(0.95);
			box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
		}
	}

	.badge-slot {
		display: flex;
		min-height: calc(var(--text-size-sm) * 1.5);
	}

	.card-text {
		max-width: 200px;
		margin-top: auto;
		padding-top: var(--gap-xsmall);
	}
</style>
