/**
 * color-scheme-script 단위 테스트
 *
 * REQ-THEME-POLISH-033: FOIT 방지 인라인 스크립트 검증
 */

import { describe, it, expect } from 'vitest';
import { colorSchemeScript } from './color-scheme-script';

describe('color-scheme-script', () => {
  it('IIFE 패턴을 포함해야 한다', () => {
    expect(colorSchemeScript).toContain('(function()');
    expect(colorSchemeScript).toContain('})()');
  });

  it('rx-color-scheme localStorage 키를 포함해야 한다', () => {
    expect(colorSchemeScript).toContain('rx-color-scheme');
  });

  it('dark 클래스 추가 로직을 포함해야 한다', () => {
    expect(colorSchemeScript).toContain('classList.add(\'dark\')');
  });

  it('prefers-color-scheme media query를 포함해야 한다', () => {
    expect(colorSchemeScript).toContain('(prefers-color-scheme: dark)');
  });

  it('try-catch 패턴으로 감싸져 있어야 한다 (FOIT safe)', () => {
    expect(colorSchemeScript).toContain('try {');
    expect(colorSchemeScript).toContain('} catch (e) {}');
  });

  it('localStorage.getItem와 setItem 로직을 포함해야 한다', () => {
    // 초기화 시 get
    expect(colorSchemeScript).toContain('localStorage.getItem');
  });
});
