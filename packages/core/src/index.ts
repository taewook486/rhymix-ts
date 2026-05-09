/**
 * @rhymix-ts/core — shared domain types and Zod schemas.
 *
 * Install wizard schemas now live in `./install/schemas` (SPEC-INSTALL-001).
 * Additional schemas (Document, Comment, ThemeManifest, ...) are added during
 * their respective /moai run cycles.
 */

// SPEC-AUTH-001: User status enum mirroring Prisma
export const UserStatus = {
  APPROVED: 'APPROVED',
  UNAUTHED: 'UNAUTHED',
  DENIED: 'DENIED',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// SPEC-INSTALL-001 i18n: supported wizard languages live in ./i18n/languages
// to keep schemas.ts free of circular imports through this barrel.
export { SUPPORTED_LANGUAGES } from './i18n/languages';
export type { SupportedLanguage } from './i18n/languages';

// SPEC-INSTALL-001: Re-export install wizard schemas from canonical location.
export {
  dbConfigSchema,
  adminConfigSchema,
  licenseAgreementSchema,
  installSessionSchema,
  envCheckResultSchema,
  INSTALL_STEPS,
  NEXTAUTH_SECRET_MIN_LENGTH,
} from './install/schemas';
export type {
  DbConfig,
  AdminConfig,
  LicenseAgreement,
  InstallSession,
  EnvCheckResult,
  InstallStep,
} from './install/schemas';

// SPEC-INSTALL-001 REQ-INSTALL-012: environment diagnostics.
export {
  runEnvDiagnostics,
  MIN_NODE_MAJOR,
  PER_CHECK_TIMEOUT_MS,
} from './install/diagnostics';
export type {
  DiagnosticsIO,
  EnvCheckReport,
  EnvCheckStatus,
  EnvCheckCategory,
} from './install/diagnostics';
