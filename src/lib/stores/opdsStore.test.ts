import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('$app/navigation', () => ({
  pushState: vi.fn(),
  replaceState: vi.fn(),
}));

import { opds } from '$lib/stores/opdsStore';
import openAccessJson from '../../../open-access.json';

// Minimal publication with no open-access links or images
const pubNoOpenAccess = {
  links: [
    { href: 'https://example.com/self', type: 'application/opds-publication+json', rel: 'self' },
  ],
  images: [] as any[],
  metadata: { title: 'Test', author: 'Test Author' },
};

// Publication with an archive.org open-access link
const pubArchiveAccess = {
  links: [
    {
      href: 'https://archive.org/download/foo/foo.epub',
      type: 'application/epub+zip',
      rel: 'http://opds-spec.org/acquisition/open-access',
    },
  ],
};

// Publication with a sample link
const pubWithSample = {
  links: [
    {
      href: 'https://example.com/sample.epub',
      type: 'application/epub+zip',
      rel: 'http://opds-spec.org/acquisition/sample',
    },
  ],
};

describe('getOpenAccessLinks', () => {
  it('returns both links from open-access.json', () => {
    const links = opds.getOpenAccessLinks(openAccessJson as any);
    expect(links).toHaveLength(2);
  });

  it('first link has type text/html', () => {
    const links = opds.getOpenAccessLinks(openAccessJson as any);
    expect(links[0].type).toBe('text/html');
  });

  it('second link has type application/epub+zip', () => {
    const links = opds.getOpenAccessLinks(openAccessJson as any);
    expect(links[1].type).toBe('application/epub+zip');
  });

  it('each result has a parsed .url property that is a URL instance', () => {
    const links = opds.getOpenAccessLinks(openAccessJson as any);
    links.forEach((link) => {
      expect(link.url).toBeInstanceOf(URL);
    });
  });

  it('returns [] for a publication with no open-access links', () => {
    const links = opds.getOpenAccessLinks(pubNoOpenAccess as any);
    expect(links).toHaveLength(0);
  });
});

describe('getOpenAccess', () => {
  it('returns the first open-access link', () => {
    const link = opds.getOpenAccess(openAccessJson as any);
    expect(link).toBeDefined();
    expect(link!.type).toBe('text/html');
  });

  it('returns undefined when no open-access links present', () => {
    const link = opds.getOpenAccess(pubNoOpenAccess as any);
    expect(link).toBeUndefined();
  });
});

describe('getAvailability', () => {
  it('returns undefined when no availability metadata is present', () => {
    expect(opds.getAvailability(pubNoOpenAccess as any)).toBeUndefined();
  });

  it('ignores `availability.state` on open-access links (OA is perpetually "ready")', () => {
    const pub = {
      links: [
        {
          rel: 'http://opds-spec.org/acquisition/open-access',
          href: 'https://archive.org/details/foo?view=theater',
          type: 'text/html',
          properties: { availability: { state: 'ready' } },
        },
      ],
    };
    expect(opds.getAvailability(pub as any)).toBeUndefined();
  });

  it('returns ready when a non-OA link carries availability.state=ready', () => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const pub = {
      links: [
        {
          rel: 'http://opds-spec.org/acquisition',
          href: 'https://example.com/read',
          type: 'text/html',
          properties: { availability: { state: 'ready', until } },
        },
      ],
    };
    const a = opds.getAvailability(pub as any);
    expect(a?.type).toBe('ready');
  });

  it('prefers a non-OA borrow link\'s availability over a sibling OA "ready" link', () => {
    const pub = {
      links: [
        {
          rel: 'http://opds-spec.org/acquisition/open-access',
          href: 'https://archive.org/details/foo?view=theater',
          type: 'text/html',
          properties: { availability: { state: 'ready' } },
        },
        {
          rel: 'http://opds-spec.org/acquisition/borrow',
          href: 'https://example.com/borrow',
          type: 'application/opds-publication+json',
          properties: { availability: { state: 'available' } },
        },
      ],
    };
    expect(opds.getAvailability(pub as any)?.type).toBe('available');
  });
});

