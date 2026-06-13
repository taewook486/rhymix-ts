import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@rhymix-ts/admin': './src',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
