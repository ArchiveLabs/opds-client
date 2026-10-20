import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import openAccessJson from '../../../../open-access.json';
import lennyJson from '../../../../opds-lennyforlibraries-frontpage.json';

vi.mock('$app/navigation', () => ({
  pushState: vi.fn(),
  replaceState: vi.fn(),
}));

// A minimal hand-rolled store we can update between tests.
// vi.hoisted runs before any imports, so mockStore is available in vi.mock factories.
const mockStore = vi.hoisted(() => {
  let _value: any = {};
  const _subs = new Set<(v: any) => void>();
  return {
    subscribe(fn: (v: any) => void) {
      _subs.add(fn);
      fn(_value);
      return () => { _subs.delete(fn); };
    },
    setValue(v: any) {
      _value = v;
      _subs.forEach((fn) => fn(v));
    },
  };
});

// Use the real store methods — only replace `subscribe` so tests control $opds state,
// and stub `loadFromUrl` to block real HTTP requests from firing.
vi.mock('$lib/stores/opdsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/stores/opdsStore')>();
  return {
    ...actual,
    opds: {
      ...actual.opds,
      subscribe: mockStore.subscribe,
      loadFromUrl: vi.fn(() => Promise.resolve()),
    },
  };
});

import Publication from '$lib/components/views/Publication.svelte';

const baseStoreState = {
  state: openAccessJson,
  consentContext: null,
  attemptedUrl: 'https://openlibrary.org/opds/books/OL37044469M',
  mimetype: 'application/opds-publication+json',
  mode: 'loaded',
  navbarSearchTerm: '',
  searchState: 'done',
  returnUrl: '',
  acquisitionRefresh: { status: 'idle' as const, links: (openAccessJson as any).links || [] },
};

beforeEach(() => {
  mockStore.setValue(baseStoreState);
  vi.clearAllMocks();
});

describe('Publication — open-access.json fixture (2 open-access links, no borrow/sample)', () => {
  it('renders a "Read Online" button and a "Download" button', () => {
    render(Publication);
    expect(screen.getByText('Read Online')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('acquisition buttons are <button> elements (not <a> tags — non-archive.org links use consent flow)', () => {
    render(Publication);
    expect(screen.getByText('Read Online').tagName).toBe('BUTTON');
    expect(screen.getByText('Download').tagName).toBe('BUTTON');
  });

  it('"Read Sample" is not shown when open-access links are present', () => {
    render(Publication);
    expect(screen.queryByText('Read Sample')).not.toBeInTheDocument();
  });

  it('no availability badge is shown for open-access-only publications (badges only render under borrowable sources)', () => {
    render(Publication);
    expect(screen.queryByText('Open Access')).not.toBeInTheDocument();
  });

  it('"Available for borrow" text is NOT shown', () => {
    render(Publication);
    expect(screen.queryByText(/Available for borrow/i)).not.toBeInTheDocument();
  });
});

describe('Publication — no open-access links, no sample', () => {
  const pubNone = {
    links: [
      { href: 'https://example.com/self', type: 'application/opds-publication+json', rel: 'self' },
    ],
    images: [],
    metadata: { title: 'Empty Book', author: 'Nobody', numberOfPages: 100 },
  };

  beforeEach(() => {
    mockStore.setValue({ ...baseStoreState, state: pubNone, acquisitionRefresh: { status: 'idle' as const, links: pubNone.links } });
  });

  it('no open-access acquisition buttons rendered', () => {
    render(Publication);
    expect(screen.queryByText('Read Online')).not.toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });
});

describe('Publication — archive.org open-access link', () => {
  const pubArchive = {
    links: [
      {
        href: 'https://archive.org/download/foo/foo.epub',
        type: 'application/epub+zip',
        rel: 'http://opds-spec.org/acquisition/open-access',
        properties: { availability: 'available' },
      },
    ],
    images: [],
    metadata: { title: 'Archive Book', author: 'Test', numberOfPages: 200 },
  };

  beforeEach(() => {
    mockStore.setValue({ ...baseStoreState, state: pubArchive, acquisitionRefresh: { status: 'idle' as const, links: pubArchive.links } });
  });

  it('renders a "Download" button for archive.org links', () => {
    render(Publication);
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});

describe('Publication — share button', () => {
  it('renders a share button when navigator.share is available', () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    render(Publication);
    expect(screen.getByLabelText('Share')).toBeInTheDocument();
    // Clean up
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('does not render a share button when navigator.share is unavailable', () => {
    const original = navigator.share;
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    render(Publication);
    expect(screen.queryByLabelText('Share')).not.toBeInTheDocument();
    // Restore
    Object.defineProperty(navigator, 'share', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

describe('Publication — Lenny fixture publication (non-archive.org OA HTML link)', () => {
  // All's Well That Ends Well — OA link on lennyforlibraries.org, not archive.org
  const lennyPub = (lennyJson as any).publications[0];

  beforeEach(() => {
    mockStore.setValue({ ...baseStoreState, state: lennyPub, acquisitionRefresh: { status: 'idle' as const, links: lennyPub.links || [] } });
  });

  it('renders "Read Online" as a <button> (non-archive.org uses consent flow)', () => {
    render(Publication);
    expect(screen.getByText('Read Online').tagName).toBe('BUTTON');
  });

});
