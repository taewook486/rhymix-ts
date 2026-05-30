// SPEC-LAYOUT-001 Slice A — extra-vars.ts TDD 테스트
// REQ-LAYOUT-007: parseLayoutExtraVars Zod safeParse 검증

import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseLayoutExtraVars, layoutExtraVarsSchema } from './extra-vars';

describe('layoutExtraVarsSchema', () => {
  it('스키마가 정의되어 있어야 한다', () => {
    expect(layoutExtraVarsSchema).toBeDefined();
  });
});

describe('parseLayoutExtraVars', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // EV-1: 유효한 전체 입력 → 모든 필드 존재
  it('유효한 전체 입력을 파싱하면 모든 필드가 반환된다', () => {
    const input = {
      siteTitle: '테스트 사이트',
      logoImageUrl: 'https://example.com/logo.png',
      logoText: 'Logo',
      footerText: 'Footer content',
      layoutType: 'MAIN_PAGE',
    };

    const result = parseLayoutExtraVars(input);

    expect(result.siteTitle).toBe('테스트 사이트');
    expect(result.logoImageUrl).toBe('https://example.com/logo.png');
    expect(result.logoText).toBe('Logo');
    expect(result.footerText).toBe('Footer content');
    expect(result.layoutType).toBe('MAIN_PAGE');
  });

  // EV-2: 부분 입력 → 유효 필드 + 기본 layoutType
  it('부분 입력을 파싱하면 유효 필드만 반환되고 layoutType은 기본값을 갖는다', () => {
    const input = {
      siteTitle: '부분 테스트',
      footerText: 'Footer only',
    };

    const result = parseLayoutExtraVars(input);

    expect(result.siteTitle).toBe('부분 테스트');
    expect(result.footerText).toBe('Footer only');
    expect(result.logoImageUrl).toBeUndefined();
    expect(result.logoText).toBeUndefined();
    // 기본값 MAIN_PAGE 확인
    expect(result.layoutType).toBe('MAIN_PAGE');
  });

  // EV-3: 잘못된 layoutType → 드롭되고 MAIN_PAGE로 대체
  it('잘못된 layoutType은 무시되고 기본값 MAIN_PAGE가 적용된다', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const input = {
      siteTitle: '테스트',
      layoutType: 'INVALID_TYPE', // 유효하지 않은 값
    };

    const result = parseLayoutExtraVars(input);

    expect(result.layoutType).toBe('MAIN_PAGE');
    // console.warn이 호출되었는지 확인
    expect(warnSpy).toHaveBeenCalled();
  });

  // EV-4: null/undefined 입력 → 모든 선택 필드 없음, layoutType 기본값
  it('null 입력은 기본값으로 처리된다', () => {
    const result = parseLayoutExtraVars(null);

    expect(result.layoutType).toBe('MAIN_PAGE');
    expect(result.siteTitle).toBeUndefined();
    expect(result.logoImageUrl).toBeUndefined();
    expect(result.logoText).toBeUndefined();
    expect(result.footerText).toBeUndefined();
  });

  it('undefined 입력은 기본값으로 처리된다', () => {
    const result = parseLayoutExtraVars(undefined);

    expect(result.layoutType).toBe('MAIN_PAGE');
    expect(result.siteTitle).toBeUndefined();
  });

  // EV-5: SUB_PAGE 레이아웃 타입도 유효하게 파싱된다
  it('SUB_PAGE layoutType은 유효하게 파싱된다', () => {
    const input = {
      layoutType: 'SUB_PAGE',
    };

    const result = parseLayoutExtraVars(input);

    expect(result.layoutType).toBe('SUB_PAGE');
  });

  // EV-6: 알 수 없는 추가 필드는 무시된다
  it('스키마에 없는 필드는 결과에 포함되지 않는다', () => {
    const input = {
      siteTitle: '테스트',
      unknownField: '무시되어야 함',
      anotherUnknown: 12345,
    };

    const result = parseLayoutExtraVars(input);

    expect(result.siteTitle).toBe('테스트');
    expect((result as unknown as Record<string, unknown>)['unknownField']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['anotherUnknown']).toBeUndefined();
  });
});
