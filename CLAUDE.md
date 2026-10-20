# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production (static output)
npm run preview      # Preview production build
npm run check        # Type-check with svelte-check
npm run check:watch  # Type-check in watch mode
npm test             # Run tests (vitest)
npm run test:watch   # Run tests in watch mode
```

Type-checking (`npm run check`) and tests (`npm test`) are the main validation tools.

**Always run `npm run check` and `npm test` before considering any task complete. Both must pass with 0 errors.**

## Architecture

This is a **SvelteKit SPA** (SSR is disabled everywhere) that acts as an OPDS 2.0 feed browser, defaulting to Open Library / Internet Archive. It uses the static adapter with `fallback: "index.html"`. The app follows the [OPDS 2.0 spec](https://drafts.opds.io/opds-2.0#51-opds-publication) and treats the API as HATEOAS — all navigation and actions are driven by links returned in responses rather than hardcoded routes.

### The OPDS store (`src/lib/stores/opdsStore.ts`)

This is the core of the app — it functions as both a Svelte store and a service layer. All navigation, fetching, auth, caching, and state transitions flow through it. There is no router; instead, **the MIME type of the OPDS API response** determines which top-level view component is rendered:

| MIME type | View component |
|---|---|
| `application/json` / `application/opds+json` | `Feed` |
| `application/opds-publication+json` | `Publication` |
| `application/opds-authentication+json` | `Auth` |
| `application/opds-profile+json` | `Profile` |

The `+page.svelte` route reads `$opds.mimetype` and dynamically mounts the appropriate view component via `<svelte:component>`.

### Substates within views

Some views have internal substates that are independent of the OPDS mimetype:

- **`Auth` view**: has a multi-step OTP flow (`submitStep: "issue" | "redeem"`, `submitState: "idle" | "loading" | "done" | "error"`). The view renders different forms depending on which step the user is on.
- **`Publication` view**: has a consent substate (`$opds.consentContext`). When the user clicks an acquisition link that leads off-site (e.g. to a publisher), instead of navigating immediately a confirmation screen is shown within the same view. `opds.setConsent()` / `opds.clearConsent()` manage this, and going `history.back()` clears it.
- **`Navbar` / `Feed` view**: the navbar has a `navbarView: "general" | "search"` substate stored in the OPDS store. Clicking the search button switches the navbar into search mode and renders a search input in place of the nav icons.

### Pagination (loading the next page)

Feeds with `rel="next"` are paginated via infinite scroll. `Feed.svelte` puts a loader at the bottom of the catalog with the `intersect` action; when it enters the viewport, `opds.loadNextPage()` runs and calls `performSearch(nextLink.href)`.

Pagination is **append-only and URL-stable**:
- The browser URL is **not** updated — the user stays on the original page's `?opds=` URL.
- `state.publications` and `state.groups` are appended to.
- The original feed's top-level metadata, facets, and `rel="self"` link are preserved; only the `rel="next"` link is swapped for the response's new `next`.

This last point matters because `+page.svelte` derives `viewKey` from `state.links` (`rel="self"`) and wraps the view in `{#key viewKey}`. If the self link changed during pagination the entire `Feed` would re-mount, destroying every `PublicationCard`'s in-memory alternate-link cache and causing a re-fetch storm as cards re-entered the viewport. Keep pagination updates surgical for this reason.

### Resolving `rel="alternate"` publication links

OPDS publications can include `rel="alternate"` links pointing to other OPDS publication documents (e.g. the same book on a different distributor). Those alternate documents carry their own acquisition links (borrow / buy / sample / open-access) that should be merged into the current publication so the user sees all available actions in one place.

`opds.resolveAlternateLinks(publication)` is the helper that does this. It:
1. Tags every original link with `_source: "self"`.
2. Fetches each unique `rel="alternate"` URL of type `application/opds-publication+json` (with auth if `properties.authenticate.href` is present).
3. Appends each resolved acquisition link, deduped by `href`, tagged with `_source: <alternate URL>`.

The `_source` tag drives `opds.mergeAcquisitionLinks(prev, new, actionLink)`. After a borrow / return / refresh action returns an updated publication, only the links sharing the action link's `_source` are replaced; links from other sources (e.g. retailer buy links from an alternate) survive untouched.

**When resolution runs:**
- **`Publication` view (full page)**: resolved eagerly inside `loadFromUrl` before the response is committed to the store. The result lives in `$opds.acquisitionRefresh` (sum type `{status: "idle", links} | {status: "loading"} | {status: "error"}`) so the view can show a spinner while alternates load. `Publication.svelte` and `Feed.svelte` also call `opds.refreshAcquisitionLinks()` on `visibilitychange` to re-resolve when the tab regains focus.
- **`PublicationCard` / `CarouselItem` (in feeds)**: resolved lazily via the `dwellintersect` action (`src/lib/actions/dwellintersect.js`). When a card has been continuously visible for 1s, `onDwell()` fires once and resolves alternates for that card only. Component-local `resolvedPublication` and `alternateState` (sum type `"idle" | "loading" | "resolved" | "error"`) hold the result. This is why pagination must not re-mount the `Feed` — it would invalidate every card's cache.

### Navigation and URL structure

- The current OPDS URL is stored in the `?opds=` query parameter.
- Navigation is managed via the browser History API (`pushState` / `replaceState` from `$app/navigation`).
- Previous view states (OPDS data + scroll position) are cached in `sessionStorage` by full URL, enabling instant back-navigation without re-fetching.

### Auth flows

Three auth flows are supported based on what the OPDS server returns in `authentication[]`:
1. **xauthn / OTP** (Internet Archive): email → OTP code → cookie-based session
2. **OAuth implicit flow**: redirect to provider, read `access_token` from URL hash on return, store in `localStorage` keyed by origin
3. **Password-based** (stub, not fully implemented)

Tokens are stored in `localStorage` as `${origin}_token` and attached as `Authorization: Bearer` headers on subsequent requests.

### Local bookshelf

Publications can be saved to `localStorage` under `local_bookshelf`. When the user navigates to the Internet Archive bookshelf endpoint, local entries are prepended to the API results.

### Accessibility

The system should be accessible. Stick to semantic CSS and HTML as much as possible.

### CSS design system

All styling uses CSS custom properties defined in `src/main.css` (no CSS framework). Key utility classes:
- `.acquisition`, `.acquisition.small`, `.acquisition.big`, `.acquisition.raised` — action buttons
- `.book-available`, `.book-unavailable` — availability status text
- `.content` — main page content wrapper (max-width 800px)
- `.backbutton`, `.forwardbutton` — icon buttons using SVG masks

Dark mode is handled via `@media (prefers-color-scheme: dark)` with overridden CSS variables.

It is important that font-sizes, gaps, paddings, margins, colors, etc. all are handled using css
variables declared in main.css. Avoid hardcoded `rem`/`px` values for spacing — use the `--gap-*` scale or `--content-padding` (the horizontal inset applied by `.content`, also used via negative margins by full-bleed children like `.filterbar` and `.carousel` on mobile).

For layout spacing between stacked elements, prefer `display: flex; flex-direction: column; gap: var(--gap-*)` on the parent over `margin-top`/`margin-bottom` on children. This keeps spacing uniform, avoids margin-collapse surprises, and makes the spacing scale explicit at the container level rather than scattered across descendants.

### State modeling

Prefer sum types (discriminated unions) over multiple boolean flags for state modeling. For example, use `state: "idle" | "loading" | "resolved" | "error"` instead of separate `loading`, `resolved`, and `error` booleans.

### Infinite scroll

The `src/lib/actions/intersect.js` Svelte action wraps `IntersectionObserver`. In `Feed.svelte`, it triggers `opds.loadNextPage()` when the bottom loader enters the viewport (with a 400px eagerness margin).
