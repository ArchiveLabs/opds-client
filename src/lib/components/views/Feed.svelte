<script lang="ts">
        import { opds, feedUrl } from "$lib/stores/opdsStore.js";
        import { intersect } from "$lib/actions/intersect.js";
        import PublicationCard from "$lib/components/PublicationCard.svelte";
        import Carousel from "$lib/components/Carousel.svelte";
        import FacetBar from "$lib/components/FacetBar.svelte";
        $: state = $opds.state as any;

        function handleFocus() {
                if (document.visibilityState !== "visible") return;
                opds.refreshAcquisitionLinks();
        }

        $: title = state.metadata?.title;
        $: navigation = state.navigation || [];
        $: groups = state.groups || [];
        $: facets = state.facets || [];
        $: publications = state.publications || [];
        $: linkAmount = navigation.length + groups.length + publications.length;
        $: searchState = $opds.searchState;
        $: nextLink = opds.getLink(state.links || [], { rel: "next" });
        $: startLink = opds.getLink(state.links || [], { rel: "start" });
        function handleNavClick(nav: any) {
                if (nav?.href) {
                        opds.loadFromUrl(nav.href, nav.type);
                }
        }
        function createHref(nav: any) {
                return nav?.href
                        ? `?opds=${encodeURIComponent(nav.href)}`
                        : "#";
        }
</script>

<svelte:document on:visibilitychange={handleFocus} />

<h1>
        {#if startLink}
                <a href={createHref(startLink)} on:click|preventDefault={() => handleNavClick(startLink)}>{title}</a>
        {:else}
                {title}
        {/if}
</h1>
{#if facets.length > 0 || navigation.length > 0}
        <div class="filterbar" aria-label="Filter and category links">
                <FacetBar {facets} />
                {#if facets.length > 0 && navigation.length > 0}
                        <span class="filterbar-separator" aria-hidden="true"></span>
                {/if}
                {#each navigation as nav}
                        <a
                                class="filterbar-tag"
                                href={createHref(nav)}
                                on:click|preventDefault={() => handleNavClick(nav)}
                        >
                                {nav.title}
                        </a>
                {/each}
        </div>
{/if}
{#if linkAmount === 0 && searchState !== "loading" && searchState !== "empty"}
        <main class="nothing">
                <h3>No results</h3>
        </main>
{/if}

<main id="main-content" class="feedMain">
        {#each groups as group, index}
                <section id="opds-group-{index + 1}" class="opdsGroup">
                        <header>
                                <a
                                        class="groupLink"
                                        href={createHref(
                                                opds.getSelfLink(group),
                                        )}
                                        on:click|preventDefault={() =>
                                                handleNavClick(
                                                        opds.getSelfLink(group),
                                                )}
                                >
                                        <h2>{group.metadata?.title}</h2>
                                        <span class="forwardbutton" aria-hidden="true"></span>
                                </a>
                        </header>
                        <Carousel
                                id={group.metadata.title}
                                publications={group.publications}
                        />
                </section>
        {/each}

        <section id="catalog">
                <ul class="catalog">
                        {#each publications as publication}
                                <li>
                                        <PublicationCard {publication} />
                                </li>
                        {/each}
                </ul>

                {#if searchState === "empty"}
                        <div
                                style="margin-bottom: 2rem; text-align: center; width: 100%;"
                        >
                                <p>No more results</p>
                        </div>
                {/if}
                {#if nextLink && searchState !== "loading" && searchState !== "empty"}
                        <div
                                style="margin-bottom: 2rem; width: 100%; display: flex; justify-content: center;"
                                use:intersect={{ callback: () => opds.loadNextPage() }}
                        >
                                <span class="loader flexed"></span>
                        </div>
                {:else if searchState === "loading"}
                        <div
                                style="margin-bottom: 2rem; text-align: center; width: 100%; display: flex; justify-content: center;"
                        >
                                <span class="loader flexed"></span>
                        </div>
                {/if}
        </section>

</main>

<style>
        h1 {
                line-height: 1;
                margin-top: var(--gap-small);
        }
        h1 a {
                color: inherit;
                text-decoration: none;
        }
        h1 a:hover {
                opacity: 0.7;
        }
.nothing {
                display: flex;
                justify-content: center;
                flex-direction: column;
                gap: var(--gap-medium);
                font-size: 1.2rem;
                text-align: center;
        }
        .nothing h3 {
                font-size: 1.2rem;
                font-weight: 500;
        }
        .feedMain {
                display: flex;
                flex-direction: column;
                gap: var(--gap-big);
        }

        .opdsGroup {
                display: flex;
                flex-direction: column;
                gap: var(--gap-big);
                h2 {
                        line-height: 1;
                }
                @media (max-width: 600px) {
                        h2 {
                                font-size: var(--text-size-lg);
                        }
                }
                .groupLink {
                        display: flex;
                        align-items: center;
                        text-decoration: none;
                        color: inherit;
                }

                .groupLink:active {
                        opacity: 0.6;
                }

                .forwardbutton {
                        display: inline-block;
                        content: '';
                        mask: url("../../../back-button.svg") no-repeat;
                        background-color: var(--text-normal);
                        align-self: center;
                        width: 1.2rem;
                        height: 1.2rem;
                        transform: scale(-1, 1);
                        margin-left: 1rem;
                }

                &>header {
                        display: flex;
                }
        }

</style>
