<script lang="ts">
        import { opds } from "$lib/stores/opdsStore";
        import TruncatedText from "$lib/components/TruncatedText.svelte";
        import BookActions from "$lib/components/BookActions.svelte";
        import PublicationMeta from "$lib/components/PublicationMeta.svelte";
        import AuthorLinks from "$lib/components/AuthorLinks.svelte";
        import { dwellintersect } from "$lib/actions/dwellintersect.js";
        export let publication: any;

        let publicationImage = opds.getPubImage(publication, "cover");
        let loaded = false;
        let imageError = false;

        let resolvedPublication = publication;
        let alternateState: "idle" | "loading" | "resolved" | "error" = "idle";

        function hasAlternatePublication(pub: any): boolean {
                return pub?.links?.some((l: any) => l?.rel === "alternate" && l?.type === "application/opds-publication+json") ?? false;
        }

        async function onDwell() {
                if (alternateState === "loading" || alternateState === "resolved") return;
                alternateState = "loading";
                try {
                        const result = await opds.resolveAlternateLinks(resolvedPublication);
                        const hadAlternates = hasAlternatePublication(resolvedPublication);
                        const newLinksAdded = result.links?.some((l: any) => l._source && l._source !== "self");
                        if (hadAlternates && !newLinksAdded) {
                                alternateState = "error";
                        } else {
                                alternateState = "resolved";
                        }
                        resolvedPublication = result;
                } catch {
                        alternateState = "error";
                }
        }

        function retryAlternateLinks() {
                alternateState = "idle";
                onDwell();
        }

        function handleVisibilityChange() {
                if (document.visibilityState !== "visible") return;
                if (alternateState !== "resolved") return;
                refreshResolvedPublication();
        }

        async function refreshResolvedPublication() {
                try {
                        const result = await opds.resolveAlternateLinks(publication);
                        resolvedPublication = result;
                } catch {
                        // keep stale data on failure
                }
        }

        function handleLoad() {
                loaded = true;
        }

        function handleError() {
                loaded = true;
                imageError = true;
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

        async function handleBorrowReturn(updatedPub: any, actionLink: any) {
                const mergedLinks = opds.mergeAcquisitionLinks(
                        resolvedPublication.links,
                        updatedPub.links,
                        actionLink,
                );
                resolvedPublication = {
                        ...resolvedPublication,
                        links: mergedLinks,
                        metadata: updatedPub.metadata ?? resolvedPublication.metadata,
                };
                resolvedPublication = await opds.resolveAlternateLinks(resolvedPublication);
        }

        $: linksLoading = hasAlternatePublication(publication) && alternateState !== "resolved" && alternateState !== "error";

        let innerWidth = 0;
        $: descriptionLimit = innerWidth > 600 ? 500 : 100;

        function createHref(pub: any) {
                const selfLink = opds.getSelfLink(pub);
                return selfLink
                        ? `?opds=${encodeURIComponent(selfLink.href)}`
                        : "#";
        }
</script>

<svelte:window bind:innerWidth={innerWidth} />
<svelte:document on:visibilitychange={handleVisibilityChange} />

<figure
        class="catalog"
        class:no-description={!publication.metadata.description}
        use:dwellintersect={{ dwell: 1000, callback: hasAlternatePublication(publication) ? onDwell : undefined }}
>
        <a
                class="image-container"
                href={createHref(publication)}
                on:click|preventDefault={() => handleNavClick(publication)}
                aria-label={publication.metadata.title}
        >
                {#if publicationImage && !imageError}
                        {#if loaded !== true}
                                <div
                                        class="skeleton-placeholder"
                                        style:display={loaded
                                                ? "none"
                                                : "block"}
                                ></div>
                        {/if}
                        <img
                                class="image-preview"
                                draggable="false"
                                src={publicationImage}
                                alt="{publication.metadata.title} cover"
                                on:load={handleLoad}
                                on:error={handleError}
                                style:opacity={loaded ? 1 : 0}
                        />
                {:else}
                        <div class="image-error-fallback">
                                <p>
                                        Cover<br />Unavailable
                                </p>
                        </div>
                {/if}
        </a>
        <BookActions
                publication={resolvedPublication}
                links={resolvedPublication.links || []}
                small
                loading={linksLoading}
                error={alternateState === "error"}
                onBorrowReturn={handleBorrowReturn}
                on:retry={retryAlternateLinks}
        />
        {#if publication.metadata.description}
                <div class="description-wrapper">
                        <TruncatedText
                                text={publication.metadata.description}
                                limit={descriptionLimit}
                        />
                </div>
        {/if}
        <figcaption>
                <div class="caption-stack">
                        <a
                                class="card-link"
                                href={createHref(publication)}
                                on:click|preventDefault={() => handleNavClick(publication)}
                        >
                                <h2 class="card-title" class:long-title={publication.metadata.title.length > 35}>{publication.metadata.title}</h2>
                        </a>
                        <p class="author-text subheading-preview">
                                <AuthorLinks {publication} />
                        </p>
                        <PublicationMeta {publication} />
                </div>
        </figcaption>
</figure>

<style>
        /* --- Base (desktop): image left, figcaption right --- */
        .image-preview {
                max-height: 20rem;
                object-fit: contain;
        }

        .image-container {
                display: grid;
                grid-template-areas: "stack";
                margin-bottom: auto;
                flex-shrink: 0;
        }

        .image-container > * {
                grid-area: stack;
        }

        @media (max-width: 600px) {
                .skeleton-placeholder {
                        width: 100%;
                }
        }

        img {
                transition: opacity 0.3s ease-in-out;
        }

        .image-error-fallback {
                background-color: var(--bg-card-subtle-overlay);
                border: 2px var(--text-subtle) dashed;
                border-radius: 0.40rem;
                width: 200px;
                height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 500;
        }

        .image-error-fallback p {
                font-size: 1.2rem;
                text-align: center;
                color: var(--text-subtle);
        }

        .card-link {
                display: block;
                text-decoration: none;
                color: inherit;
                min-width: 0;
        }

        .caption-stack {
                display: flex;
                flex-direction: column;
                gap: var(--gap-xxsmall);
                min-width: 0;
        }

        /* --- Desktop/Tablet: image beside title+actions, description full width --- */
        figure {
                display: grid;
                grid-template-columns: auto 1fr;
                grid-template-rows: auto auto auto;
                gap: var(--gap-medium);
        }

        figure.no-description {
                grid-template-rows: auto auto;
        }

        .image-container {
                grid-column: 1;
                grid-row: 1 / 3;
                align-self: start;
        }

        figcaption {
                grid-column: 2;
                grid-row: 1;
                align-self: start;
                min-width: 0;
        }

        figure > :global(.book-actions) {
                grid-column: 2;
                grid-row: 2;
                min-width: 0;
                height: fit-content;
        }

        figure > :global(.book-actions.small) {
                margin-top: auto;
        }

        .description-wrapper {
                grid-column: 1 / -1;
                grid-row: 3;
                min-width: 0;
        }

        /* --- Mobile: image + title row, actions + description full width --- */
        @media (max-width: 600px) {
                figure {
                        grid-template-columns: 30% 1fr;
                        gap: var(--gap-small);
                }

                .image-container {
                        grid-column: 1;
                        grid-row: 1;
                }

                figcaption {
                        grid-column: 2;
                        grid-row: 1;
                }

                figure > :global(.book-actions) {
                        grid-column: 1 / -1;
                        grid-row: 2;
                }

                figure > :global(.book-actions.small) {
                        margin-top: 0;
                }

                .description-wrapper {
                        grid-row: 3;
                }

                .image-preview {
                        max-width: 100%;
                        max-height: none;
                        height: auto;
                }

                .image-error-fallback {
                        width: 100%;
                        height: auto;
                        aspect-ratio: 2/3;
                }

                .card-title {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                }

                .card-title.long-title {
                        font-size: var(--text-size-sm);
                }
        }

        /* --- Tall mobile: image stacked above title/author --- */
        @media (max-width: 600px) and (min-height: 700px) {
                figure {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto auto auto;
                }

                figure.no-description {
                        grid-template-rows: auto auto auto;
                }

                .image-container {
                        grid-column: 1;
                        grid-row: 1;
                        justify-self: center;
                }

                .image-preview {
                        max-height: 25svh;
                        max-width: 100%;
                        height: auto;
                }

                .skeleton-placeholder {
                        width: auto;
                        height: 25svh;
                        aspect-ratio: 2/3;
                }

                .image-error-fallback {
                        width: auto;
                        height: 25svh;
                        aspect-ratio: 2/3;
                }

                figcaption {
                        grid-column: 1;
                        grid-row: 2;
                }

                figure > :global(.book-actions) {
                        grid-column: 1;
                        grid-row: 3;
                }

                .description-wrapper {
                        grid-column: 1;
                        grid-row: 4;
                }

                .card-title {
                        white-space: normal;
                }
        }
</style>
