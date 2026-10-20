// Capture the initial URL params before SvelteKit's router can normalize/replace the URL.
// OAuth implicit flow returns tokens either in the hash fragment or query string,
// and SvelteKit may call history.replaceState before onMount fires.
const initialSearch =
  typeof window !== "undefined" ? window.location.search : "";

const PKCE_CLIENT_IDS: Record<string, string> = {
  "https://reader.archive.org": "reader-archive-org",
  "https://reader.archive.org/": "reader-archive-org",
  "https://bookreader-local.archive.org:5173": "bookreader-local",
  "https://bookreader-local.archive.org:5173/": "bookreader-local",
};

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createStateParameter(): string {
  const array = new Uint32Array(4);
  self.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(8, "0"))
    .join("");
}

// --- Token management ---

export function getToken(url: string): string | null {
  try {
    const origin = new URL(url).origin;
    return localStorage.getItem(`${origin}_token`);
  } catch {
    return null;
  }
}

export function setToken(origin: string, token: string) {
  localStorage.setItem(`${origin}_token`, token);
}

export function deleteToken(origin: string) {
  localStorage.removeItem(`${origin}_token`);
  localStorage.removeItem(`${origin}_refresh_url`);
  localStorage.removeItem(`${origin}_refresh_token`);
}

export function getRefreshData(origin: string) {
  const url = localStorage.getItem(`${origin}_refresh_url`);
  const token = localStorage.getItem(`${origin}_refresh_token`);
  if (!url || !token) return undefined;
  return { url, token };
}

export function setRefreshData(origin: string, url: string, token: string) {
  localStorage.setItem(`${origin}_refresh_url`, url);
  localStorage.setItem(`${origin}_refresh_token`, token);
}

export async function refreshToken(origin: string): Promise<boolean> {
  const data = getRefreshData(origin);
  if (!data) return false;
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: data.token,
    });
    const response = await fetch(data.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) {
      console.error("PKCE token refresh failed", response.status);
      return false;
    }
    const json = await response.json();
    const accessToken: string | undefined = json.access_token;
    if (!accessToken) {
      console.error("PKCE: no access_token in refresh response", json);
      return false;
    }
    setToken(origin, accessToken);
    if (json.refresh_token) {
      setRefreshData(origin, data.url, json.refresh_token);
    }
    return true;
  } catch (e) {
    console.error("PKCE token refresh threw", e);
    return false;
  }
}

// --- OAuth error detection ---

export type AuthReturn = { retryUrl?: string; intent?: string };

export function handleOAuthError(): string | undefined {
  const params = new URLSearchParams(initialSearch);
  const error = params.get("error");
  const state = params.get("state");
  if (!error || !state) return undefined;

  // Clean up any stored PKCE state for this flow
  for (const key of ["_origin", "_retry", "_intent", "_code_verifier", "_code_endpoints", "_client_id"]) {
    localStorage.removeItem(`${state}${key}`);
  }

  return error;
}

// --- OAuth return-flow handlers (called on app init) ---

export function handleImplicitFlow(): AuthReturn | undefined {
  console.log("Checking if implicit flow");
  const params = new URLSearchParams(initialSearch);
  const accessToken = params.get("access_token");
  if (accessToken) {
    const state = params.get("state");
    const origin = sessionStorage.getItem(`${state}_origin`);
    const retryUrl = sessionStorage.getItem(`${state}_retry`);
    const intent = sessionStorage.getItem(`${state}_intent`);

    if (!state || !origin) {
      throw new Error("No state in session storage, can not sign in.");
    }
    setToken(origin, accessToken);

    return { retryUrl: retryUrl ?? undefined, intent: intent ?? undefined };
  }
  return undefined;
}