describe('renderPublisher', () => {
  it('"standard_ebooks" → "standard ebooks"', () => {
    expect(opds.renderPublisher('standard_ebooks')).toBe('standard ebooks');
  });

  it('already-spaced string passes through unchanged', () => {
    expect(opds.renderPublisher('Internet Archive')).toBe('Internet Archive');
  });
});

describe('getPubImage', () => {
  it('returns cover image href when rel="cover" is requested', () => {
    const href = opds.getPubImage(openAccessJson as any, 'cover');
    expect(href).toBe('https://covers.openlibrary.org/b/id/12621704-L.jpg');
  });

  it('falls back to largest image when rel not found', () => {
    const href = opds.getPubImage(openAccessJson as any, 'thumbnail');
    expect(href).toBe('https://covers.openlibrary.org/b/id/12621704-L.jpg');
  });

  it('returns "" for publication with no images', () => {
    const href = opds.getPubImage(pubNoOpenAccess as any, 'cover');
    expect(href).toBe('');
  });
});

describe('getSample', () => {
  it('returns undefined for open-access.json (no sample link)', () => {
    const sample = opds.getSample(openAccessJson as any);
    expect(sample).toBeUndefined();
  });

  it('returns the sample link when present', () => {
    const sample = opds.getSample(pubWithSample as any);
    expect(sample).toBeDefined();
    expect(sample!.href).toBe('https://example.com/sample.epub');
  });
});

describe('shouldShowBack', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
    opds.set({
      mode: 'loading',
      state: {},
      mimetype: '',
      searchState: 'waiting',
      returnUrl: '',
      consentContext: null,
      attemptedUrl: '',
      attemptedIntent: null,
      navbarSearchTerm: '',
      acquisitionRefresh: { status: 'idle', links: [] },
      actionError: null,
    });
  });

  it('returns false when there is no query string', () => {
    expect(opds.shouldShowBack()).toBe(false);
  });

  it('returns false when navDepth is 0 even with a query string and no start link', () => {
    window.history.pushState({}, '', '/?opds=https%3A%2F%2Fexample.com%2Ffeed');
    vi.spyOn(opds, 'getLink').mockReturnValue(undefined as any);
    expect(opds.shouldShowBack()).toBe(false);
  });

  it('returns false when the current opds URL matches the start link', () => {
    const startUrl = 'https://example.com/start';
    window.history.pushState({}, '', `/?opds=${encodeURIComponent(startUrl)}`);
    vi.spyOn(opds, 'getLink').mockReturnValue({ rel: 'start', href: startUrl } as any);
    expect(opds.shouldShowBack()).toBe(false);
  });

  it('returns false when navDepth is 0 even if the current opds URL differs from the start link', () => {
    const startUrl = 'https://example.com/start';
    const currentUrl = 'https://example.com/some-feed';
    window.history.pushState({}, '', `/?opds=${encodeURIComponent(currentUrl)}`);
    vi.spyOn(opds, 'getLink').mockReturnValue({ rel: 'start', href: startUrl } as any);
    expect(opds.shouldShowBack()).toBe(false);
  });

  it('returns true after in-app push navigation', async () => {
    const startUrl = 'https://example.com/start';
    const currentUrl = 'https://example.com/some-feed';

    window.history.pushState({}, '', `/?opds=${encodeURIComponent(currentUrl)}`);

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/opds+json' },
      json: () => Promise.resolve({ links: [{ rel: 'start', href: startUrl }] }),
    })));

    await opds.loadFromUrl(currentUrl, 'application/opds+json', { history: 'push', setLoading: false });
    expect(opds.shouldShowBack()).toBe(true);
  });
});

describe('getLink', () => {
  const links = [
    { rel: 'self', href: 'https://example.com/self' },
    { rel: 'alternate', href: 'https://example.com/alt' },
  ];

  it('finds a link by rel from an array', () => {
    const link = opds.getLink(links, { rel: 'self' });
    expect(link).toBeDefined();
    expect(link.href).toBe('https://example.com/self');
  });

  it('returns undefined when rel is not present', () => {
    const link = opds.getLink(links, { rel: 'next' });
    expect(link).toBeUndefined();
  });
});
