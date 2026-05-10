/**
 * Specification tests for opaque token utilities.
 * SPEC-AUTH-001 Slice B — REQ-AUTH-011 (signup token), REQ-AUTH-018/019 (autologin keys).
 *
 * 토큰 모듈은 EmailAuthToken.authKey, AutoLogin.securityKey 등 모든 인증 비밀의
 * 단일 발급 지점이며, 타이밍 안전 비교 헬퍼를 함께 제공한다.
 */
import { describe, expect, it } from 'vitest';

import { constantTimeEqual, generateToken } from './tokens';

describe('generateToken', () => {
  it('produces a 43-character base64url string by default (32 bytes)', () => {
    const token = generateToken();
    expect(token).toHaveLength(43);
  });

  it('generates 1000 unique tokens without collisions', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      set.add(generateToken());
    }
    expect(set.size).toBe(1000);
  });

  it('contains only base64url-safe characters [A-Za-z0-9_-]', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('honors a custom byte length (16 bytes -> 22 chars unpadded)', () => {
    expect(generateToken({ bytes: 16 })).toHaveLength(22);
  });
});

describe('constantTimeEqual', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different content of equal length', () => {
    expect(constantTimeEqual('abc123', 'abc124')).toBe(false);
  });

  it('returns false for strings of different length without throwing', () => {
    expect(constantTimeEqual('short', 'longer-string')).toBe(false);
  });

  it('returns false when either side is empty', () => {
    expect(constantTimeEqual('', 'abc')).toBe(false);
    expect(constantTimeEqual('abc', '')).toBe(false);
  });
});
