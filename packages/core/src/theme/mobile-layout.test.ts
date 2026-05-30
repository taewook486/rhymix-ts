// @deprecated SPEC-LAYOUT-001: mobile-layout.ts 폐기됨. 테스트는 참조용으로만 유지.
import { describe, it, expect } from 'vitest';
import { resolveMobileLayout } from './mobile-layout';

describe('resolveMobileLayout', () => {
  // ML-1: mlayoutSrl=-2 → type='responsive'
  it('ML-1: mlayoutSrl=-2이면 type=responsive 반환', () => {
    const result = resolveMobileLayout({ mlayoutSrl: -2 });
    expect(result.type).toBe('responsive');
    expect(result.source).toBe('mlayout_responsive');
  });

  // ML-2: mlayoutSrl=-1 → type='site_default'
  it('ML-2: mlayoutSrl=-1이면 type=site_default 반환', () => {
    const result = resolveMobileLayout({ mlayoutSrl: -1 });
    expect(result.type).toBe('site_default');
    expect(result.source).toBe('mlayout_site_default');
  });

  // ML-3: mlayoutSrl=5 → type='specific', layoutId=5
  it('ML-3: mlayoutSrl=5이면 type=specific, layoutId=5 반환', () => {
    const result = resolveMobileLayout({ mlayoutSrl: 5 });
    expect(result.type).toBe('specific');
    if (result.type === 'specific') {
      expect(result.layoutId).toBe(5);
    }
    expect(result.source).toBe('mlayout_specific');
  });

  // ML-4: mlayoutSrl=null → type='fallback'
  it('ML-4: mlayoutSrl=null이면 type=fallback 반환', () => {
    const result = resolveMobileLayout({ mlayoutSrl: null });
    expect(result.type).toBe('fallback');
    expect(result.source).toBe('mlayout_fallback');
  });

  // ML-5: mlayoutSrl=undefined → type='fallback'
  it('ML-5: mlayoutSrl=undefined이면 type=fallback 반환', () => {
    const result = resolveMobileLayout({ mlayoutSrl: undefined });
    expect(result.type).toBe('fallback');
    expect(result.source).toBe('mlayout_fallback');
  });

  // ML-6: mlayoutSrl=1 → type='specific', layoutId=1
  it('ML-6: mlayoutSrl=1이면 type=specific, layoutId=1 반환', () => {
    const result = resolveMobileLayout({ mlayoutSrl: 1 });
    expect(result.type).toBe('specific');
    if (result.type === 'specific') {
      expect(result.layoutId).toBe(1);
    }
    expect(result.source).toBe('mlayout_specific');
  });
});
