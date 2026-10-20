<script lang="ts">
        import { onMount } from "svelte";
        import { carouselScroll } from "$lib/stores/carouselStore.js";
        import CarouselItem from "$lib/components/CarouselItem.svelte";

        export let id: string;
        export let publications;
        let el: any;

        onMount(() => {
                const unsubscribe = carouselScroll.subscribe((values) => {
                        if (values[id] != null) {
                                el.scrollLeft = values[id];
                        }
                });

                return unsubscribe;
        });

        function saveScroll() {
                carouselScroll.update((v) => ({ ...v, [id]: el.scrollLeft }));
        }
</script>

<div class="border carousel">
        <ul bind:this={el} on:scroll={saveScroll}>
                {#each publications as publication}
                        <CarouselItem {publication} />
                {/each}
        </ul>
</div>

<style>
        .carousel {
                background-color: var(--bg-card);
                padding: var(--gap-medium);
                border-radius: 20px;
                overflow: hidden;

                @media (max-width: 600px) {
                        margin-left: calc(-1 * var(--content-padding));
                        margin-right: calc(-1 * var(--content-padding));
                        border-radius: 0;
                        padding-left: 0;
                        padding-right: 0;
                }

                ul {
                        scrollbar-width: thin;

                        @media (hover: none) and (pointer: coarse) {
                                scrollbar-width: none;

                                &::-webkit-scrollbar {
                                        display: none;
                                }
                        }

                        padding-left: 0;
                        display: flex;
                        list-style: none;
                        flex-wrap: nowrap;
                        max-width: 100%;
                        flex-direction: row;
                        gap: var(--gap-small);
                        overflow-y: hidden;
                        overflow-x: scroll;
                        min-height: 300px;

                        @media (max-width: 600px) {
                                padding-left: var(--content-padding);
                                padding-right: var(--content-padding);
                        }

                        & > :global(li) {
                                flex-shrink: 0;
                        }
                }
        }
</style>
