<script lang="ts">
        import { onMount, tick } from "svelte";
        import { opds } from "$lib/stores/opdsStore.js";
        import { handleImplicitFlow, handlePkceFlow, handleOAuthError } from "$lib/auth.js";
        import { pwa, shouldShowInstallPage } from "$lib/stores/pwaStore.js";
        import { fly } from "svelte/transition";

        // Import View Components
        import Feed from "$lib/components/views/Feed.svelte";
        import Publication from "$lib/components/views/Publication.svelte";
        import Auth from "$lib/components/views/Auth.svelte";
        import Profile from "$lib/components/views/Profile.svelte";
        import Navbar from "$lib/components/Navbar.svelte";
        import InstallPage from "$lib/components/views/InstallPage.svelte";
        import Toasts from "$lib/components/Toasts.svelte";

        const viewComponents = {
                Feed,
                Publication,
                Auth,
                Profile,
        };

        $: searchEnabled = currentView !== Publication;

        $: viewKey =
                $opds.state.links?.find((l: any) => l.rel === "self")?.href ||
                $opds.state.metadata?.title ||
                Date.now();

        let currentView: any;
        $: {
                if ($opds.mimetype) {
                        const componentName = opds.getViewComponent(
                                $opds.mimetype as any,
                        );
                        if (componentName) {
                                currentView = viewComponents[componentName as keyof typeof viewComponents];
                        }
                }
        }

        let feedLoaded = false;
        let oauthError: string | undefined;

        async function loadFeed() {
                if (feedLoaded) return;
                feedLoaded = true;

                const authError = handleOAuthError();
                if (authError) {
                        oauthError = authError;
                        return;
                }

                let intent: string | undefined;
                let url: string | undefined;

                const implicit = handleImplicitFlow();
                if (implicit) {
                        url = implicit.retryUrl;
                        intent = implicit.intent;
                } else {
                        const pkce = await handlePkceFlow();
                        if (pkce) {
                                url = pkce.retryUrl;
                                intent = pkce.intent;
                        }
                }

                if (url === undefined) {
                        url = opds.getOpdsUrlFromQuery();
                }

                await tick();
                opds.loadFromUrl(url, "application/json", {
                        history: "replace",
                        setLoading: true,
                        intent,
                });
        }

        let mounted = false;

        $: if (mounted && !$shouldShowInstallPage) {
                loadFeed();
        }

        function retryLoad() {
                feedLoaded = false;
                loadFeed();
        }

        onMount(() => {
                pwa.init();
                mounted = true;

                // When the PWA returns from the background, retry if stuck on error.
                function onVisibilityChange() {
                        if (document.visibilityState === "visible" && $opds.mode === "error") {
                                retryLoad();
                        }
                }
                document.addEventListener("visibilitychange", onVisibilityChange);
                return () => document.removeEventListener("visibilitychange", onVisibilityChange);
        });

        export const ssr = false;
</script>

<svelte:window on:popstate={(e) => opds.handlePopstate(e)} />

{#if $shouldShowInstallPage}
        <InstallPage platform={$pwa.platform} />
{:else}

{#if $opds.mode === "loaded"}
        <Navbar {searchEnabled} />
{/if}

{#if oauthError}
        <div
                style="max-width: var(--container-lg); margin: 4rem auto 0;"
        >
                <div class="content">
                        <main id="main-content" class="error" role="alert">
                                <h1>Failed to sign you in.</h1>
                                <p>
                                        Something went wrong during sign-in. Please
                                        try again later.
                                </p>
                                <a
                                        href="/"
                                        class="acquisition small return"
                                >Go home</a>
                        </main>
                </div>
        </div>
{:else if $opds.mode === "loading"}
{#key viewKey}
<div class="loader-overlay content" role="status">
        <span class="loader"></span>
</div>
{/key}
{/if}

{#if $opds.mode === "loaded"}
        <div
                style="max-width: var(--container-lg); margin: 4rem auto 0;"
        >
                {#key viewKey}
                        <div class="content">
                                <svelte:component this={currentView} />
                        </div>
                {/key}
        </div>
{/if}
{#if $opds.mode === "error"}
        <div
                style="max-width: var(--container-lg); margin: 4rem auto 0;"
        >
                <div class="content">
                        <main id="main-content" class="error" role="alert">
                                <h1>Something went wrong.</h1>
                                <p>
                                        We were unable to show this page. Please
                                        try again later.
                                </p>
                                <div class="error-actions">
                                        <button
                                                class="acquisition small"
                                                on:click={retryLoad}>Retry</button
                                        >
                                        {#if window.location.search !== ""}
                                                <button
                                                        class="acquisition small return"
                                                        on:click={() => {
                                                                history.back();
                                                        }}>Go back</button
                                                >
                                        {/if}
                                </div>
                        </main>
                </div>
        </div>
{/if}

<Toasts />

{/if}

<style>
        .error {
                display: flex;
                flex-direction: column;
                gap: var(--gap-medium);
                min-height: calc(100svh - 4rem);
                justify-content: center;
        }
        .error-actions {
                display: flex;
                gap: var(--gap-medium);
        }
        .return::before {
                content: "«";
                padding-right: var(--gap-small);
        }
</style>
