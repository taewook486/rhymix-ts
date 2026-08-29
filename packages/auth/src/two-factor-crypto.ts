/**
 * SPEC-ADMIN-2FA-OTP-001 M1: AES-256-GCM encryption for TOTP secrets
 *
 * REQ-2OTP-002: TOTP secret encryption at rest using AES-256-GCM
 * REQ-2OTP-005: Fail closed when key is absent
 * REQ-2OTP-006: Unique IV per encryption (CSPRNG, never reuse)
 * REQ-2OTP-044: Fail closed on decryption failure
 *
 * @MX:ANCHOR: Single entry point for secret protection
 * @MX:REASON: All TOTP secret encryption/decryption MUST go through these functions
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce size
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * REQ-2OTP-002: Encrypt TOTP secret using AES-256-GCM
 *
 * Returns format: base64(iv):base64(authTag):base64(ciphertext)
 * The IV and auth tag are stored alongside ciphertext for decryption.
 *
 * REQ-2OTP-006: Each encryption uses a fresh CSPRNG IV (never reused)
 * REQ-2OTP-005: Throws if TWO_FACTOR_ENC_KEY is missing (fail-closed)
 *
 * @param plaintext - The TOTP secret to encrypt (base32 string)
 * @returns Encrypted string with format: base64(iv):base64(tag):base64(ciphertext)
 * @throws Error if TWO_FACTOR_ENC_KEY is not set or too short
 */
export function encryptSecret(plaintext: string): string {
  const key = process.env.TWO_FACTOR_ENC_KEY;
  if (!key) {
    throw new Error('TWO_FACTOR_ENC_KEY must be set in environment');
  }

  // Derive 32-byte key from env var (use first 32 bytes or hash if longer)
  const keyBuffer = Buffer.from(key).slice(0, KEY_LENGTH);
  if (keyBuffer.length < KEY_LENGTH) {
    // For production, should use HKDF or scrypt, but for now truncate/extend
    // REQ-2OTP-008: Key compromise requires forced re-enrollment
    throw new Error('TWO_FACTOR_ENC_KEY must be at least 32 bytes');
  }

  // REQ-2OTP-006: Unique IV per encryption (CSPRNG)
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'binary');
  encrypted += cipher.final('binary');

  // Get auth tag (GCM provides authentication)
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${Buffer.from(encrypted, 'binary').toString('base64')}`;
}

/**
 * REQ-2OTP-002: Decrypt TOTP secret encrypted with encryptSecret
 *
 * REQ-2OTP-044: Fail closed on corrupt/invalid data (throws, doesn't return plaintext)
 * REQ-2OTP-005: Throws if TWO_FACTOR_ENC_KEY is missing
 *
 * @param encrypted - Encrypted string with format: base64(iv):base64(tag):base64(ciphertext)
 * @returns Decrypted plaintext TOTP secret
 * @throws Error if format is invalid, decryption fails, or key is missing
 */
export function decryptSecret(encrypted: string): string {
  const key = process.env.TWO_FACTOR_ENC_KEY;
  if (!key) {
    throw new Error('TWO_FACTOR_ENC_KEY must be set in environment');
  }

  const keyBuffer = Buffer.from(key).slice(0, KEY_LENGTH);
  if (keyBuffer.length < KEY_LENGTH) {
    throw new Error('TWO_FACTOR_ENC_KEY must be at least 32 bytes');
  }

  // Parse format: base64(iv):base64(authTag):base64(ciphertext)
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;

  try {
    // noUncheckedIndexedAccess 방어 — 위에서 parts.length === 3 을 확인했으므로
    // 세 원소 모두 존재하지만 TS 는 string | undefined 로 추론한다.
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    // REQ-2OTP-044: Fail closed on corrupt data
    throw new Error('Decryption failed - data may be corrupt or key changed');
  }
}
