import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // happy-dom gives us document / window / customElements / Shadow DOM
    // so we can mount and assert against the four custom cards. ~5x
    // faster than jsdom for this workload and has the APIs LitElement
    // needs (CSSStyleSheet, MutationObserver, MediaQueryList).
    environment: 'happy-dom',
    globals: false,
    // Single shared setup wires LitElement + helper stubs (HA's <ha-card>,
    // <ha-icon>, <action-handler> are not real customElements outside HA,
    // so we register lightweight shims).
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/editor/**', 'src/types/**'],
    },
  },
});
