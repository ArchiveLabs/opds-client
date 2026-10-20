<script lang="ts">
	import { fly } from "svelte/transition";
	import { opds } from "$lib/stores/opdsStore";

	import { onMount } from "svelte";

	export let searchEnabled = true;
	$: links = $opds.state?.links || [];

	let scrolled = false;
	onMount(() => {
		const onScroll = () => { scrolled = window.scrollY > 10; };
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});
	$: title = $opds.state?.metadata?.title || $opds.state?.title || "";
	$: shelfLink = links.find(
		(nav: { rel: string }) =>
			nav.rel === "http://opds-spec.org/shelf",
	);
	$: historyLink = links.find(
		(nav: { rel: string }) =>
			nav.rel === "http://opds-spec.org/history",
	);
	$: profileLink = links.find(
		(nav: { rel: string }) => nav.rel === "profile",
	);
	$: searchLink = links.find(
		(nav: { rel: string }) => nav.rel === "search",
	);
	$: showBack = $opds && opds.shouldShowBack();

	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleSearchInput() {
		clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			opds.newSearch($opds.navbarSearchTerm);
		}, 1000);
	}
	function handleNavClick(nav: { href: string; type: string }) {
		opds.loadFromUrl(nav.href, nav.type);
	}

	function createHref(nav: { href: string }) {
		if (!nav) return "#";
		return `?opds=${encodeURIComponent(nav.href)}`;
	}
</script>

<nav class="navbar" class:scrolled aria-label="Main navigation">
	<div class="bar">
		{#if showBack}
			<button
				aria-label="Back"
				class="backbutton"
				on:click={() => opds.goBack()}
				transition:fly={{ x: -24, duration: 200 }}
			></button>
		{/if}

		<div class="right">
			{#if searchLink && searchEnabled}
				<div class="searchBar">
					<span id="searchIcon" aria-hidden="true"></span>
					<label for="search" class="sr-only">Search books</label>
					<input
						name="search"
						type="search"
						id="search"
						bind:value={$opds.navbarSearchTerm}
						on:input={handleSearchInput}
						placeholder="Search"
					/>
				</div>
			{/if}

			{#if profileLink || shelfLink || historyLink}
				<ul class="navmenu">
					{#if profileLink}
						<li>
							<a
								id="profileButton"
								href={createHref(profileLink)}
								on:click|preventDefault={() => handleNavClick(profileLink)}
								aria-label="Profile"
							></a>
						</li>
					{/if}

					{#if historyLink}
						<li>
							<a
								id="historyButton"
								href={createHref(historyLink)}
								on:click|preventDefault={() => handleNavClick(historyLink)}
								aria-label="Loan History"
							></a>
						</li>
					{/if}

					{#if shelfLink}
						<li>
							<a
								id="shelfButton"
								href={createHref(shelfLink)}
								on:click|preventDefault={() => handleNavClick(shelfLink)}
								aria-label="Book Shelf"
							></a>
						</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>
</nav>

<svelte:head>
	<title>{title || "OPDS Browser"}</title>
</svelte:head>


<style>
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 3;
		background-color: transparent;
		border-bottom: 1px solid transparent;
		transition: background-color 200ms ease, border-color 200ms ease;
	}

	.navbar.scrolled {
		background-color: color-mix(in srgb, var(--color-background-soft) 95%, transparent);
		border-bottom-color: var(--color-border);
	}

	.bar {
		display: flex;
		align-items: center;
		max-width: var(--container-lg);
		margin: 0 auto;
		padding: 0 var(--gap-small);
		overflow: hidden;
		height: 3rem;
	}

	.right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-left: auto;
		max-width: var(--navbar-search-width);
		width: 100%;
	}

	@media (max-width: 600px) {
		.right {
			max-width: unset;
		}
	}

	.backbutton {
		flex-shrink: 0;
		border: none;
		background: none;
		padding: var(--gap-xsmall);
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.backbutton::before {
		content: '';
		mask: url("../../back-button.svg") no-repeat center;
		background-color: var(--text-normal);
		display: block;
		width: 20px;
		height: 20px;
	}

	.searchBar {
		display: flex;
		align-items: center;
		gap: var(--gap-xsmall);
		flex: 1;
		min-width: 0;
		padding: var(--gap-xsmall);
		background-color: var(--color-background-mute);
		border-radius: 999px;
		border: 1px solid var(--color-border);
		outline: 2px solid transparent;
		transition: outline-color 150ms ease, border-color 150ms ease;

	&:focus-within {
			outline-color: var(--color-border-hover);
			border-color: var(--color-border-hover);
		}

		#searchIcon::before {
			content: "";
			mask: url("../../search.svg") no-repeat center;
			background-color: var(--text-subtle);
			display: block;
			width: 16px;
			height: 16px;
			flex-shrink: 0;
			margin-left: 0.5rem;
		}

		#search:placeholder-shown {
			color: var(--text-subtle);
		}

		#search {
			border: none;
			background: none;
			color: var(--text-normal);
			font-size: 16px;
			width: 100%;
			padding: 0;
			min-width: 0;
			outline: none;
		}
	}

	.navmenu {
		display: flex;
		list-style: none;
		gap: 0;
		margin: 0;
		padding: 0;
		flex-shrink: 0;

		& > li {
			line-height: 0;

			& > a {
				display: flex;
				align-items: center;
				padding: var(--gap-xsmall);
			}
		}
	}

	#profileButton::before {
		content: "";
		mask: url("../../user-profile.svg") no-repeat center;
		background-color: var(--text-normal);
		display: inline-block;
		width: 22px;
		height: 22px;
	}

	#historyButton::before {
		content: "";
		mask: url("../../clock.svg") no-repeat center;
		mask-size: contain;
		background-color: var(--text-normal);
		display: inline-block;
		width: 22px;
		height: 22px;
	}

	#shelfButton::before {
		content: "";
		mask: url("../../shelf.svg") no-repeat center;
		mask-size: contain;
		background-color: var(--text-normal);
		display: inline-block;
		width: 26px;
		height: 26px;
	}
</style>
