import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@rhymix-ts/spam': path.resolve(__dirname, './src'),
      '@rhymix-ts/db': path.resolve(__dirname, '../db/src'),
      '@rhymix-ts/core': path.resolve(__dirname, '../core/src'),
    },
  },
});
