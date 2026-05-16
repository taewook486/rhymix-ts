/**
 * Specification tests for AutoLogin Trust Marker — SPEC-AUTH-001 Slice H.
 *
 * Route Handler 에서 verifyAutoLogin 성공 후 발급한 nonce 를 authorize() 가
 * one-shot 소비하는 in-memory trust marker 의 동작을 검증한다.
 *
 * H-M1: registerAutoLoginMarker → 유니크 nonce 반환 (base64url 형식)
 * H-M2: consumeAutoLoginMarker → 첫 호출 true, 두 번째 호출 false (one-shot)
 * H-M3: 같은 userId 를 두 번 register → nonce 는 서로 달라야 한다
 * H-M4: 잘못된 nonce 로 consume → false (마커가 사라지지 않음)
 */

import { describe, expect, it } from 'vitest';

import {
  consumeAutoLoginMarker,
  registerAutoLoginMarker,
} from './autologin-marker';

describe('AutoLogin trust marker — Slice H', () => {
  it('H-M1: registerAutoLoginMarker returns a non-empty base64url-like nonce', () => {
    const nonce = registerAutoLoginMarker(42);
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThanOrEqual(20);
    // base64url charset: A-Z a-z 0-9 - _
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('H-M2: consumeAutoLoginMarker is one-shot — first call true, second call false', () => {
    const userId = 100;
    const nonce = registerAutoLoginMarker(userId);
    expect(consumeAutoLoginMarker(userId, nonce)).toBe(true);
    expect(consumeAutoLoginMarker(userId, nonce)).toBe(false);
  });

  it('H-M3: two register calls for the same userId return distinct nonces', () => {
    const userId = 200;
    const n1 = registerAutoLoginMarker(userId);
    const n2 = registerAutoLoginMarker(userId);
    expect(n1).not.toBe(n2);
    // 두 마커가 독립적으로 존재해야 한다.
    expect(consumeAutoLoginMarker(userId, n1)).toBe(true);
    expect(consumeAutoLoginMarker(userId, n2)).toBe(true);
  });

  it('H-M4: consume with wrong nonce returns false and does not remove the real marker', () => {
    const userId = 300;
    const realNonce = registerAutoLoginMarker(userId);
    expect(consumeAutoLoginMarker(userId, 'totally-bogus-nonce')).toBe(false);
    // 진짜 nonce 는 아직 살아있어야 한다.
    expect(consumeAutoLoginMarker(userId, realNonce)).toBe(true);
  });

  it('H-M5: consume with mismatched userId returns false', () => {
    const realUserId = 400;
    const wrongUserId = 401;
    const nonce = registerAutoLoginMarker(realUserId);
    expect(consumeAutoLoginMarker(wrongUserId, nonce)).toBe(false);
    expect(consumeAutoLoginMarker(realUserId, nonce)).toBe(true);
  });
});
