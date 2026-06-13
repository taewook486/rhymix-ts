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

// SPEC-MAIL-001 — SmtpMailDispatcher, createMailDispatcher, error types
export { SmtpMailDispatcher } from './mail/smtp-dispatcher.js';
export { createMailDispatcher } from './mail/factory.js';
export {
  MailConfigError,
  MailValidationError,
  MailTemplateError,
  MailDeliveryError,
} from './mail/errors.js';

// SPEC-AUTH-001 Slice B — signup pipeline (REQ-AUTH-005/006/010/011/051/052).
export { signup, SignupInput } from './signup';
export type {
  SignupConfig,
  SignupErrorCode,
  SignupFailure,
  SignupResult,
} from './signup';

// SPEC-AUTH-001 Slice C — login pipeline (REQ-AUTH-013/014/015/051/052).
export { login } from './login';
export type {
  LoginInput,
  LoginConfig,
  LoginUser,
  LoginResult,
  LoginFailure,
} from './login';

// SPEC-AUTH-001 Slice C — email verification (REQ-AUTH-012, AC-AUTH-012).
export { verifyEmail } from './verify-email';
export type {
  VerifyEmailInput,
  VerifyEmailCtx,
  VerifyEmailErrorCode,
  VerifyEmailSuccess,
  VerifyEmailFailure,
} from './verify-email';

// SPEC-AUTH-001 Slice D1 — session revocation foundation (REQ-AUTH-020 primitive).
export { revokeAllSessions, isSessionRevoked } from './session-revocation';
export type {
  RevocationReason,
  RevokeSessionsContext,
  IsSessionRevokedContext,
} from './session-revocation';

// SPEC-AUTH-001 Slice D2 — RBAC primitives (REQ-AUTH-034, REQ-AUTH-054).
export {
  resolveAdminPrivilege,
  isLastAdmin,
  assertCanDemote,
  ADMIN_DEMOTION_LOCK_ID,
  LastAdminProtectedError,
} from './rbac';

// SPEC-AUTH-001 Slice E — autologin / remember me (REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053).
export { createAutoLogin, verifyAutoLogin, revokeAutoLogin } from './autologin';

// SPEC-AUTH-001 Slice H — autologin trust marker (Route Handler ↔ authorize() one-shot signal).
export {
  registerAutoLoginMarker,
  consumeAutoLoginMarker,
} from './autologin-marker';
export type {
  CreateAutoLoginInput,
  CreateAutoLoginCtx,
  VerifyAutoLoginInput,
  VerifyAutoLoginCtx,
  AutoLoginResult,
  RevokeAutoLoginInput,
  RevokeAutoLoginCtx,
} from './autologin';

// SPEC-AUTH-001 Slice E — password reset (REQ-AUTH-016, REQ-AUTH-017, AC-AUTH-017).
export { requestPasswordReset, confirmPasswordReset } from './password-reset';
export type {
  RequestPasswordResetInput,
  RequestPasswordResetCtx,
  ConfirmPasswordResetInput,
  ConfirmPasswordResetCtx,
  PasswordResetResult,
  ConfirmResetResult,
} from './password-reset';

// SPEC-AUTH-001 Slice E — admin role toggle (REQ-AUTH-054, AC-AUTH-054).
export { toggleAdminRole } from './admin-role';
export type {
  ToggleAdminRoleInput,
  ToggleAdminRoleCtx,
  ToggleAdminRoleResult,
} from './admin-role';

// SPEC-AUTH-001 Slice D2 — admin features (REQ-AUTH-020, REQ-AUTH-021).
export { changeUserStatus, softDeleteUser } from './admin';
export type {
  AdminCtx,
  AdminStatusTransition,
  ChangeStatusInput,
  ChangeStatusResult,
  SoftDeleteInput,
  SoftDeleteResult,
} from './admin';
