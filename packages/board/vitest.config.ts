import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    // tsconfig.base.json "jsx": "preserve" 는 Next.js용이므로 vitest 에서는 자동 런타임 명시
    jsx: 'automatic',
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./src/components/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 60000,
    env: {
      SKIP_DB_TESTS: '1',
    },
  },
});
