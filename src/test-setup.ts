import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom stubs for browser APIs used by Svelte components.
// Must be real classes/functions so they work with `new`.

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: ResizeObserverCallback) {}
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);
