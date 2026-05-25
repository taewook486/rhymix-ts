import { describe, it, expect } from 'vitest';
import {
  createPreviewState,
  parsePreviewCookie,
  serializePreviewCookie,
  isPreviewValid,
  PREVIEW_TTL_MS,
} from './preview';

describe('createPreviewState', () => {
  // PV-1: createPreviewState returns active=true, correct themeName, expiresAt in future
  it('PV-1: active=true, 올바른 themeName, expiresAt이 미래 시점인 상태를 반환한다', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const state = createPreviewState('my-theme', now);

    expect(state.active).toBe(true);
    expect(state.themeName).toBe('my-theme');
    expect(state.expiresAt).toBeInstanceOf(Date);
    expect(state.expiresAt!.getTime()).toBe(now.getTime() + PREVIEW_TTL_MS);
  });
});

describe('parsePreviewCookie', () => {
  // PV-2: parsePreviewCookie with valid serialized value → returns active=true
  it('PV-2: 유효한 직렬화 값으로 파싱하면 active=true를 반환한다', () => {
    const now = new Date('2024-06-01T00:00:00.000Z');
    const serialized = serializePreviewCookie('dark-theme', now);
    const state = parsePreviewCookie(serialized);

    expect(state.active).toBe(true);
    expect(state.themeName).toBe('dark-theme');
  });

  // PV-3: parsePreviewCookie with undefined → returns { active: false }
  it('PV-3: undefined 입력 → { active: false } 반환', () => {
    const state = parsePreviewCookie(undefined);
    expect(state).toEqual({ active: false });
  });

  // PV-4: parsePreviewCookie with malformed string → returns { active: false }
  it('PV-4: 잘못된 형식 문자열 → { active: false } 반환', () => {
    const state = parsePreviewCookie('not-valid-base64!!!');
    expect(state).toEqual({ active: false });
  });
});

describe('isPreviewValid', () => {
  // PV-5: isPreviewValid with future expiresAt → true
  it('PV-5: expiresAt이 미래이면 true 반환', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const future = new Date(now.getTime() + 1000);
    const valid = isPreviewValid({ active: true, themeName: 'test', expiresAt: future }, now);
    expect(valid).toBe(true);
  });

  // PV-6: isPreviewValid with past expiresAt → false
  it('PV-6: expiresAt이 과거이면 false 반환', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const past = new Date(now.getTime() - 1000);
    const valid = isPreviewValid({ active: true, themeName: 'test', expiresAt: past }, now);
    expect(valid).toBe(false);
  });

  // PV-7: isPreviewValid with active=false → false regardless of expiresAt
  it('PV-7: active=false이면 expiresAt에 관계없이 false 반환', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const future = new Date(now.getTime() + 10000);
    const valid = isPreviewValid({ active: false, themeName: 'test', expiresAt: future }, now);
    expect(valid).toBe(false);
  });
});

describe('serializePreviewCookie / parsePreviewCookie roundtrip', () => {
  // PV-8: serializePreviewCookie + parsePreviewCookie roundtrip preserves themeName
  it('PV-8: 직렬화 후 파싱하면 themeName이 보존된다', () => {
    const now = new Date('2024-03-15T12:00:00.000Z');
    const serialized = serializePreviewCookie('roundtrip-theme', now);
    const state = parsePreviewCookie(serialized);

    expect(state.active).toBe(true);
    expect(state.themeName).toBe('roundtrip-theme');
    expect(state.expiresAt).toBeInstanceOf(Date);
    expect(state.expiresAt!.getTime()).toBe(now.getTime() + PREVIEW_TTL_MS);
  });
});
