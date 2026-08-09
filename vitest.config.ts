import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Keep tests fully isolated from Next.js / PostCSS / Tailwind build config.
  // The `lib/analysis/` modules are pure TypeScript with no framework deps,
  // so they don't need path aliases or build-time plugins.
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/*.test.ts', 'agents/**/*.test.ts', 'types/**/*.test.ts'],
  },
});
