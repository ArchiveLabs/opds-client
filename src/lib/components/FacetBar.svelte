<script lang="ts">
        import { opds } from "$lib/stores/opdsStore.js";
        import { onMount, onDestroy, tick } from "svelte";

        export let facets: any[];

        let openIndex: number | null = null;
        let containerEl: HTMLElement;
        let buttonEls: HTMLElement[] = [];
        let menuStyle = "";

        function handleFacetClick(facetLink: any) {
                openIndex = null;
                opds.loadFromUrl(facetLink.href, facetLink.type, { history: "replace", setLoading: true });
        }

        function createHref(nav: any) {
                return nav?.href
                        ? `?opds=${encodeURIComponent(nav.href)}`
                        : "#";
        }

        async function toggle(i: number) {
                if (openIndex === i) {
                        openIndex = null;
                        return;
                }
                openIndex = i;
                await tick();
                positionMenu(i);
        }

        function positionMenu(i: number) {
                const btn = buttonEls[i];
                if (!btn) return;
                const rect = btn.getBoundingClientRect();
                const top = rect.bottom + 4;
                // Keep menu within viewport — right-align if it would overflow
                const menuMinWidth = 180;
                const wouldOverflow = rect.left + menuMinWidth > window.innerWidth - 8;
                menuStyle = wouldOverflow
                        ? `top: ${top}px; right: ${Math.max(8, window.innerWidth - rect.right)}px;`
                        : `top: ${top}px; left: ${rect.left}px;`;
        }

        function handleClickOutside(e: MouseEvent) {
                const target = e.target as Node;
                if (containerEl?.contains(target)) return;
                // Also ignore clicks inside the fixed-position menu
                const menu = document.querySelector(".facetMenu");
                if (menu?.contains(target)) return;
                openIndex = null;
        }

        function closeOnScroll(e: Event) {
                const menu = document.querySelector(".facetMenu");
                if (menu?.contains(e.target as Node)) return;
                openIndex = null;
        }

        onMount(() => {
                document.addEventListener("click", handleClickOutside);
                window.addEventListener("scroll", closeOnScroll, true);
                window.addEventListener("resize", closeOnScroll);
        });

        onDestroy(() => {
                document.removeEventListener("click", handleClickOutside);
                window.removeEventListener("scroll", closeOnScroll, true);
                window.removeEventListener("resize", closeOnScroll);
        });
</script>

{#if facets.length > 0}
        <div class="facets" role="group" aria-label="Filter options" bind:this={containerEl}>
                {#each facets as facet, i}
                        <div class="dropdown">
                                <button
                                        bind:this={buttonEls[i]}
                                        aria-haspopup="menu"
                                        aria-expanded={openIndex === i}
                                        class="dropdownSummary"
                                        on:click={() => toggle(i)}
                                >
                                        {facet.metadata.title}<span class="caret" aria-hidden="true">▾</span>
                                </button>
                        </div>
                {/each}
        </div>
        {#if openIndex !== null}
                <menu class="facetMenu" style={menuStyle}>
                        {#each facets[openIndex].links as facetLink}
                                <li>
                                        <a
                                                href={createHref(facetLink)}
                                                aria-disabled={facetLink.rel === "self"}
                                                on:click|preventDefault={() => handleFacetClick(facetLink)}
                                        >
                                                <span class="checkmark"
                                                        >{facetLink.rel === "self" ? "✓" : ""}</span
                                                >{facetLink.title}
                                        </a>
                                </li>
                        {/each}
                </menu>
        {/if}
{/if}

<style>
        .facets {
                display: contents;
        }

        .dropdown {
                flex-shrink: 0;
        }

        .dropdownSummary {
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: var(--gap-xxsmall);
                padding: var(--gap-tiny) var(--gap-xsmall);
                font-family: var(--nav-font);
                user-select: none; /* Prevents text highlighting on rapid mobile taps */
                transition: background-color 150ms;
                background-color: var(--button-bg-subtle);
                border: none;
                border-radius: var(--border-radius-pill);
                color: var(--text-normal);
                font-size: var(--text-size-sm);
                line-height: 1.2;
                white-space: nowrap;
        }

        .caret {
                display: inline-block;
                font-size: 0.75em;
                line-height: 1;
                transition: transform 200ms ease;
        }

        .dropdownSummary[aria-expanded="true"] .caret {
                transform: rotate(-180deg);
        }

        .dropdownSummary:hover {
                background-color: var(--button-bg-subtle);
        }

        .dropdownSummary:active {
                background-color: color-mix(in srgb, var(--button-bg-subtle) 80%, currentColor 15%);
        }

        /* The Popup Menu */
        .facetMenu {
                position: fixed;
                z-index: 100;
                max-height: 50vh;
                overflow-y: scroll;

                display: flex;
                flex-direction: column;
                min-width: 180px;
                padding: 0;
                margin: 0;

                background-color: var(--bg-menu, #ffffff);
                border: 1px solid var(--color-border, gray);
                border-radius: var(--border-radius-button);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .facetMenu li {
                width: 100%;
                list-style: none;
        }

        /* Mobile-friendly tap targets */
        .facetMenu li a {
                display: flex;
                align-items: baseline;
                padding: var(--gap-small) var(--gap-medium);
                text-decoration: none;
                color: var(--text-normal);
                font-family: var(--nav-font);
                transition: background-color 200ms;
                margin: 0;
        }

        .facetMenu li a:hover {
                background-color: var(--button-bg-subtle);
        }

        .facetMenu li a[aria-disabled="true"] {
                color: var(--text-muted, #888);
                cursor: default;
                pointer-events: none;
        }

        /* Fixed-width column so text is aligned regardless of checkmark presence */
        .checkmark {
                display: inline-block;
                width: 1.2em;
                flex-shrink: 0;
                font-size: 0.85em;
        }
</style>
