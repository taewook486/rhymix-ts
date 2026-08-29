/**
 * ESLint flat config for Next.js 16 — TypeScript + Core Web Vitals.
 *
 * Next.js 16 removed the `next lint` subcommand. Use ESLint directly.
 *
 * See: https://nextjs.org/docs/app/api-reference/config/eslint
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 워크스페이스 공통 방침에 맞춘다 (루트 eslint.config.mjs 와 동일).
    // any 는 기존 부채라 한 번에 없앨 수 없어 경고로 둔다. 끄지는 않는다 —
    // 이 저장소는 줄 단위 eslint-disable-next-line 으로 표시해 온 관례가 있어
    // 규칙을 끄면 그 주석들이 전부 "미사용 disable" 이 된다.
    // 현재 잔여: 테스트 84건(대부분 `'invalid' as any` 처럼 잘못된 입력을 일부러
    // 주입해 거부를 검증하는 자리), 소스 0건.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