export async function handlePkceFlow(): Promise<AuthReturn | undefined> {
  const params = new URLSearchParams(initialSearch);
  const code = params.get("code");
  if (!code) return undefined;

  const state = params.get("state");
  if (!state) return undefined;

  // Read from localStorage (not sessionStorage) — Safari wipes sessionStorage
  // during cross-origin OAuth redirects due to ITP.
  const origin = localStorage.getItem(`${state}_origin`);
  const retryUrl = localStorage.getItem(`${state}_retry`);
  const intent = localStorage.getItem(`${state}_intent`);
  const codeVerifier = localStorage.getItem(`${state}_code_verifier`);
  const endpointsRaw = localStorage.getItem(`${state}_code_endpoints`);
  const clientId = localStorage.getItem(`${state}_client_id`);

  // Clean up PKCE state regardless of outcome to avoid stale entries.
  for (const key of ["_origin", "_retry", "_intent", "_code_verifier", "_code_endpoints", "_client_id"]) {
    localStorage.removeItem(`${state}${key}`);
  }

  if (!origin || !codeVerifier || !endpointsRaw || !clientId) {
    console.error("PKCE: missing localStorage state, cannot exchange code");
    return undefined;
  }

  const endpoints = JSON.parse(endpointsRaw) as { code: string; refresh: string };

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: window.location.origin,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  try {
    const response = await fetch(endpoints.code, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) {
      console.error("PKCE token exchange failed", response.status);
      return undefined;
    }
    const json = await response.json();
    console.log("Got response!", json)

    const accessToken: string | undefined = json.access_token;
    if (!accessToken) {
      console.error("PKCE: no access_token in response", json);
      return undefined;
    }
    setToken(origin, accessToken);
    if (json.refresh_token) {
      setRefreshData(origin, endpoints.refresh, json.refresh_token);
    }
    return { retryUrl: retryUrl ?? undefined, intent: intent ?? undefined };
  } catch (e) {
    console.error("PKCE token exchange threw", e);
    return undefined;
  }
}

// --- Auth document helpers ---

export function findPkceAuth(authentication: any[]): any | undefined {
  return authentication?.find(
    (i: any) => i.type === "http://opds-spec.org/auth/oauth/authorization-code-with-pkce",
  );
}

export function findImplicitAuth(authentication: any[]): any | undefined {
  return authentication?.find(
    (i: any) => i.type === "http://opds-spec.org/auth/oauth/implicit",
  );
}

export function getAuthLinks(authentication: any[]): any[] {
  const implicitAuth = findImplicitAuth(authentication);
  return implicitAuth?.links?.filter((i: any) => i.rel === "authenticate") ?? [];
}

export function getAuthEndpoint(authObj: any): string {
  const endpoint = authObj.links?.find(
    (i: any) => i.rel === "authenticate",
  )?.href;
  if (!endpoint) throw new Error("Could not retrieve auth endpoint");
  return endpoint;
}

// --- PKCE redirect initiation ---

export async function startPkceRedirect(pkceEntry: any, origin: string, attemptedUrl: string, intent?: string): Promise<boolean> {
  const clientId = PKCE_CLIENT_IDS[window.location.origin];
  if (!clientId) return false;

  const codeLink = pkceEntry.links?.find((l: any) => l.rel === "code");
  const refreshLink = pkceEntry.links?.find((l: any) => l.rel === "refresh");
  const authenticateLink = pkceEntry.links?.find((l: any) => l.rel === "authenticate");
  if (!codeLink || !authenticateLink) return false;

  const state = createStateParameter();

  const verifierArray = new Uint8Array(32);
  crypto.getRandomValues(verifierArray);
  const verifier = base64urlEncode(verifierArray.buffer);

  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const challenge = base64urlEncode(digest);

  localStorage.setItem(`${state}_origin`, origin);
  localStorage.setItem(`${state}_retry`, attemptedUrl);
  if (intent) localStorage.setItem(`${state}_intent`, intent);
  localStorage.setItem(`${state}_code_verifier`, verifier);
  localStorage.setItem(`${state}_code_endpoints`, JSON.stringify({
    code: codeLink.href,
    refresh: refreshLink?.href ?? codeLink.href,
  }));
  localStorage.setItem(`${state}_client_id`, clientId);

  const url = new URL(authenticateLink.href);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", window.location.origin);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "openid");

  window.location.href = url.toString();
  return true;
}

// --- Implicit OAuth redirect builder ---

export function buildImplicitRedirectUrl(authenticateHref: string, origin: string, attemptedUrl: string, intent?: string): string {
  const state = createStateParameter();
  const parsed = new URL(authenticateHref);
  sessionStorage.setItem(`${state}_origin`, origin);
  sessionStorage.setItem(`${state}_retry`, attemptedUrl);
  if (intent) sessionStorage.setItem(`${state}_intent`, intent);
  parsed.searchParams.append("redirect_uri", `${window.location.origin}`);
  parsed.searchParams.append("state", state);
  return parsed.toString();
}
