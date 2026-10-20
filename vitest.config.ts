import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

// Provide stub implementations for SvelteKit virtual modules that are
// unavailable outside of the SvelteKit Vite plugin environment.
const svelteKitStubs = {
  name: 'sveltekit-stubs',
  resolveId(id: string) {
    if (id.startsWith('$app/')) return `\0${id}`;
  },
  load(id: string) {
    if (id === '\0$app/navigation') {
      return 'export const pushState = () => {}; export const replaceState = () => {};';
    }
    if (id === '\0$app/stores') {
      return "import { readable } from 'svelte/store'; export const page = readable({});";
    }
  },
};

export default defineConfig({
  plugins: [svelte({ hot: false }), svelteKitStubs],
  resolve: {
    alias: { $lib: resolve('./src/lib') },
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
