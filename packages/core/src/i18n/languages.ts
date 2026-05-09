/**
 * Supported wizard languages (SPEC-INSTALL-001 i18n).
 *
 * Kept in its own module to avoid circular imports between install/schemas.ts
 * and the package barrel (index.ts).
 */
export const SUPPORTED_LANGUAGES = [
  'ko',
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
  'de',
  'es',
  'fr',
  'mn',
  'ru',
  'tr',
  'vi',
  'id',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
