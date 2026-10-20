import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import opdsCatalogJson from '../../../../opds-catalog.json';

vi.mock('$app/navigation', () => ({
  pushState: vi.fn(),
  replaceState: vi.fn(),
}));

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

import Feed from '$lib/components/views/Feed.svelte';

const baseStoreState = {
  state: opdsCatalogJson,
  consentContext: null,
  attemptedUrl: 'https://openlibrary.org/opds',
  mimetype: 'application/opds+json',
  mode: 'loaded',
  navbarSearchTerm: '',
  searchState: 'done',
  returnUrl: '',
};

beforeEach(() => {
  mockStore.setValue(baseStoreState);
  vi.clearAllMocks();
});

describe('Feed — opds-catalog.json fixture', () => {
  it('renders the feed title', () => {
    render(Feed);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Open Library');
  });

  it('renders navigation items as links', () => {
    render(Feed);
    expect(screen.getByText('Art')).toBeInTheDocument();
    expect(screen.getByText('Science Fiction')).toBeInTheDocument();
    expect(screen.getByText('Fantasy')).toBeInTheDocument();
  });

  it('renders all 15 navigation links', () => {
    render(Feed);
    // Scope to .filterbar to avoid collisions with group headings that share names
    const filterbar = document.querySelector('.filterbar') as HTMLElement;
    const links = within(filterbar).getAllByRole('link');
    expect(links).toHaveLength(15);
    expect(within(filterbar).getByText('Art')).toBeInTheDocument();
    expect(within(filterbar).getByText('Science Fiction')).toBeInTheDocument();
    expect(within(filterbar).getByText('Mystery and Detective Stories')).toBeInTheDocument();
  });

  it('renders all 6 group section headings', () => {
    render(Feed);
    // Scope to main.feedMain — the groups live there; the filterbar is outside
    const feedMain = document.querySelector('main.feedMain') as HTMLElement;
    expect(within(feedMain).getByText('Trending Books')).toBeInTheDocument();
    expect(within(feedMain).getByText('Classic Books')).toBeInTheDocument();
    expect(within(feedMain).getByText('Romance')).toBeInTheDocument();
    expect(within(feedMain).getByText('Kids')).toBeInTheDocument();
    expect(within(feedMain).getByText('Thrillers')).toBeInTheDocument();
    expect(within(feedMain).getByText('Textbooks')).toBeInTheDocument();
  });

  it('does not show the empty-feed message', () => {
    render(Feed);
    expect(screen.queryByText(/Nothing to see here/)).not.toBeInTheDocument();
  });

  it('does not show "No more results" when there is no next link', () => {
    render(Feed);
    expect(screen.queryByText('No more results')).not.toBeInTheDocument();
  });
});

describe('Feed — empty state', () => {
  const emptyState = {
    metadata: { title: 'Empty Feed' },
    links: [],
    navigation: [],
    groups: [],
    publications: [],
    facets: [],
  };

  beforeEach(() => {
    mockStore.setValue({ ...baseStoreState, state: emptyState });
  });

  it('renders the feed title', () => {
    render(Feed);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Empty Feed');
  });

  it('shows empty state message', () => {
    const { container } = render(Feed);
    expect(container.querySelector('.nothing')).toBeInTheDocument();
  });
});

describe('Feed — search states', () => {
  const stateWithNextLink = {
    metadata: { title: 'Search Results' },
    links: [
      { rel: 'next', href: 'https://openlibrary.org/opds?page=2', type: 'application/opds+json' },
    ],
    navigation: [],
    groups: [],
    publications: [],
    facets: [],
  };

  it('shows "No more results" when searchState is "empty"', () => {
    mockStore.setValue({ ...baseStoreState, state: stateWithNextLink, searchState: 'empty' });
    render(Feed);
    expect(screen.getByText('No more results')).toBeInTheDocument();
  });

  it('shows a loading spinner when searchState is "loading"', () => {
    mockStore.setValue({ ...baseStoreState, state: stateWithNextLink, searchState: 'loading' });
    render(Feed);
    // The loader is a <span class="loader"> shown while fetching next page
    expect(document.querySelector('.loader')).toBeInTheDocument();
  });
});
