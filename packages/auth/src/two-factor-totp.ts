/**
 * SPEC-ADMIN-2FA-OTP-001 M2: TOTP generation and verification
 *
 * REQ-2OTP-020: Generate TOTP secret + otpauth URL + QR code
 * REQ-2OTP-021: Verify TOTP code with ±1 step time window
 * REQ-2OTP-080: Unit tests for ±1 window boundary and expired code
 *
 * @MX:ANCHOR: Single entry point for TOTP operations
 * @MX:REASON: All TOTP generation/verification MUST go through these functions
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001
 */

import { generateSecret, generateURI, verifySync } from 'otplib';
// qrcode 패키지의 타입 선언(@types/qrcode)은 apps/web 에 설치되어 있어
// packages/auth 컴파일 시에는 해석되지 않는다. 런타임 시그니처만 사용.
// @ts-expect-error — qrcode 타입 선언이 이 패키지 범위에서 누락됨 (workspace hoist)
import * as QRCode from 'qrcode';

/**
 * REQ-2OTP-020: Generate a fresh TOTP secret
 *
 * Generates a cryptographically random base32 secret for TOTP.
 * Uses otplib's generateSecret() with default length.
 *
 * @returns Base32-encoded TOTP secret (uppercase A-Z, 2-7)
 */
export function generateTotpSecret(): string {
  // Use oplib v13 generateSecret API
  return generateSecret();
}

/**
 * REQ-2OTP-020: Build otpauth:// URL for QR code generation
 *
 * Format: otpauth://totp/Account:Issuer?secret=...&issuer=...
 * (Note: otplib's generateURI returns this format, matching RFC 6238)
 *
 * @param params - Object containing issuer, account, and secret
 * @returns otpauth:// URL string
 */
export function buildOtpauthUrl(params: {
  issuer: string;
  account: string;
  secret: string;
}): string {
  // Use otplib v13 generateURI API
  // The label is "account:issuer" format for otpauth URLs
  const label = `${params.account}:${params.issuer}`;

  return generateURI({
    strategy: 'totp',
    label,
    secret: params.secret,
    issuer: params.issuer,
  });
}

/**
 * REQ-2OTP-021: Verify TOTP code against secret with time window
 *
 * REQ-2OTP-080: Uses ±1 step window by default (30-second steps)
 * Returns true only if code matches within the specified window.
 *
 * @param secret - Base32 TOTP secret
 * @param code - 6-digit code to verify
 * @param window - Time window in steps (default: 1 for ±30 seconds)
 * @returns true if code is valid within window, false otherwise
 */
export function verifyTotp(
  secret: string,
  code: string,
  window: number = 1
): boolean {
  // Validate code format first (6 digits, numeric)
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  try {
    // otplib v13 API: epochTolerance 는 초 단위 대칭 허용 오차.
    // ±1 step(30s) = 30초. window 인자는 하위 호환성을 위해 유지되나
    // 최신 API에서는 epochTolerance 만 의미가 있다.
    const toleranceSeconds = window * 30;
    const result = verifySync({
      secret,
      token: code,
      epochTolerance: toleranceSeconds,
    });

    return result.valid;
  } catch {
    return false;
  }
}

/**
 * REQ-2OTP-020: Generate QR code as data URL for TOTP enrollment
 *
 * Generates a QR code containing the otpauth:// URL that users can scan
 * with their authenticator app (Google Authenticator, Authy, etc.).
 *
 * @param params - Object containing issuer, account, and secret
 * @returns Data URL (data:image/svg+xml;base64,...) of QR code in SVG format
 */
export async function generateTotpQrCode(params: {
  issuer: string;
  account: string;
  secret: string;
}): Promise<string> {
  const url = buildOtpauthUrl(params);

  // Generate QR code as SVG data URL
  const qrSvg = await QRCode.toString(url, {
    type: 'svg',
    width: 200,
  });

  // Convert to base64 data URL
  const base64 = Buffer.from(qrSvg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
