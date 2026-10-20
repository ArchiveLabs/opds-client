<script lang="ts">
        import { opds } from "$lib/stores/opdsStore.js";
        export let publication;

        let loaded = false;
        let error = false;
</script>

<div
        class="image-container"
>
        {#if !loaded || error}
                <div
                        class="skeleton-placeholder"
                        style:display={loaded && !error ? "none" : "block"}
                ></div>
        {/if}

        {#if !error}
                <img
                        class="image-preview"
                        draggable="false"
                        alt="{publication.metadata.title} cover"
                        src={opds.getPubImage(publication, "cover")}
                        on:load={() => (loaded = true)}
                        on:error={() => { loaded = true; error = true; }}
                        style:opacity={loaded ? 1 : 0}
                />
        {/if}
</div>

<style>
        img {
                border-radius: 0.5rem;
                -webkit-touch-callout: none;
                user-select: none;
                pointer-events: auto;
                max-height: 18rem;
                transition:
                        transform 0.55s ease,
                        box-shadow 0.55s ease;
        }

        .image-container {
                display: grid;
                grid-template-areas: "stack";
                border-radius: 1rem;
                margin-top: auto;
                margin-bottom: auto;
                margin-left: auto;
                margin-right: auto;
        }
        .image-container > :global(*) {
                grid-area: stack;
        }
        .image-preview {
                transition: opacity 300ms ease-in-out;
        }
</style>
