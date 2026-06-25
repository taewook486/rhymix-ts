/**
 * SPEC-ADMIN-2FA-OTP-001 M1: Backup codes generation and verification
 *
 * REQ-2OTP-003: SHA-256 hashing + constant-time comparison (no Argon2id)
 * REQ-2OTP-025: One-time display, high-entropy random codes
 * REQ-2OTP-026: 10 alphanumeric chars, 5-5 grouping display, normalized 10-char comparison
 * REQ-2OTP-041: Single-use consumption
 *
 * @MX:ANCHOR: Single entry point for backup code operations
 * @MX:REASON: All backup code generation/verification MUST go through these functions
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const CODE_LENGTH = 10;
const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_COUNT = 10;

/**
 * REQ-2OTP-026: Normalize backup code for comparison/hashing
 *
 * Strips hyphens and folds to uppercase to produce canonical 10-character form.
 * Display format (XXXXX-XXXXX) is cosmetic; canonical form is XXXXXXXXXXXX.
 *
 * @param code - User-provided backup code (with or without hyphen, mixed case)
 * @returns Normalized 10-character uppercase alphanumeric string
 */
export function normalizeBackupCode(code: string): string {
  // Remove hyphens and convert to uppercase
  return code.replace(/-/g, '').toUpperCase();
}

/**
 * REQ-2OTP-025: Generate high-entropy backup codes
 *
 * Generates cryptographically secure random alphanumeric codes.
 * REQ-2OTP-026: Each code is 10 characters, displayed as XXXXX-XXXXX.
 *
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of backup codes in display format (5-5 grouping with hyphen)
 */
export function generateBackupCodes(count: number = DEFAULT_COUNT): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 10 random characters from CSPRNG
    const bytes = randomBytes(CODE_LENGTH);
    let code = '';

    for (let j = 0; j < CODE_LENGTH; j++) {
      // Use byte to index into CODE_CHARS for uniform distribution.
      // noUncheckedIndexedAccess: bytes[j] 는 number | undefined 로 추론되지만
      // randomBytes(CODE_LENGTH) 로 정확히 CODE_LENGTH 길이를 받았으므로 안전하다.
      const byte = bytes[j] ?? 0;
      const index = byte % CODE_CHARS.length;
      code += CODE_CHARS[index];
    }

    // REQ-2OTP-026: Display format: XXXXX-XXXXX (5-5 grouping)
    const displayCode = `${code.slice(0, 5)}-${code.slice(5)}`;
    codes.push(displayCode);
  }

  return codes;
}

/**
 * REQ-2OTP-003: Hash backup code using SHA-256
 *
 * Uses canonical form (normalized, no hyphens, uppercase).
 * No salt needed - codes are already high-entropy random values.
 * Argon2id is NOT used (per REQ-2OTP-003 - unnecessary performance cost).
 *
 * @param code - Backup code in display format or normalized form
 * @returns SHA-256 hash as hex string (64 hex characters)
 */
export function hashBackupCode(code: string): string {
  const normalized = normalizeBackupCode(code);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * REQ-2OTP-041: Verify backup code against stored hashes
 *
 * Uses constant-time comparison to prevent timing attacks.
 * REQ-2OTP-041: Single-use - verified code is removed from returned hashes.
 *
 * @param code - User-provided backup code
 * @param hashes - Array of SHA-256 hashes stored in DB
 * @returns Object with { verified: boolean, remainingHashes: string[] }
 */
export function verifyBackupCode(
  code: string,
  hashes: string[]
): { verified: boolean; remainingHashes: string[] } {
  const inputHash = hashBackupCode(code);

  // Find matching hash
  const matchIndex = hashes.findIndex((storedHash) => {
    // REQ-2OTP-003: Constant-time comparison
    if (storedHash.length !== inputHash.length) {
      return false;
    }

    try {
      return timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(inputHash, 'hex')
      );
    } catch {
      return false;
    }
  });

  if (matchIndex === -1) {
    // No match - return original hashes unchanged
    return { verified: false, remainingHashes: hashes };
  }

  // REQ-2OTP-041: Single-use - remove verified code
  const remainingHashes = [...hashes];
  remainingHashes.splice(matchIndex, 1);

  return { verified: true, remainingHashes };
}
