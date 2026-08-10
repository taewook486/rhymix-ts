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
