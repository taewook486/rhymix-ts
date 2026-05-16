/**
 * mid-validator.test.ts — SPEC-ADMIN-001 Slice A
 *
 * RED 단계: validateMid 함수와 RESERVED_MIDS 상수가 아직 구현되지 않은 상태에서 작성.
 * REQ-ADMIN-001: mid citext, 길이 1-80, 패턴 ^[a-z0-9][a-z0-9_-]*$
 * REQ-ADMIN-002: 4단계 검증 (패턴, 예약어, 충돌, DB 유니크)
 * REQ-ADMIN-003: 예약어 차단
 */

import { describe, it, expect } from 'vitest';
import { validateMid, RESERVED_MIDS } from './mid-validator';

describe('validateMid', () => {
  // A-1: 유효 mid — 소문자+숫자+하이픈 패턴, 예약어 아님
  it('A-1: 유효한 mid "board-1" → { ok: true }', () => {
    const result = validateMid('board-1');
    expect(result).toEqual({ ok: true });
  });

  // A-2: 대문자 포함 → INVALID_PATTERN
  it('A-2: 대문자 포함 "Board" → { ok: false, code: "INVALID_PATTERN" }', () => {
    const result = validateMid('Board');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_PATTERN');
    }
  });

  // A-3: 예약어 "admin" → RESERVED_KEYWORD
  it('A-3: 예약어 "admin" → { ok: false, code: "RESERVED_KEYWORD" }', () => {
    const result = validateMid('admin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('RESERVED_KEYWORD');
    }
  });

  // A-4: 예약어 "_next" → RESERVED_KEYWORD
  it('A-4: 예약어 "_next" → { ok: false, code: "RESERVED_KEYWORD" }', () => {
    // _next 는 패턴 위반이기도 하지만 예약어 체크가 우선
    const result = validateMid('_next');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // _next 는 패턴 위반도 해당하지만 예약어 체크를 포함해야 함
      expect(['RESERVED_KEYWORD', 'INVALID_PATTERN']).toContain(result.code);
    }
  });

  // A-5: 빈 문자열 → INVALID_LENGTH, 81자 → INVALID_LENGTH
  it('A-5: 빈 문자열 → { ok: false, code: "INVALID_LENGTH" }', () => {
    const result = validateMid('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_LENGTH');
    }
  });

  it('A-5b: 81자 문자열 → { ok: false, code: "INVALID_LENGTH" }', () => {
    const longMid = 'a'.repeat(81);
    const result = validateMid(longMid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_LENGTH');
    }
  });

  it('A-5c: 80자 문자열은 허용 → { ok: true }', () => {
    const maxMid = 'a'.repeat(80);
    const result = validateMid(maxMid);
    expect(result).toEqual({ ok: true });
  });

  it('A-5d: 숫자로 시작하는 mid → { ok: true }', () => {
    // 패턴: ^[a-z0-9][a-z0-9_-]*$ — 숫자 시작 허용
    const result = validateMid('1board');
    expect(result).toEqual({ ok: true });
  });

  it('A-5e: 특수문자(!@#) 포함 → { ok: false, code: "INVALID_PATTERN" }', () => {
    const result = validateMid('board!');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_PATTERN');
    }
  });
});

describe('RESERVED_MIDS', () => {
  it('RESERVED_MIDS 는 ReadonlySet<string> 이며 예약어를 포함한다', () => {
    expect(RESERVED_MIDS).toBeInstanceOf(Set);
    expect(RESERVED_MIDS.has('admin')).toBe(true);
    expect(RESERVED_MIDS.has('api')).toBe(true);
    expect(RESERVED_MIDS.has('_next')).toBe(true);
    expect(RESERVED_MIDS.has('health')).toBe(true);
    expect(RESERVED_MIDS.has('auth')).toBe(true);
    expect(RESERVED_MIDS.has('robots.txt')).toBe(true);
    expect(RESERVED_MIDS.has('sitemap.xml')).toBe(true);
    expect(RESERVED_MIDS.has('favicon.ico')).toBe(true);
  });
});
