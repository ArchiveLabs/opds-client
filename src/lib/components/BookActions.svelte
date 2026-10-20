<script lang="ts">
	import { opds } from "$lib/stores/opdsStore.js";
	import { isStandalone } from "$lib/stores/pwaStore";
	import { toasts } from "$lib/stores/toastStore";
	import { getLcpFormat } from "$lib/lcp.js";
	import { getAcquisitionLinks } from "$lib/acquisitions.js";
	import PublicationBadges from "$lib/components/PublicationBadges.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import { displayDateDiff } from "$lib/utils/dateDiff";
	import { createEventDispatcher } from "svelte";

	export let publication: any;
	export let links: any[];
	export let small = false;
	export let loading = false;
	export let error = false;
	export let onBorrowReturn: ((publication: any, actionLink: any) => void) | undefined = undefined;

	const dispatch = createEventDispatcher();

	$: acq = getAcquisitionLinks(links);
	$: ({
		borrowLinks, readLinks, returnLink, buyLinks,
		openAccessLinks, readOnlineOpenAccess, downloadableOpenAccess,
		lcpLinks, sample, availability, hasDownloads,
	} = acq);

	$: metadata = publication.metadata;
	$: isAudiobook = opds.isAudiobook(publication);
	$: readLabel = isAudiobook ? "Listen Online" : "Read Online";
	$: currentUrl = $opds.attemptedUrl;

	let attemptingAction = false;
	let showDownloadOptions = false;
	let showBuyOptions = false;

	$: primaryBorrowAction = (() => {
		if (!links.length) return null;
		if (availability && availability.type === "available") {
			return links.find((link: any) => opds.shouldShowBorrow(link));
		}
		return null;
	})();

	interface AcquisitionEntry {
		label: string;
		hint: string;
		format?: string | null;
		price?: string | null;
		icon: "download" | "external" | "buy" | "borrow" | "return";
		href?: string;
		download?: string;
		disabled?: boolean;
		primary?: boolean;
		rawLink: any;
		action: string;
	}

	$: buyEntries = (() => {
		const entries: AcquisitionEntry[] = [];
		for (const link of buyLinks) {
			const price = opds.getPrice(link);
			const format = opds.mimetypeToFormat(link);
			const hint = link.type === "application/epub+zip" ? "Google Play Books, Apple Books, Kobo" :
			             link.type === "application/pdf" ? "Any device, print layouts" :
			             "Read in external e-reader";
			entries.push({
				label: format || "File",
				hint,
				format: null,
				price: price || null,
				icon: "external",
				rawLink: link,
				action: "buy",
			});
		}
		return entries;
	})();

	$: downloadEntries = (() => {
		const entries: AcquisitionEntry[] = [];
		for (const oa of downloadableOpenAccess) {
			const formatLabel = opds.mimetypeToFormat(oa) || "File";
			const ext = oa.type === "application/epub+zip" ? "epub" :
			            oa.type === "application/pdf" ? "pdf" :
			            oa.type === "audio/mpeg" ? "mp3" : null;
			entries.push({
				label: formatLabel,
				hint: oa.type === "application/epub+zip" ? "Google Play Books, Apple Books, Kobo" :
				      oa.type === "application/pdf" ? "Any device, print layouts" :
				      oa.type === "audio/mpeg" ? "Apple Music, VLC, any media player" : "Download file",
				format: ext,
				icon: "download",
				href: opds.isInternetArchiveUrl(oa.href) ? oa.href : undefined,
				rawLink: oa,
				action: opds.isInternetArchiveUrl(oa.href) ? "download-ia" : "download-external",
			});
		}
		for (const link of lcpLinks) {
			const url = new URL(link.href);
			const title = metadata?.title || "ebook";
			const filename = `${title.replace(/[<>:"/\\|?*]+/g, "_").trim() || "ebook"}.lcpl`;
			entries.push({
				label: getLcpFormat(link),
				hint: "Thorium Mobile",
				format: "lcpl",
				icon: "download",
				href: url.toString(),
				download: filename,
				rawLink: link,
				action: "lcp",
			});
		}
		return entries;
	})();

	interface PublisherGroup {
		publisher: string;
		buttons: Array<{ label: string; action: () => void; class: string; showsLoading?: boolean }>;
		links: any[];
	}

	$: publisherGroups = (() => {
		const groups = new Map<string, { buttons: PublisherGroup["buttons"]; links: any[] }>();
		function ensureGroup(publisher: string) {
			if (!groups.has(publisher)) groups.set(publisher, { buttons: [], links: [] });
			return groups.get(publisher)!;
		}
		function addButton(publisher: string, button: PublisherGroup["buttons"][0], link?: any) {
			const group = ensureGroup(publisher);
			group.buttons.push(button);
			if (link) group.links.push(link);
		}
		function trackLink(publisher: string, link: any) {
			ensureGroup(publisher).links.push(link);
		}

		for (const oa of readOnlineOpenAccess) {
			const publisher = opds.renderPublisher(oa.title) || "Internet Archive";
			// Open-access links are intentionally not associated with the
			// group's availability tracking — they represent a perpetual
			// "always available" state, not the borrow lifecycle, so groups
			// that only contain OA links should render no badge at all
			// (e.g. Standard Ebooks).
			if (opds.isInternetArchiveUrl(oa.href)) {
				addButton(publisher, {
					label: readLabel,
					class: "small acquisition raised external",
					action: () => {
						const url = opds.withReturnUrl(oa.href);
						if (isStandalone()) {
							window.open(url, "_blank");
						} else {
							window.location.href = url;
						}
					},
				});
			} else {
				addButton(publisher, {
					label: readLabel,
					class: "small acquisition raised external",
					action: () => {
						window.open(oa.href, "_blank", "noopener,noreferrer");
					},
				});
			}
		}

		for (const link of readLinks) {
			const publisher = opds.renderPublisher(link.title) || "Internet Archive";
			addButton(publisher, {
				label: readLabel,
				class: "small acquisition raised external",
				showsLoading: true,
				action: () => {
					attemptingAction = true;
					opds.loadFromUrl(link.href, link.type, { history: "pushOnFail", setLoading: false })
						.then(() => (attemptingAction = false));
				},
			}, link);
		}

		// Always register borrow links with their publisher group so the
		// group exists even in the "unavailable" case (where no button is
		// rendered but the disabled "Checked out" placeholder still shows).
		for (const link of borrowLinks) {
			const publisher = opds.renderPublisher(link.title) || "Internet Archive";
			trackLink(publisher, link);
		}

		if (borrowLinks.length > 0 && (availability?.type === "available" || availability?.type === "ready" || !availability)) {
			for (const link of borrowLinks) {
				const publisher = opds.renderPublisher(link.title) || "Internet Archive";
				addButton(publisher, {
					label: availability?.type === "ready" ? readLabel : "Borrow",
					class: availability?.type === "ready" ? "small acquisition raised external" : "small acquisition raised borrow-icon",
					showsLoading: true,
					action: async () => {
						attemptingAction = true;
						try {
							if (onBorrowReturn) {
								const response = await opds.authenticatedFetch(primaryBorrowAction.href);
								if (response.status === 401) {
									await opds.loadFromUrl(primaryBorrowAction.href, primaryBorrowAction.type, { history: "pushOnFail", setLoading: false, intent: "borrow" });
									return;
								}
								if (!response.ok) {
									const body = await response.json().catch(() => null);
									opds.setActionError(body?.error || `Request failed (${response.status})`);
									return;
								}
								const data = await response.json();
								onBorrowReturn(data, primaryBorrowAction);
								toasts.show("Book borrowed", "success");
							} else {
								await opds.loadFromUrl(primaryBorrowAction.href, primaryBorrowAction.type, { history: "pushOnFail", setLoading: false, intent: "borrow" });
							}
						} finally {
							attemptingAction = false;
						}
					},
				}, link);
			}
		}

		if (hasDownloads) {
			const downloadPublishers = new Set<string>();
			for (const oa of downloadableOpenAccess) {
				downloadPublishers.add(opds.renderPublisher(oa.title) || "Internet Archive");
			}
			for (const link of lcpLinks) {
				downloadPublishers.add(opds.renderPublisher(link.title) || "Internet Archive");
			}
			for (const publisher of downloadPublishers) {
				addButton(publisher, {
					label: "Download",
					class: "small acquisition raised download-icon",
					action: () => (showDownloadOptions = true),
				});
			}
		}

		if (buyLinks.length > 0) {
			const buyPublishers = new Set<string>();
			for (const link of buyLinks) {
				buyPublishers.add(opds.renderPublisher(link.title) || "Retailer");
			}
			const price = opds.getPrice(buyLinks[0]);
			for (const publisher of buyPublishers) {
				addButton(publisher, {
					label: price || "Buy",
					class: "small acquisition raised external",
					action: () => (showBuyOptions = true),
				});
			}
		}

		if (returnLink) {
			const publisher = groups.keys().next().value || "Internet Archive";
			addButton(publisher, {
				label: "Return Book",
				class: "small acquisition raised",
				showsLoading: true,
				action: async () => {
					attemptingAction = true;
					try {
						if (onBorrowReturn) {
							const response = await opds.authenticatedFetch(returnLink.href);
							if (response.status === 401) {
								await opds.loadFromUrl(returnLink.href, returnLink.type, { history: "pushOnFail", setLoading: false });
								return;
							}
							if (!response.ok) {
								const body = await response.json().catch(() => null);
								opds.setActionError(body?.error || `Request failed (${response.status})`);
								return;
							}
							const data = await response.json();
							onBorrowReturn(data, returnLink);
						} else {
							await opds.loadFromUrl(returnLink.href, returnLink.type, { history: "pushOnFail", setLoading: false });
						}
					} finally {
						attemptingAction = false;
					}
				},
			}, returnLink);
		}

		return [...groups.entries()].map(([publisher, group]) => ({
			publisher,
			buttons: group.buttons,
			availability: group.links.length ? opds.getAvailability({ links: group.links }) : undefined,
		}));
	})();

	function handleDownloadAction(entry: AcquisitionEntry) {
		showDownloadOptions = false;
		if (entry.action === "download-external") {
			window.open(entry.rawLink.href, "_blank", "noopener,noreferrer");
		}
	}

	function handleBuyAction(entry: AcquisitionEntry) {
		showBuyOptions = false;
		window.open(entry.rawLink.href, "_blank", "noopener,noreferrer");
	}
