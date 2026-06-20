import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@/': path.join(__dirname, 'apps/web') + '/',
      '@/lib': path.join(__dirname, 'apps/web/lib'),
      '@/app': path.join(__dirname, 'apps/web/app'),
      '@/server': path.join(__dirname, 'apps/web/server'),
      // SPEC-PAGE-001: packages/page 패키지 alias
      '@rhymix-ts/page': path.join(__dirname, 'packages/page/src/index.ts'),
      // pnpm isolated 환경에서 react를 직접 참조할 수 없는 packages에 대한 해석
      'react': path.join(__dirname, 'node_modules/.pnpm/react@19.0.0/node_modules/react'),
      'react/jsx-runtime': path.join(__dirname, 'node_modules/.pnpm/react@19.0.0/node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.join(__dirname, 'node_modules/.pnpm/react@19.0.0/node_modules/react/jsx-dev-runtime'),
      'react-dom': path.join(__dirname, 'node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom'),
      'react-dom/server': path.join(__dirname, 'node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/server'),
      'react-dom/client': path.join(__dirname, 'node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/client'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    testTimeout: 15000,
    setupFiles: ['./apps/web/vitest.setup.ts'],
    environmentOptions: {
      jsdom: {
        // jsdom 환경에서는 globals 활성화
        globals: true,
      },
    },
    setupFiles: ['./apps/web/vitest.setup.ts'],
    environmentMatchGlobs: [
      ['packages/board/src/components/**/*.test.tsx', 'jsdom'],
      // SPEC-FEED-001 Slice C (T-011): board admin feed 설정 페이지 렌더 테스트
      ['apps/web/app/admin/boards/**/*.test.tsx', 'jsdom'],
      // SPEC-LAYOUT-001: themes DefaultLayout 렌더링 테스트
      ['themes/**/*.test.tsx', 'jsdom'],
      // SPEC-WIDGET-001: 위젯 컴포넌트 및 렌더 파이프라인 테스트
      ['packages/core/src/widgets/**/*.test.tsx', 'jsdom'],
      ['apps/web/lib/widgets/**/*.test.ts', 'jsdom'],
      ['apps/web/lib/widgets/**/*.test.tsx', 'jsdom'],
      ['apps/web/app/admin/widgets/**/*.test.tsx', 'jsdom'],
      // SPEC-THEME-POLISH-001: 다크모드 및 admin site design 컴포넌트 테스트
      ['apps/web/components/theme/**/*.test.tsx', 'jsdom'],
      ['apps/web/components/admin/site-design/**/*.test.tsx', 'jsdom'],
      ['packages/core/src/widgets/**/*.test.tsx', 'jsdom'],
      ['apps/web/lib/widgets/**/*.test.ts', 'jsdom'],
      ['apps/web/lib/widgets/**/*.test.tsx', 'jsdom'],
      ['apps/web/app/admin/widgets/**/*.test.tsx', 'jsdom'],
      // SPEC-THEME-POLISH-001: 다크모드 컴포넌트 테스트
      ['apps/web/components/theme/**/*.test.tsx', 'jsdom'],
    ],
    env: {
      // DB 없는 환경에서 통합 테스트를 기본으로 skip한다.
      // 실제 DB 테스트가 필요한 경우 SKIP_DB_TESTS=0으로 오버라이드.
      SKIP_DB_TESTS: '1',
    },
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.test.tsx',
      'packages/**/test/**/*.test.ts',
      'apps/**/lib/**/*.test.ts',
      'apps/**/lib/**/*.test.tsx',
      'apps/**/middleware.test.ts',
      'apps/**/proxy.test.ts',
      'apps/**/app/**/*.test.ts',
      'apps/**/app/**/*.test.tsx',
      'apps/**/server/**/*.test.ts',
      'apps/**/components/**/*.test.tsx',
      // SPEC-LAYOUT-001: themes 디렉토리 테스트 (monorepo root)
      'themes/**/*.test.ts',
      'themes/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'packages/auth/src/password.ts',
        'packages/auth/src/disposable-email.ts',
        'packages/core/src/install/**/*.ts',
        'packages/core/src/modules/**/*.ts',
        'packages/db/src/install-validate.ts',
        'packages/db/src/install/**/*.ts',
        'apps/web/lib/install/**/*.ts',
        'apps/web/lib/db/**/*.ts',
        'apps/web/middleware.ts',
        'apps/web/proxy.ts',
        'apps/web/app/api/install/**/*.ts',
        'apps/web/app/install/actions.ts',
        'apps/web/server/api/**/*.ts',
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
