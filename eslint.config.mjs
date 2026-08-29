/**
 * 워크스페이스 패키지용 ESLint flat config.
 *
 * apps/web 은 자체 설정(apps/web/eslint.config.mjs, eslint-config-next)을 쓰므로
 * 여기서는 제외한다. 이 파일은 packages/* 와 themes/* 를 담당한다.
 *
 * 타입 정보를 요구하는 규칙(projectService)은 켜지 않았다 — 17개 패키지에
 * 타입체크를 한 번 더 도는 비용이 붙는데, 타입 결함은 이미 `turbo run typecheck`
 * 가 잡는다. 린트는 타입체크가 못 잡는 것만 본다.
 *
 * 심각도 방침:
 * - error: 고치면 코드가 줄거나 실제 위험이 사라지는 것 (미사용 식별자, require 혼용 등)
 * - warn : 기존 부채라 한 번에 못 없애는 것 (no-explicit-any). 줄여 나가되
 *          지금 빌드를 막지는 않는다. 진행 상황은 docs/NEXT_SESSION.md 참고
 */
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.d.ts',
      'packages/db/prisma/**',
      'apps/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { '@typescript-eslint': tsPlugin, react: reactPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,

      // TypeScript 가 이미 담당하는 검사 — 켜 두면 오탐만 난다.
      // (typescript-eslint 공식 권고)
      'no-undef': 'off',
      // `const X = {...} as const` + `type X = ...` 는 값과 타입이 서로 다른
      // 선언 공간에 있는 정상 TS 관용구다. 이 저장소가 열거형에 쓰는 방식이라
      // TS 인지 버전까지 꺼 둔다.
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // 기존 부채 308건. 줄여 나가는 대상이라 지금은 경고.
      '@typescript-eslint/no-explicit-any': 'warn',

      // 코드베이스가 이미 줄 단위 disable 주석으로 표시해 온 규칙.
      // 플러그인을 안 걸면 그 주석들이 "정의되지 않은 규칙" 오류가 된다.
      'react/no-danger': 'warn',
    },
  },
];
