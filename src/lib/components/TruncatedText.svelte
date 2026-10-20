<script lang="ts">
        import DOMPurify from 'dompurify';
        // The content to be truncated
        export let text: string;
        // The maximum number of characters before truncation
        export let limit: number = 200;
        export let heading: string = "";

        let expanded = false;

        $: rawDescription = text || "";
        $: shouldTruncate = rawDescription.length > limit;

        // Function to safely truncate the raw HTML string
        function getTruncatedDescription(
                description: string,
                truncateLimit: number,
        ): string {
                if (description.length <= truncateLimit) {
                        return description;
                }
                // Find the last space before the limit to avoid cutting a word
                let truncated = description.substring(0, truncateLimit);
                const lastSpace = truncated.lastIndexOf(" ");
                if (lastSpace !== -1) {
                        truncated = truncated.substring(0, lastSpace);
                }
                return truncated + "...";
        }

        // Reactive declaration for the content to display
        $: displayDescription =
                expanded || !shouldTruncate
                        ? rawDescription
                        : getTruncatedDescription(rawDescription, limit);
</script>

<div class="description-card">
        {#if heading}<h3>{heading}</h3>{/if}
        {#if rawDescription}
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <p
                        class="description-text"
                        class:clickable={shouldTruncate}
                        tabindex={shouldTruncate ? 0 : undefined}
                        role={shouldTruncate ? "button" : undefined}
                        aria-expanded={shouldTruncate ? expanded : undefined}
                        on:click={() => shouldTruncate && (expanded = !expanded)}
                        on:keydown={(e) => shouldTruncate && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), expanded = !expanded)}
                >
                        {@html DOMPurify.sanitize(displayDescription)}
                        {#if shouldTruncate}
                                <span class="toggle-hint">{expanded ? "less" : "more"}</span>
                        {/if}
                </p>
        {/if}
</div>

<style>
        .description-card {
                background-color: var(--bg-card-secondary);
                border-radius: 0.75rem;
                padding: var(--gap-small);
        }

        .description-text {
                margin-bottom: 0;
                overflow: hidden;
                font-size: var(--text-size-sm);
        }

        .description-text.clickable {
                cursor: pointer;
        }

        .toggle-hint {
                font-weight: bold;
                font-size: inherit;
                text-transform: lowercase;
                margin-left: 0.25em;
        }
</style>
