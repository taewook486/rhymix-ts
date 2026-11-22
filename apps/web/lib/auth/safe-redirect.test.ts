/**
 * safeInternalPath — 오픈 리다이렉트 방어 (RVE-2026-25·29·47 계열, D-2).
 */
import { describe, expect, it } from 'vitest';

import { safeInternalPath } from './safe-redirect';

describe('safeInternalPath', () => {
  const rejected: Array<[string, string]> = [
    ['프로토콜 상대(//)', '//evil.com'],
    ['역슬래시', '/\\evil.com'],
    ['슬래시 하나짜리 절대 URL', 'https:/evil.com'],
    ['절대 URL', 'https://evil.com'],
    ['앞 공백 + javascript:', ' javascript:x'],
    ['탭이 낀 javascript:', 'java\tscript:x'],
    ['인코딩된 슬래시', '/%2F/evil.com'],
    ['소문자 인코딩 슬래시', '/%2f/evil.com'],
    ['이중 인코딩 슬래시', '/%252F/evil.com'],
    ['탭으로 끊은 //', '/\t/evil.com'],
    ['개행으로 끊은 //', '/\n/evil.com'],
    ['인코딩된 역슬래시', '/%5Cevil.com'],
    ['빈 문자열', ''],
    ['상대 경로(슬래시 없음)', 'free'],
  ];

  it.each(rejected)('거부: %s → 기본값', (_label, input) => {
    expect(safeInternalPath(input)).toBe('/');
  });

  it('거부 시 호출자가 지정한 fallback 을 돌려준다', () => {
    expect(safeInternalPath('//evil.com', '/admin')).toBe('/admin');
  });

  it('null / undefined 는 fallback', () => {
    expect(safeInternalPath(null)).toBe('/');
    expect(safeInternalPath(undefined, '/admin')).toBe('/admin');
  });

  const accepted = ['/', '/free', '/free?page=2', '/admin/members?x=1#top', '/search?q=a%2Fb'];

  it.each(accepted)('통과: %s', (input) => {
    expect(safeInternalPath(input)).toBe(input);
  });
});
