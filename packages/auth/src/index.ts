export { authConfig } from './config';
export type { AuthConfig } from './config';

// SPEC-AUTH-001 / SPEC-INSTALL-001 REQ-INSTALL-001: Argon2id password helpers.
export {
  hashPassword,
  verifyPassword,
  needsUpgrade,
  PASSWORD_VERSION_TAG,
  ARGON2ID_PARAMS,
} from './password';

// SPEC-INSTALL-001 REQ-INSTALL-054: 일회용 이메일 도메인 차단.
export { isDisposableEmail, DISPOSABLE_EMAIL_DOMAINS } from './disposable-email';
