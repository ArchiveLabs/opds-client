<script lang="ts">
        import { opds } from "$lib/stores/opdsStore.js";
        import TruncatedText from "$lib/components/TruncatedText.svelte";
        import Modal from "$lib/components/Modal.svelte";
        import BookActions from "$lib/components/BookActions.svelte";
        import PublicationMeta from "$lib/components/PublicationMeta.svelte";
        import AuthorLinks from "$lib/components/AuthorLinks.svelte";

        $: publication = $opds.state as any;
        $: metadata = publication.metadata;
        console.log(publication);
        $: acquisitionRefresh = $opds.acquisitionRefresh;
        $: acquisitionLinks = acquisitionRefresh.status === "idle"
                ? acquisitionRefresh.links
                : [];

        $: publicationImage = opds.getPubImage(publication, "cover");

        $: actionError = $opds.actionError;
        function handleFocus() {
                if (document.visibilityState !== "visible") return;
                opds.refreshAcquisitionLinks();
        }

        async function sharePublication() {
                const shareData = {
                        title: metadata.title,
                        text: `${metadata.title}`,
                        url: window.location.href,
                };

                try {
                        await navigator.share(shareData);
                } catch (err) {
                        console.error("Error sharing:", err);
                }
        }

        let loaded = false;
        let imageError = false;
        $: if (publicationImage) { loaded = false; imageError = false; }

</script>

<svelte:document on:visibilitychange={handleFocus} />
<main id="main-content" class="publication-container">
        <section class="book-details-container" class:no-description={!publication.metadata.description}>
                        <div class="image-container">
                                {#if publicationImage && !imageError}
                                        <div
                                                class="skeleton-placeholder-lg"
                                                style:display={loaded
                                                        ? "none"
                                                        : "block"}
                                        ></div>
                                        <img
                                                class="image-big"
                                                src={opds.getPubImage(
                                                        publication,
                                                        "cover",
                                                )}
                                                alt="{metadata.title} cover"
                                                on:load={() => (loaded = true)}
                                                on:error={() => { loaded = true; imageError = true; }}
                                                style:opacity={loaded ? 1 : 0}
                                        />
                                {:else}
                                        <div class="image-fallback striped-background">
                                                <p class="image-fallback-text">
                                                        Cover<br />Unavailable
                                                </p>
                                        </div>
                                {/if}
                        </div>

                        <div style="width: 100%" class="text-content">
                                <div
                                        style="display: flex; justify-content: space-between; align-items: center"
                                >
                                        <h1
                                                class:long-title={metadata.title
                                                        .length > 40}
                                                class:very-long-title={metadata
                                                        .title.length > 80}
                                        >
                                                {metadata.title}
                                        </h1>
                                        {#if typeof navigator.share === 'function'}
                                                <button
                                                        class="share"
                                                        on:click={sharePublication}
                                                        aria-label="Share"
                                                >
                                                </button>
                                        {/if}
                                </div>

                                <p class="author-text subheading">
                                        <AuthorLinks {publication} />
                                </p>

                                <PublicationMeta {publication} />

                                <BookActions
                                        {publication}
                                        links={acquisitionLinks}
                                        loading={acquisitionRefresh.status === "loading"}
                                        error={acquisitionRefresh.status === "error"}
                                />
                        </div>
                </section>
                {#if publication.metadata.description}
                        <section class="description">
                                <TruncatedText
                                        text={publication.metadata.description}
                                        heading="About"
                                        limit={500}
                                />
                        </section>
                {/if}
        {#if actionError}
                <Modal onclose={() => opds.clearActionError()}>
                        <div role="alertdialog" aria-labelledby="actionErrorTitle" tabindex="-1">
                                <h3 id="actionErrorTitle">Action Failed</h3>
                                <p>{actionError}</p>
                                <button class="small acquisition raised" on:click={() => opds.clearActionError()}>
                                        Dismiss
                                </button>
                        </div>
                </Modal>
        {/if}


</main>

<style>
        .share {
                background: transparent;
                border: none;
                color: var(--text-primary);
                cursor: pointer;
                align-items: center;
                width: fit-content;
                height: fit-content;
        }
        .share::before {
                content: "";
                mask: url("../../../share.svg") no-repeat center;
                background-color: var(--text-normal);
                height: 25px;
                width: 25px;
                display: inline-block;
        }
        .publication-container {
                display: flex;
                flex-direction: column;
                margin-bottom: var(--margin-end);
        }

        .book-details-container {
                display: flex;
                gap: var(--gap-medium);
                width: 100%;
                padding: var(--gap-medium);
                background-color: var(--bg-card);
                border-radius: var(--border-radius-big-card);
                z-index: 2;
        }

        .text-content {
                display: flex;
                flex-direction: column;
                gap: var(--gap-tiny);
        }
        .image-container {
                display: grid;
                grid-template-areas: "stack";
                justify-items: center;
                align-self: center;
                width: 20rem;
                max-width: 100%;
                flex-shrink: 0;
        }
        .image-container > * {
                grid-area: stack;
        }
        img {
                transition: opacity 0.3s ease-in-out;
                max-width: 100%;
                max-height: 30rem;
        }
        .skeleton-placeholder-lg {
                animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                background-color: #e5e7eb;
                border-radius: 1rem;
                width: 100%;
                aspect-ratio: 2 / 3;
                align-self: start;
                transition: opacity 0.2s ease-in-out;
        }
        .text-content h1.long-title {
                font-size: 1.5rem;
        }

        .text-content h1.very-long-title {
                font-size: 1.25rem;
        }
        .description {
                gap: var(--gap-small);
                display: flex;
                flex-direction: column;
                padding: var(--gap-medium);
                padding-top: var(--gap-medium);
                margin-top: -1rem;
                background-color: var(--bg-card);
                border-bottom-left-radius: var(--border-radius-big-card);
                border-bottom-right-radius: var(--border-radius-big-card);
        }


        .image-fallback {
                background-color: var(--bg-card-subtle-overlay);
                border: 2px var(--text-subtle) dashed;
                border-radius: 0.60rem;
                width: 100%;
                aspect-ratio: 2 / 3;
                display: flex;
                align-items: center;
                justify-content: center;
        }
        .image-fallback-text {
                font-size: 1.2rem;
                font-weight: 500;
                text-align: center;
        }

        @media (max-width: 768px) {
                .book-details-container {
                        flex-direction: column;
                        align-items: center;
                        padding-bottom: 0;
                }
                .book-details-container.no-description {
                        padding-bottom: var(--gap-medium);
                        border-bottom-left-radius: var(--border-radius-big-card);
                        border-bottom-right-radius: var(--border-radius-big-card);
                }
                .image-container {
                        align-self: auto;
                        width: auto;
                }
                .image-big {
                        max-height: 40svh;
                        width: auto;
                }
                .skeleton-placeholder-lg,
                .image-fallback {
                        height: 40svh;
                        width: auto;
                }
                .text-content {
                        text-align: left;
                }
        }
</style>
