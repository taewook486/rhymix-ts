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

// SPEC-AUTH-001 Slice B — opaque token utilities (signup verification, password reset, autologin keys).
export { generateToken, constantTimeEqual } from './tokens';
export type { TokenSpec } from './tokens';

// SPEC-AUTH-001 Slice B — mail dispatcher abstraction (real SMTP/Resend lands in SPEC-INFRA-001).
export {
  InMemoryMailDispatcher,
  NoopMailDispatcher,
} from './mail';
export type { MailDispatcher, MailMessage, MailTemplate } from './mail';

// SPEC-AUTH-001 Slice B — signup pipeline (REQ-AUTH-005/006/010/011/051/052).
export { signup, SignupInput } from './signup';
export type {
  SignupConfig,
  SignupErrorCode,
  SignupFailure,
  SignupResult,
} from './signup';
