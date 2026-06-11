import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 60000,
    env: {
      SKIP_DB_TESTS: '1',
    },
  },
});
