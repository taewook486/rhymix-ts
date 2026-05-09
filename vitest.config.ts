import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@/': path.join(__dirname, 'apps/web') + '/',
      '@/lib': path.join(__dirname, 'apps/web/lib'),
      '@/app': path.join(__dirname, 'apps/web/app'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'apps/**/lib/**/*.test.ts',
      'apps/**/middleware.test.ts',
      'apps/**/app/**/*.test.ts',
      'apps/**/app/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'packages/auth/src/password.ts',
        'packages/core/src/install/**/*.ts',
        'packages/db/src/install-validate.ts',
        'apps/web/lib/install/**/*.ts',
        'apps/web/middleware.ts',
        'apps/web/app/api/install/**/*.ts',
        'apps/web/app/install/actions.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/node_modules/**',
        '**/dist/**',
        // tsx UI is verified by manual smoke + future Playwright (Slice E).
        '**/*.tsx',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});
