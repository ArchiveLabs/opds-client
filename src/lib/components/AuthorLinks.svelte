<script lang="ts">
        import { opds } from "$lib/stores/opdsStore.js";

        export let publication: any;

        type AuthorEntry = { name: string; link: { href: string; type: string } | null };

        function getAuthorLink(author: any): { href: string; type: string } | null {
                const links = author?.links;
                if (!Array.isArray(links)) return null;
                const opdsLink = links.find(
                        (l: any) => l?.type === "application/opds+json" && typeof l.href === "string",
                );
                return opdsLink ? { href: opdsLink.href, type: opdsLink.type } : null;
        }

        function toEntries(authorMeta: any): { entries: AuthorEntry[]; truncated: boolean } {
                if (!authorMeta) return { entries: [{ name: "Unknown author", link: null }], truncated: false };
                if (typeof authorMeta === "string") {
                        return { entries: [{ name: authorMeta, link: null }], truncated: false };
                }
                if (Array.isArray(authorMeta)) {
                        const truncated = authorMeta.length > 3;
                        const slice = truncated ? authorMeta.slice(0, 3) : authorMeta;
                        const entries = slice
                                .map((a: any) => {
                                        if (typeof a === "string") return { name: a, link: null } as AuthorEntry;
                                        return { name: a?.name ?? "", link: getAuthorLink(a) } as AuthorEntry;
                                })
                                .filter((e: AuthorEntry) => e.name);
                        return { entries, truncated };
                }
                if (typeof authorMeta === "object") {
                        const name = authorMeta?.name;
                        if (!name) return { entries: [{ name: "Unknown author", link: null }], truncated: false };
                        return { entries: [{ name, link: getAuthorLink(authorMeta) }], truncated: false };
                }
                return { entries: [{ name: String(authorMeta), link: null }], truncated: false };
        }

        $: ({ entries, truncated } = toEntries(publication?.metadata?.author));

        function createHref(href: string) {
                return `?opds=${encodeURIComponent(href)}`;
        }

        function handleAuthorClick(link: { href: string; type: string }) {
                opds.loadFromUrl(link.href, link.type, { history: "push", setLoading: true });
        }
</script>

{#each entries as author, i}{#if author.link}<a
                        class="author-link"
                        href={createHref(author.link.href)}
                        on:click|preventDefault={() => handleAuthorClick(author.link!)}
                >{author.name}</a>{:else}{author.name}{/if}{#if i < entries.length - 1}, {/if}{/each}{#if truncated}... and more{/if}

<style>
        .author-link {
                color: inherit;
                text-decoration: underline;
                text-decoration-thickness: 1px;
                text-underline-offset: 0.15em;
                text-decoration-color: var(--text-subtle);
        }
        .author-link:hover {
                text-decoration-color: currentColor;
        }
</style>
