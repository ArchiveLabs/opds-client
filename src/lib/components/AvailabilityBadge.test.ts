import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AvailabilityBadge from './AvailabilityBadge.svelte';

describe('AvailabilityBadge — open access', () => {
  it('renders badge-unlock when hasOpenAccess is true', () => {
    const { container } = render(AvailabilityBadge, { hasOpenAccess: true });
    expect(container.querySelector('.badge-unlock')).toBeInTheDocument();
  });

  it('open access takes priority over unavailable availability', () => {
    const { container } = render(AvailabilityBadge, {
      hasOpenAccess: true,
      availability: { type: 'unavailable' },
    });
    expect(container.querySelector('.badge-unlock')).toBeInTheDocument();
    expect(container.querySelector('.badge-clock')).toBeNull();
  });

  it('open access takes priority over available-to-borrow', () => {
    const { container } = render(AvailabilityBadge, {
      hasOpenAccess: true,
      availability: { type: 'available' },
    });
    expect(container.querySelector('.badge-unlock')).toBeInTheDocument();
    expect(container.querySelector('.badge-book')).toBeNull();
  });
});

describe('AvailabilityBadge — ready (borrowed)', () => {
  it('renders book-available when ready with until date', () => {
    const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const { container } = render(AvailabilityBadge, { availability: { type: 'ready', until } });
    expect(container.querySelector('.book-available')).toBeInTheDocument();
  });

  it('renders book-available when no until date is provided', () => {
    const { container } = render(AvailabilityBadge, { availability: { type: 'ready' } });
    expect(container.querySelector('.book-available')).toBeInTheDocument();
  });

  it('ready takes priority over canPurchase', () => {
    const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const { container } = render(AvailabilityBadge, { availability: { type: 'ready', until }, canPurchase: true });
    expect(container.querySelector('.book-available')).toBeInTheDocument();
    expect(container.querySelector('.badge-dollar')).toBeNull();
  });

  it('ready takes priority over hasOpenAccess', () => {
    const { container } = render(AvailabilityBadge, { availability: { type: 'ready' }, hasOpenAccess: true });
    expect(container.querySelector('.book-available')).toBeInTheDocument();
    expect(container.querySelector('.badge-unlock')).toBeNull();
  });
});

describe('AvailabilityBadge — available for purchase', () => {
  it('renders badge-dollar when canPurchase is true', () => {
    const { container } = render(AvailabilityBadge, { canPurchase: true });
    expect(container.querySelector('.badge-dollar')).toBeInTheDocument();
  });

  it('purchase takes priority over unavailable', () => {
    const { container } = render(AvailabilityBadge, {
      availability: { type: 'unavailable' },
      canPurchase: true,
    });
    expect(container.querySelector('.badge-dollar')).toBeInTheDocument();
    expect(container.querySelector('.badge-clock')).toBeNull();
  });

  it('available-to-borrow takes priority over canPurchase', () => {
    const { container } = render(AvailabilityBadge, {
      availability: { type: 'available' },
      canPurchase: true,
    });
    expect(container.querySelector('.badge-book')).toBeInTheDocument();
    expect(container.querySelector('.badge-dollar')).toBeNull();
  });
});

describe('AvailabilityBadge — available to borrow', () => {
  it('renders badge-book when availability type is available', () => {
    const { container } = render(AvailabilityBadge, { availability: { type: 'available' } });
    expect(container.querySelector('.badge-book')).toBeInTheDocument();
  });
});

describe('AvailabilityBadge — unavailable', () => {
  it('renders badge-clock when unavailable and no purchase option', () => {
    const { container } = render(AvailabilityBadge, { availability: { type: 'unavailable' } });
    expect(container.querySelector('.badge-clock')).toBeInTheDocument();
  });
});

describe('AvailabilityBadge — nothing shown', () => {
  it('renders nothing when no props provided', () => {
    const { container } = render(AvailabilityBadge);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders nothing for an unknown availability type', () => {
    const { container } = render(AvailabilityBadge, {
      availability: { type: 'reserved' },
    });
    expect(container.querySelector('p')).toBeNull();
  });
});
