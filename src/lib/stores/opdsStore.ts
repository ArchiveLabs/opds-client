import { writable } from "svelte/store";
import { pushState, replaceState } from "$app/navigation";
import {
  getToken, setToken, deleteToken,
  getRefreshData, setRefreshData, refreshToken,
  handleImplicitFlow, handlePkceFlow,
  findPkceAuth, startPkceRedirect,
} from "$lib/auth.js";
import { isStandalone } from "$lib/stores/pwaStore";
import { toasts } from "$lib/stores/toastStore";
export const feedUrl = "https://openlibrary.org/opds";
const componentMap = {
  "application/json": "Feed",
  "application/opds+json": "Feed",
  "application/opds-publication+json": "Publication",
  "application/opds-authentication+json": "Auth",
  "application/opds-profile+json": "Profile",
};

const ARCHIVE_BOOKSHELF =
  "https://archive.org/services/loans/loan/?action=user_bookshelf";

export type SupportedMimeTypes = keyof typeof componentMap;
export type AcquisitionRefreshState =
  | { status: "idle"; links: any[] }
  | { status: "loading" }
  | { status: "error" };
export type Availability =
  | { type: "ready"; until?: Date; since?: Date }
  | { type: "available" }
  | { type: "unavailable"; until?: Date; since?: Date };

export type Publication = {
  "@metadata": {
    title: string;
    author: string | string[];
    published?: string;
    language?: string;
    numberOfPages?: number;
  };
  links: {
    rel: string;
    href: string;
    properties: any[];
  }[];
};


