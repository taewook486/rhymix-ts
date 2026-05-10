export { authConfig } from './config';
export type { AuthConfig } from './config';

// SPEC-AUTH-001 / SPEC-INSTALL-001 REQ-INSTALL-001: Argon2id password helpers.
export {
  hashPassword,
  verifyPassword,
  isLegacyHash,
  needsUpgrade,
  PASSWORD_VERSION_TAG,
  PASSWORD_ALGO,
  ARGON2ID_PARAMS,
} from './password';
export type { PasswordHashOptions, PasswordVerifyResult } from './password';

// SPEC-INSTALL-001 REQ-INSTALL-054: 일회용 이메일 도메인 차단.
export { isDisposableEmail, DISPOSABLE_EMAIL_DOMAINS } from './disposable-email';