</script>

<section
	class="book-actions"
	class:small
	aria-busy={loading}
>
	{#if !small}
		<h3>{isAudiobook ? "Audiobook" : "Book"}</h3>
	{/if}

	{#if loading}
		<div class="skeleton-placeholder" style="height: 2.5rem; border-radius: var(--border-radius-menu);"></div>
		<div class="skeleton-placeholder" style="height: 1rem; width: 60%; border-radius: var(--border-radius-menu);"></div>
	{:else if error}
		<p class="meta-text">Could not load availability.
			<span
				class="retry-icon"
				role="button"
				tabindex="0"
				aria-label="Retry"
				on:click={() => { dispatch("retry"); if (!small) opds.refreshAcquisitionLinks(); }}
				on:keydown={(e) => { if (e.key === 'Enter') { dispatch("retry"); if (!small) opds.refreshAcquisitionLinks(); } }}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
					<path d="M13.5 3v1.5H12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</span>
		</p>
	{/if}

	{#if !loading}
		{#if !small && opds.isInternetArchiveUrl(currentUrl) && !(availability?.type === "ready" && availability.until)}
			<a
				class="ia-faq-info"
				href="https://help.archive.org/help/borrowing-from-the-lending-library/"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Internet Archive borrowing FAQ"
			>?</a>
		{/if}

		{#if !small && sample && openAccessLinks.length === 0}
			<a
				role="button"
				class="big acquisition raised"
				href={sample.href}
				target="_blank"
				rel="noopener noreferrer"
			>
				Read Sample
			</a>
		{/if}

		{#each publisherGroups as group}
			<div class="publisher-group">
				<p class="publisher-label">{group.publisher}</p>
				{#if group.availability && group.availability.type !== "unavailable"}
					<div style="--bg-badge: var(--bg-card);">
						<PublicationBadges availability={group.availability} />
					</div>
				{/if}
				<div class="action-buttons">
					{#if group.availability?.type === "unavailable"}
						<button class="small acquisition clock-icon" disabled>
							Checked out
						</button>
						{#if group.availability.until}
							<span class="date-pill"
							>Available in {displayDateDiff(new Date(), new Date(group.availability.until))}</span>
						{/if}
					{/if}
					{#each group.buttons as button}
						<button
							class={button.class}
							on:click|stopPropagation={button.action}
							disabled={button.showsLoading && attemptingAction}
							aria-busy={button.showsLoading && attemptingAction ? "true" : undefined}
						>
							{button.label}
						</button>
					{/each}
				</div>
			</div>
		{/each}

		{#if showDownloadOptions}
			<Modal onclose={() => (showDownloadOptions = false)}>
				<div class="download-detail">
					<h3>Select format</h3>
					<div class="download-options">
						{#each downloadEntries as entry}
							<a
								role="button"
								class="small acquisition raised download-icon download-option-btn"
								href={entry.href || undefined}
								download={entry.download || undefined}
								target={entry.download ? undefined : entry.href ? "_blank" : undefined}
								rel={!entry.download && entry.href ? "noopener noreferrer" : undefined}
								on:click|stopPropagation={() => {
									if (!entry.href) handleDownloadAction(entry);
								}}
							>
								<span class="download-option-content">
									<span class="download-option-top">
										<span class="download-option-label">{entry.label}</span>
										{#if entry.format}
											<span class="format-pill">{entry.format}</span>
										{/if}
									</span>
									<span class="download-option-hint">{entry.hint}</span>
								</span>
							</a>
						{/each}
					</div>
				</div>
			</Modal>
		{/if}

		{#if showBuyOptions}
			<Modal onclose={() => (showBuyOptions = false)}>
				<div class="download-detail">
					<h3>Purchase and download</h3>
					<div class="download-options">
						{#each buyEntries as entry}
							<button
								class="small acquisition raised external download-option-btn"
								on:click|stopPropagation={() => handleBuyAction(entry)}
							>
								<span class="download-option-content">
									<span class="download-option-top">
										<span class="download-option-label">{entry.label}</span>
										{#if entry.price}
											<span class="price-pill">{entry.price}</span>
										{/if}
									</span>
									<span class="download-option-hint">{entry.hint}</span>
								</span>
							</button>
						{/each}
					</div>
					{#if opds.renderPublisher(buyEntries[0]?.rawLink?.title)}
    						<p class="external-retailer-notice">{opds.renderPublisher(buyEntries[0]?.rawLink?.title)} is a separate, independent site.</p>
					{/if}
				</div>
			</Modal>
		{/if}
	{/if}
</section>

<style>
	.book-actions {
		display: flex;
		flex-direction: column;
		gap: var(--gap-small);
		padding: var(--gap-small);
		background-color: var(--bg-card-secondary);
		border-radius: var(--border-radius-menu);
		position: relative;
		margin-top: auto;
	}

	.book-actions.small {
		padding: var(--gap-small);
		gap: var(--gap-xsmall);
		margin-top: 0;
		align-self: flex-start;
		min-height: 3.5rem;
	}

	@media (max-width: 800px) {
		.book-actions.small {
			align-self: stretch;
		}
	}

	.meta-text {
		color: var(--text-subtle);
		font-size: 0.9rem;
	}

	.retry-icon {
		display: inline-flex;
		vertical-align: middle;
		cursor: pointer;
		color: var(--text-subtle);
		margin-left: 0.2rem;
	}

	.retry-icon:hover {
		color: var(--text-normal);
	}

	.ia-faq-info {
		position: absolute;
		top: var(--gap-small);
		right: var(--gap-small);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background-color: var(--bg-card);
		color: var(--text-subtle);
		font-size: 0.85rem;
		font-weight: 700;
		text-decoration: none;
	}

	.ia-faq-info:hover {
		color: var(--text-normal);
	}

	.publisher-group {
		display: flex;
		flex-direction: column;
		gap: var(--gap-tiny);
	}

	.publisher-group + .publisher-group {
		margin-top: var(--gap-small);
	}

	.publisher-label {
		font-size: 0.8rem;
		color: var(--text-subtle);
		margin: 0;
		text-transform: capitalize;
	}

	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gap-small);
	}

	.small .action-buttons {
		gap: var(--gap-xsmall);
	}

	.date-pill {
		font-size: var(--text-size-sm);
		color: var(--text-subtle);
	}

	.download-detail {
		display: flex;
		flex-direction: column;
		gap: var(--gap-small);
	}

	.download-options {
		display: flex;
		flex-direction: column;
		gap: var(--gap-small);
	}

	.download-option-btn {
		display: flex !important;
		align-items: center;
		text-align: left;
		box-sizing: border-box;
		line-height: 1.4;
		width: 100%;
		max-width: none !important;
		padding: var(--gap-small) !important;
		gap: var(--gap-small);
	}

	.download-option-content {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		flex: 1;
	}

	.download-option-label {
		font-weight: 600;
	}

	.download-option-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gap-small);
		width: 100%;
	}

	.format-pill {
		font-family: monospace;
		font-size: 0.65rem;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background-color: var(--bg-card);
		color: var(--text-subtle);
		white-space: nowrap;
	}

	.download-option-hint {
		font-size: 0.75rem;
		color: var(--text-on-button-subtle);
	}

	.price-pill {
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background-color: var(--bg-card);
		color: var(--text-subtle);
		white-space: nowrap;
	}

	.external-retailer-notice {
		margin: 0;
		font-size: var(--text-size-sm);
		color: var(--text-subtle);
	}
</style>