function createOpdsStore() {
  const initialStore = {
    mode: "loading", // 'loading' | 'loaded' | 'error'
    state: {} as any,
    mimetype: "",
    searchState: "waiting", // 'done' | 'loading'
    // Used when you have a transient state, like login, to record where to return to
    returnUrl: "",
    // Used when extra screen is needed
    consentContext: null as { title: string; href: string } | null,

    // URL user clicked on
    attemptedUrl: "",
    // Action intent for the attempted URL (e.g. "borrow"). Persists through
    // auth redirects so we can show a success toast when the retried action
    // finally completes after sign-in.
    attemptedIntent: null as string | null,
    navbarSearchTerm: "",
    acquisitionRefresh: { status: "idle", links: [] } as AcquisitionRefreshState,
    actionError: null as string | null,
  };

  let internalState = initialStore;
  let activeRequestController: AbortController | null = null;
  let navGeneration = 0; // incremented on each navigation to detect stale async updates
  let navDepth = 0;
  let searchPushedState = false;

  const { subscribe, set, update } = writable(initialStore);

  subscribe((value) => {
    internalState = value;
  });

  const methods = {
    // Determine which view component to render based on mimetype
    getViewComponent(mimetype: SupportedMimeTypes) {
      console.log("Getting view component", mimetype);
      return componentMap[mimetype] || null;
    },

    createFetchUrl(target: string) {
      return new URL(target, feedUrl).href;
    },

    async authenticatedFetch(url: string, signal?: AbortSignal): Promise<Response> {
      const fetchUrl = this.createFetchUrl(url);
      const token = getToken(fetchUrl);
      const makeRequest = (t: string | null) =>
        t
          ? fetch(fetchUrl, { signal, headers: { Authorization: `Bearer ${t}` } })
          : fetch(fetchUrl, { signal });
      let response = await makeRequest(token);
      if (response.status === 401 && token) {
        const origin = new URL(fetchUrl).origin;
        const refreshed = await refreshToken(origin);
        if (refreshed) {
          response = await makeRequest(getToken(fetchUrl));
        }
      }
      return response;
    },

    isInternetArchiveUrl(url: string): boolean {
      try {
        const host = new URL(url).hostname;
        return host === "archive.org" || host.endsWith(".archive.org") ||
               host === "openlibrary.org" || host.endsWith(".openlibrary.org");
      } catch { return false; }
    },

    withReturnUrl(url: string): string {
      if (!this.isInternetArchiveUrl(url)) return url;
      const u = new URL(url);
      if (isStandalone()) {
        u.searchParams.set("returnTo", window.location.origin + "/return");
      } else {
        u.searchParams.set("returnTo", window.location.origin + window.location.pathname + window.location.search);
      }
      return u.toString();
    },

    setConsent(acquisition: any) {
      this.cacheCurrentState(window.location.href);
      update((s) => ({ ...s, consentContext: acquisition }));
      const opdsUrl = this.getOpdsUrlFromQuery();
      pushState(window.location.pathname + window.location.search, { isConsent: true, opdsUrl });
      navDepth++;
    },
    clearConsent() {
      update((s) => ({ ...s, consentContext: null }));
    },

    clearActionError() {
      update((s) => ({ ...s, actionError: null }));
    },

    setActionError(message: string) {
      update((s) => ({ ...s, actionError: message }));
    },

    getOpdsUrlFromQuery() {
      if (typeof window === "undefined") return feedUrl;
      const params = new URLSearchParams(window.location.search);
      const url = params.get("opds");
      return url ? decodeURIComponent(url) : feedUrl;
    },

    handleImplicitFlow,
    handlePkceFlow,
    getToken,
    deleteToken,

    signOut() {
      const origin = this.getOrigin();
      deleteToken(origin);
      const startLink = this.getLink(internalState.state?.links || [], { rel: "start" });
      const target = startLink?.href || feedUrl;
      this.loadFromUrl(target, "application/opds+json", { history: "replace", setLoading: true });
    },

    async loadFromUrl(
      url: string,
      mimetype: string,
      options: {
        history: "replace" | "push" | "leave" | "pushOnFail";
        setLoading: boolean;
        data?: any;
        skipCache?: boolean;
        intent?: string;
      } = { history: "push", setLoading: true },
    ) {
      const gen = ++navGeneration;
      const intent = options.intent;
      if (intent) {
        update((n) => ({ ...n, attemptedIntent: intent }));
      }
      if (options.setLoading) {
        update((n) => ({ ...n, mode: "loading" }));
      }

      activeRequestController = new AbortController();
      const signal = activeRequestController.signal;

      console.log(url);

      if (mimetype === "text/html") {
        sessionStorage.setItem("redirect_state", window.location.href);
        const target = this.withReturnUrl(url);
        if (isStandalone()) {
          window.open(target, "_blank");
        } else {
          window.location.href = target;
        }
        return;
      }
      if (!options.skipCache) {
        this.cacheCurrentState(window.location.href, internalState.navbarSearchTerm);
      }
      const prevHref = window.location.pathname + window.location.search;
      try {
        let newUrl;
        if (url !== feedUrl) {
          newUrl =
            window.location.pathname + "?opds=" + encodeURIComponent(url);
        } else {
          newUrl = window.location.pathname;
        }
        if (options.history === "replace") {
          console.log("Writing history");
          replaceState(newUrl, { opdsUrl: url });
        } else if (options.history === "push") {
          console.log("pushing history");
          pushState(newUrl, { opdsUrl: url });
          navDepth++;
        }
        const fetchUrl = this.createFetchUrl(url);
        let data: any;
        let newMimetype: string | undefined;

        if (options.data) {
          data = options.data;
          newMimetype = mimetype || "application/opds-publication+json";
        } else {
          const response = await this.authenticatedFetch(url, signal);

          // Surface server errors (e.g. lending-limit 400s) as a dismissable
          // action error instead of replacing the current view.
          // 401s are excluded because they carry an auth document that should
          // be rendered as the Auth view.
          if (!response.ok && response.status !== 401 && options.history === "pushOnFail") {
            const body = await response.json().catch(() => null);
            const message = body?.error || `Request failed (${response.status})`;
            update((n) => ({ ...n, actionError: message }));
            return;
          }

          data = await response.json();

          const contentType = response.headers.get("content-type");
          newMimetype = contentType?.split(";")[0].trim();

          if (newMimetype === "application/opds-publication+json") {
            data = await this.resolveAlternateLinks(data);
          }
        }

        const isPublication =
          newMimetype === "application/opds-publication+json";

        let returnUrl = "";

        console.log("Mimetype is", { newMimetype, mimetype });

        if (newMimetype === "application/opds-authentication+json") {
          // For Internet Archive URLs with PKCE, skip the Auth view and redirect directly.
          if (this.isInternetArchiveUrl(url)) {
            const pkceEntry = findPkceAuth(data.authentication || []);
            if (pkceEntry) {
              // Undo the history push so back-navigation doesn't loop back
              // to this auth-triggering URL and cause an infinite redirect.
              if (options.history === "push") {
                navDepth = Math.max(0, navDepth - 1);
                replaceState(prevHref, {});
              }
              const origin = new URL(url).origin;
              await startPkceRedirect(pkceEntry, origin, fetchUrl, intent);
              return;
            }
          }

          if (options.history === "pushOnFail") {
            console.log("pushing history");
            pushState(newUrl, { opdsUrl: url });
            navDepth++;
          } else {
            console.log("replacing history");
            replaceState(newUrl, { opdsUrl: url });
          }
          console.debug("Setting return url");
          returnUrl = url;
        }

        if (newMimetype === "text/html") {
          window.open(this.withReturnUrl(url), "_blank");
          return;
        }

        // Append locally-saved open-access books to the Archive bookshelf feed.
        // We check Array.isArray(data.publications) to guard against non-feed responses
        // (e.g. a 401 auth challenge) that would cause the spread to throw a TypeError.
        if (url === ARCHIVE_BOOKSHELF && Array.isArray(data.publications)) {
          const shelf = this.getLocalBookshelf();
          data.publications = [...data.publications, ...shelf];
        }

        // Resolve the intent before committing state: the store update will
        // clear attemptedIntent on a non-auth response, so capture it first.
        const resolvedIntent = intent ?? internalState.attemptedIntent;

        update((n) => {
          // Clear intent once the load has resolved (not just on publication):
          // a retried action produced *some* response and shouldn't leak into
          // later unrelated loads. Auth responses keep the intent so it
          // survives the sign-in redirect.
          const nextIntent =
            newMimetype === "application/opds-authentication+json"
              ? n.attemptedIntent
              : null;
          if (
            n.mimetype === "application/opds-publication+json" &&
            isPublication
          ) {
            // Replace only the links that share the action link's source
            // (e.g. after borrowing from Internet Archive, only the IA links
            // are swapped; retailer buy links from an alternate stay).
            const mergedLinks = this.mergeAcquisitionLinks(
              (n.state as any)?.links,
              data.links,
              { href: url },
            );

            return {
              ...n,
              mode: "loaded",
              attemptedUrl: fetchUrl,
              attemptedIntent: nextIntent,
              state: { ...n.state, links: mergedLinks },
              acquisitionRefresh: { status: "idle", links: mergedLinks },
              returnUrl,
              mimetype: newMimetype!,
            };
          } else {
            return {
              ...n,
              mode: "loaded",
              attemptedUrl: fetchUrl,
              attemptedIntent: nextIntent,
              state: data,
              ...(isPublication && { acquisitionRefresh: { status: "idle", links: data.links } }),
              returnUrl,
              mimetype: newMimetype!,
            };
          }
        });

        // Fire a success toast once the borrow intent has produced a
        // publication response — covers both the direct case (click Borrow →
        // publication returned) and the post-auth retry case (click Borrow →
        // auth redirect → sign in → retry URL loaded here).
        if (isPublication && resolvedIntent === "borrow") {
          toasts.show("Book borrowed", "success");
        }

        // Scroll to top when navigating to a non-feed view (publication, auth, profile)
        if (newMimetype !== "application/opds+json" && newMimetype !== "application/json") {
          window.scrollTo(0, 0);
        }

        // When we rendered instantly from pre-existing data, resolve alternate publication links in the background.
        if (options.data) {
          this.resolveAlternateLinks(options.data).then((resolved) => {
            if (gen !== navGeneration) return;
            update((n) => ({
              ...n,
              state: { ...n.state, links: resolved.links },
              acquisitionRefresh: { status: "idle", links: resolved.links },
            }));
          }).catch(() => {
            if (gen !== navGeneration) return;
            update((s) => ({ ...s, acquisitionRefresh: { status: "error" } }));
          });
        }

        // If no history entry was pushed (leave/pushOnFail non-auth), the cache
        // still holds the pre-action state. Overwrite it with the updated state
        // so that back-navigation shows fresh data instead of stale pre-borrow state.
        const noHistoryPushed =
          options.history === "leave" ||
          (options.history === "pushOnFail" &&
            newMimetype !== "application/opds-authentication+json");
        if (noHistoryPushed) {
          this.cacheCurrentState(window.location.href, internalState.navbarSearchTerm);
        }
      } catch (e: any) {
        // Ignore abort errors. This means the user went back before the new state could load.
        if (e.name !== "AbortError") {
          console.error("Failed to load OPDS", e);
          update((n) => ({ ...n, mode: "error" }));
        }
      }
    },
    getOrigin() {
      const params = new URLSearchParams(window.location.search);
      const opdsUrl = params.get("opds");

      if (opdsUrl) {
        const origin = new URL(opdsUrl).origin;
        return origin;
      }
      throw new Error("OPDS URL NOT FOUND");
    },

    renderPublisher(str: string | undefined) {
      return str?.replace("_", " ") ?? "";
    },

    isAudiobook(publication: any): boolean {
      const links = publication?.links ?? [];
      return links.some((l: any) =>
        l.title?.toLowerCase() === "librivox"
      );
    },

    // Tags each link with a `_source` marker identifying where it came from.
    // Links already tagged are left alone. Used so that when an action
    // response comes back (e.g. a borrow response from Internet Archive) we
    // only replace links originating from that same source, and preserve
    // links from other sources (e.g. buy links from a retailer alternate).
    tagLinkSource(links: any[] | undefined, source: string) {
      return (links ?? []).map((l: any) =>
        l._source ? l : { ...l, _source: source }
      );
    },

    // Merges acquisition links after an action response (borrow / return /
    // refresh). Replaces only the links whose `_source` matches the action
    // link's source; links from other sources are preserved. The new links
    // inherit the action link's source tag.
    mergeAcquisitionLinks(
      prevLinks: any[] | undefined,
      newLinks: any[] | undefined,
      actionLink: any,
    ) {
      const prev = prevLinks ?? [];
      // Determine the source of the action link. Prefer an explicit tag on
      // the action link itself; otherwise look it up by href in prevLinks.
      let source: string | undefined = actionLink?._source;
      if (!source && actionLink?.href) {
        const match = prev.find((l: any) => l.href === actionLink.href);
        source = match?._source;
      }
      source = source ?? "self";

      const retained = prev.filter((l: any) => l._source !== source);
      const tagged = this.tagLinkSource(newLinks, source);
      return [...retained, ...tagged];
    },

    // Finds rel="alternate" links with type=application/opds-publication+json,
    // fetches them (with auth if properties.authenticate is present),
    // and appends the acquisition links from the response.
    async resolveAlternateLinks(publication: any) {
      if (!publication.links) return publication;

      // Tag any untagged original links with the "self" source, so later
      // merges can distinguish them from alternate-sourced links.
      const taggedOriginal = this.tagLinkSource(publication.links, "self");

      const alternateLinks = taggedOriginal.filter(
        (l: any) =>
          l.rel === "alternate" &&
          l.type === "application/opds-publication+json"
      );
      if (alternateLinks.length === 0) {
        return { ...publication, links: taggedOriginal };
      }

      update((s) => ({ ...s, acquisitionRefresh: { status: "loading" } }));

      // Fetch each unique alternate URL only once
      const fetchedLinks = new Map<string, any[]>();
      for (const link of alternateLinks) {
        if (fetchedLinks.has(link.href)) continue;
        try {
          const authUrl = link.properties?.authenticate?.href;
          const token = authUrl ? getToken(authUrl) : getToken(link.href);
          const res = await fetch(link.href, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
          if (res.ok) {
            const pub = await res.json();
            fetchedLinks.set(link.href, pub.links ?? []);
          } else {
            fetchedLinks.set(link.href, []);
          }
        } catch (err) {
          console.error("Error resolving alternate link:", err);
          fetchedLinks.set(link.href, []);
        }
      }

      // Collect all resolved acquisition links (deduped by href), tagging
      // each with the alternate URL they came from.
      const existingHrefs = new Set(taggedOriginal.map((l: any) => l.href));
      const appendedLinks: any[] = [];
      for (const [altHref, resolved] of fetchedLinks.entries()) {
        for (const link of resolved) {
          if (!existingHrefs.has(link.href)) {
            existingHrefs.add(link.href);
            appendedLinks.push({ ...link, _source: altHref });
          }
        }
      }

      return {
        ...publication,
        links: [...taggedOriginal, ...appendedLinks],
      };
    },

    async refreshAcquisitionLinks() {
      const gen = navGeneration;
      update((s) => ({ ...s, acquisitionRefresh: { status: "loading" } }));
      try {
        const url = this.getOpdsUrlFromQuery();
        const fetchUrl = this.createFetchUrl(url);
        const token = getToken(fetchUrl);
        const response = token
          ? await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } })
          : await fetch(fetchUrl);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const resolved = await this.resolveAlternateLinks(data);

        if (gen !== navGeneration) return; // navigation happened since; discard stale update
        update((s) => ({
          ...s,
          state: { ...s.state, links: resolved.links },
          acquisitionRefresh: { status: "idle", links: resolved.links },
        }));
      } catch {
        if (gen !== navGeneration) return;
        update((s) => ({ ...s, acquisitionRefresh: { status: "error" } }));
      }
    },

    async handlePopstate(ev: PopStateEvent) {
      ++navGeneration; // invalidate any in-flight async updates from the previous view
      if (activeRequestController) {
        activeRequestController.abort();
      }

      navDepth = Math.max(0, navDepth - 1);
      searchPushedState = false;
      this.clearConsent();
      update((s) => ({ ...s, navbarSearchTerm: "" }));
      const url = this.getOpdsUrlFromQuery();
      if (!this.restoreStateFromCache(window.location.href)) {
        await this.loadFromUrl(url, "application/json", {
          history: "replace",
          setLoading: true,
          skipCache: true,
        });
      }
    },

    cacheCurrentState(url: string, navbarSearchTerm = "") {
      update((s) => {
        if (s.state) {
          const dataToCache = {
            state: s.state,
            scrollY: window.scrollY,
            mimetype: s.mimetype,
            navbarSearchTerm,
          };
          console.log(`Caching state for: ${url}`);
          sessionStorage.setItem(url, JSON.stringify(dataToCache));
          return s;
        }
        return s;
      });
    },

    restoreStateFromCache(url: string) {
      const cachedData = sessionStorage.getItem(url);

      if (cachedData) {
        console.log(`Restoring state from cache for: ${url}`);
        const parsedData = JSON.parse(cachedData);
        set({
          mode: "loaded",
          state: parsedData.state,
          mimetype: parsedData.mimetype,
          returnUrl: parsedData.returnUrl,
          searchState: "done",
          navbarSearchTerm: parsedData.navbarSearchTerm ?? "",
          attemptedUrl: parsedData.attemptedUrl,
          attemptedIntent: null,
          consentContext: parsedData.consentContext,
          acquisitionRefresh: parsedData.state?.links
            ? { status: "idle", links: parsedData.state.links }
            : { status: "idle", links: [] },
          actionError: null,
        });

        // Restore scroll position after the DOM has updated
        setTimeout(() => {
          window.scrollTo(0, parsedData.scrollY || 0);
        }, 0);
        return true;
      }
      console.log("No cached data", url);
      return false;
    },

    getLink(
      links: any[],
      { rel }: { rel: string },
    ): { rel: string; href: string; type?: string } {
      const result = links?.find((link) => link.rel === rel);
      return result;
    },

    getSelfLink(collection: { links: any[] }) {
      return this.getLink(collection.links, { rel: "self" });
    },

    renderAuthors(publication: { metadata: { author: any } }) {
      const authorMeta = publication?.metadata?.author;
      if (!authorMeta) return "Unknown author";
      if (Array.isArray(authorMeta)) {
        const authors = authorMeta;
        if (authors.length > 3) {
          const firstThree = authors
            .slice(0, 3)
            .map((a) => a.name)
            .join(", ");
          return `${firstThree}... and more`;
        }
        return authors.map((author) => author.name).join(", ");
      }
      return authorMeta;
    },

    renderLanguage(publication: { metadata: { language?: string | string[] } }) {
      const lang = publication?.metadata?.language;
      if (!lang) return "";
      const codes = Array.isArray(lang) ? lang : [lang];
      let displayNames: Intl.DisplayNames | undefined;
      try {
        displayNames = new Intl.DisplayNames(undefined, { type: "language" });
      } catch {
        displayNames = undefined;
      }
      const names = codes
        .map((code) => {
          try {
            return displayNames?.of(code) ?? code;
          } catch {
            return code;
          }
        })
        .filter(Boolean);
      return names.join(", ");
    },

    getAvailability(publication: {
      links: {
        rel?: string | string[];
        properties?: {
          availability?: { state: string; until?: string; since?: string };
        };
      }[];
    }): Availability | undefined {
      // Skip open-access links: they are perpetually "ready" and that
      // state doesn't represent the borrow lifecycle.
      const isOpenAccess = (rel: string | string[] | undefined) => {
        if (!rel) return false;
        const rels = Array.isArray(rel) ? rel : [rel];
        return rels.includes("http://opds-spec.org/acquisition/open-access");
      };
      for (const l of publication.links) {
        if (isOpenAccess(l.rel)) continue;
        if (l.properties && Array.isArray(l.properties)) {
          for (const p of l.properties) {
            if (p.availability?.state) {
              console.log("Found available");
              return {
                type: p.availability.state,
                until: p.availability?.until,
                since: p.availability?.since,
              };
            }
          }
        } else if (l.properties && l.properties.availability?.state) {
          return {
            type: l.properties.availability?.state as
              | "ready"
              | "unavailable"
              | "available",
            until: l.properties.availability?.until ? new Date(l.properties.availability.until) : undefined,
            since: l.properties.availability?.since ? new Date(l.properties.availability.since) : undefined,
          };
        } else if (
          l.properties &&
          typeof l.properties.availability === "string"
        ) {
          return { type: l.properties.availability };
        }
      }
    },
    canPurchase(publication: {
      links: {
        rel: string;
      }[];
    }) {
      for (const l of publication.links) {
        if (l.rel && l.rel === "http://opds-spec.org/acquisition/buy") {
          return true;
        }
      }
      return false;
    },

    getSample(publication: {
      links: { rel: string; href: string; type: string }[];
    }) {
      for (const l of publication.links) {
        if (l.rel === "http://opds-spec.org/acquisition/sample") {
          return l;
        }
      }
    },
    isReady(properties: { availability?: { state?: string } }[]) {
      return !!properties.find((p) => p.availability?.state === "ready");
    },
    getReadOnline(publication: {
      links: {
        rel: string;
        href: string;
        type: string;
        properties?: { availability?: { state?: string } }[];
      }[];
    }) {
      for (const l of publication.links) {
        if (
          l.rel === "http://opds-spec.org/acquisition" &&
          l.type === "text/html" &&
          l.properties &&
          this.isReady(l.properties)
        ) {
          return l;
        }
      }
    },

    getOpenAccess(publication: {
      links: { rel: string; href: string; type: string }[];
    }) {
      for (const l of publication.links) {
        if (l.rel === "http://opds-spec.org/acquisition/open-access") {
          return { ...l, url: new URL(l.href) };
        }
      }
    },

    getOpenAccessLinks(publication: {
      links: { rel: string; href: string; type: string; title?: string }[];
    }) {
      return publication.links
        .filter((l) => l.rel === "http://opds-spec.org/acquisition/open-access")
        .map((l) => ({ ...l, url: new URL(l.href) }));
    },

    getPubImage(publication: { images: any[] }, rel: any) {
      if (!publication?.images) return "";
      let img = publication.images.find((i) => rel === i.rel);
      if (img) return img.href;

      img = publication.images.sort((a, b) => b.width - a.width)[0];
      return img?.href || "";
    },

    async newSearch(term: string) {
      if (term.length > 1) {
        const searchLink = this.getLink(internalState.state.links, {
          rel: "search",
        });
        if (!searchLink?.href) {
          console.error("Search link not found in current state");
          return;
        }

        const queryString = `?query=${encodeURIComponent(term)}`;
        let url = searchLink.href
          .replace("{?query}", queryString)
          .replace("{?query,mode}", queryString);

        const newHistoryUrl =
          window.location.pathname + "?opds=" + encodeURIComponent(url);

        if (!searchPushedState) {
          // Cache the current (pre-search) state before we start searching
          this.cacheCurrentState(window.location.href);
          pushState(newHistoryUrl, { opdsUrl: url });
          navDepth++;
          searchPushedState = true;
        } else {
          // Subsequent refinements: replace so back goes to pre-search, not a mid-search state
          replaceState(newHistoryUrl, { opdsUrl: url });
        }

        update((s) => ({
          ...s,
          state: { ...s.state, publications: [], navigation: [], groups: [], facets: [] },
        }));

        await this.performSearch(url, true);
      }
    },
    getLocalBookshelf() {
      const currentShelf = localStorage.getItem("local_bookshelf");
      if (!currentShelf) {
        return [];
      }
      return JSON.parse(currentShelf) as Publication[];
    },
    addToLocalBookShelf(publication: Publication) {
      const currentShelf = localStorage.getItem("local_bookshelf");
      if (!currentShelf) {
        localStorage.setItem("local_bookshelf", JSON.stringify([publication]));
        return;
      }
      const shelf = JSON.parse(currentShelf) as Publication[];
      const publicationSelfLink = this.getSelfLink(publication);
      const index = shelf.findIndex((entry) =>
        entry.links.some(
          (link) =>
            link.rel === "self" && link.href === publicationSelfLink.href,
        ),
      );
      if (index === -1) {
        localStorage.setItem(
          "local_bookshelf",
          JSON.stringify([publication, ...shelf]),
        );
      } else {
        shelf.splice(index, 1);
        localStorage.setItem(
          "local_bookshelf",
          JSON.stringify([publication, ...shelf]),
        );
      }
    },

    loadNextPage() {
      const nextLink = this.getLink(internalState.state.links, { rel: "next" });
      console.log("loading next page run");
      if (!nextLink || internalState.searchState === "loading") {
        console.log("No nextLink", { nextLink, internalState });
        return; // Exit if there's no next page or a search is in progress
      }
      this.performSearch(nextLink.href);
    },

    async performSearch(searchUrl: string, isNewSearch = false) {
      update((s) => ({ ...s, searchState: "loading" }));
      console.log("Performing search");

      const fetchUrl = this.createFetchUrl(searchUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        console.error("Search request failure", { status: response.status });
        update((s) => ({ ...s, searchState: "done" }));
        return;
      }

      const newState = await response.json();
      const newPublications = newState.publications ?? [];
      const newGroups = newState.groups ?? [];
      if (newPublications.length === 0 && newGroups.length === 0) {
        update((s) => ({
          ...s,
          searchState: "empty",
          state: {
            ...s.state,
            facets: newState.facets ?? [],
          },
        }));
      } else {
        update((s) => {
          if (isNewSearch) {
            return {
              ...s,
              searchState: "done",
              state: {
                ...newState,
                publications: newPublications,
                groups: newGroups,
              },
            };
          }
          // Pagination: keep the original feed's self link, metadata, and
          // facets so the page-level viewKey doesn't change. Only swap the
          // `next` link and append the new publications/groups.
          const oldLinks = s.state.links || [];
          const newNextLink = newState.links?.find((l: any) => l.rel === "next");
          const linksWithoutNext = oldLinks.filter((l: any) => l.rel !== "next");
          const updatedLinks = newNextLink
            ? [...linksWithoutNext, newNextLink]
            : linksWithoutNext;
          return {
            ...s,
            searchState: "done",
            state: {
              ...s.state,
              links: updatedLinks,
              publications: [...(s.state.publications || []), ...newPublications],
              groups: [...(s.state.groups || []), ...newGroups],
            },
          };
        });
      }
    },

    shouldShowAcquisition(link: { rel: string }, rel: string) {
      return (
        link.rel === `http://opds-spec.org/acquisition${rel ? "/" + rel : ""}`
      );
    },

    shouldShowBorrow(link: { rel: string }) {
      return this.shouldShowAcquisition(link, "borrow");
    },

    shouldShowBuy(link: { rel: string }) {
      return this.shouldShowAcquisition(link, "buy");
    },

    mimetypeToFormat(link: { type: string }): string | null {
      const map: Record<string, string> = {
        "application/epub+zip": "EPUB",
        "application/pdf": "PDF",
        "audio/mpeg": "Mp3",
      };
      return map[link.type] || null;
    },

    getPrice(acquisition: {
      properties: { price: { value: number; currency: string } };
    }) {
      const price = acquisition.properties?.price?.value;
      if (!price) {
        return;
      }
      const currency = acquisition.properties?.price?.currency;
      const result = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(price);
      return result;
    },

    shouldShowBack() {
      if (window.location.search === "") return false;
      const startLink = this.getLink(internalState.state.links || [], {
        rel: "start",
      });
      if (startLink) {
        const currentUrl = this.getOpdsUrlFromQuery();
        if (currentUrl === startLink.href) return false;
      }
      return navDepth > 0;
    },
    goBack() {
      if (navDepth > 0) {
        history.back();
      } else {
        const startLink = this.getLink(internalState.state.links || [], {
          rel: "start",
        });
        const homeUrl = startLink?.href || feedUrl;
        this.loadFromUrl(homeUrl, "application/opds+json", {
          history: "replace",
          setLoading: true,
        });
      }
    },

    exitSearch() {
      update((s) => ({ ...s, navbarSearchTerm: "" }));
      if (searchPushedState) {
        searchPushedState = false;
        this.goBack();
      }
    },
  };

  return {
    subscribe,
    set,
    ...methods,
  };
}

export const opds = createOpdsStore();
