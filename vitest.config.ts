import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // Keep tests fully isolated from Next.js / PostCSS / Tailwind build config.
  // The `lib/analysis/` modules are pure TypeScript with no framework deps,
  // so they don't need path aliases or build-time plugins.
  resolve: {
    alias: {
      // `server-only` is a marker package that throws when imported from a
      // Client Component. In tests (Node env, no React), replace it with a
      // no-op so server-only modules can be loaded directly.
      'server-only': path.resolve(__dirname, 'tests/_server-only-shim.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'agents/**/*.test.ts',
      'types/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
  },
});
