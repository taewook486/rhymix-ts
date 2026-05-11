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
    env: {
      // DB 없는 환경에서 통합 테스트를 기본으로 skip한다.
      // 실제 DB 테스트가 필요한 경우 SKIP_DB_TESTS=0으로 오버라이드.
      SKIP_DB_TESTS: '1',
    },
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/test/**/*.test.ts',
      'apps/**/lib/**/*.test.ts',
      'apps/**/middleware.test.ts',
      'apps/**/proxy.test.ts',
      'apps/**/app/**/*.test.ts',
      'apps/**/app/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'packages/auth/src/password.ts',
        'packages/auth/src/disposable-email.ts',
        'packages/core/src/install/**/*.ts',
        'packages/db/src/install-validate.ts',
        'packages/db/src/install/**/*.ts',
        'apps/web/lib/install/**/*.ts',
        'apps/web/middleware.ts',
        'apps/web/proxy.ts',
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
