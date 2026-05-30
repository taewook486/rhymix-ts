// SPEC-LAYOUT-001 Slice A — resolver-with-db.ts TDD 테스트
// REQ-LAYOUT-011: resolveLayoutFromInstance 우선순위 체인 검증

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveLayoutFromInstance } from './resolver-with-db';
import type { ResolveResult } from './types';

// 가상 Layout 행
const mockLayoutConfig = {
  id: 'clayout001',
  themeId: 'ctheme001',
  name: 'default',
  title: 'Default Layout',
  layoutPath: 'themes/default/layouts/default',
  layoutType: 'DESKTOP' as const,
  siteSrl: null,
  extraVars: null,
};

/** 기본 목 Prisma 팩토리 */
function createMockPrisma({
  layoutById = null as typeof mockLayoutConfig | null,
  layoutByAssignment = null as typeof mockLayoutConfig | null,
} = {}) {
  return {
    layout: {
      findUnique: vi.fn().mockResolvedValue(layoutById),
      findFirst: vi.fn().mockResolvedValue(layoutByAssignment),
    },
    themeAssignment: {
      findFirst: vi.fn().mockResolvedValue(
        layoutByAssignment
          ? {
              id: 'cassign001',
              themeId: 'ctheme001',
              scope: 'SITE',
              refType: 'site',
              refId: '1',
              layoutName: 'default',
              mobileLayoutName: null,
              mlayoutMode: 'RESPONSIVE',
              skinName: null,
              tokensOverride: null,
            }
          : null,
      ),
    },
  };
}

/** 기본 컨텍스트 */
const defaultCtx = {
  site: { id: 1, title: '테스트 사이트' },
  domain: { id: 1, hostname: 'example.com', defaultLayoutId: null as string | null },
};

describe('resolveLayoutFromInstance', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // RES-1: instance.layoutId가 있고 레이아웃이 존재 → module_instance source
  it('instance.layoutId가 있으면 module_instance 소스로 반환한다', async () => {
    const mockPrisma = createMockPrisma({ layoutById: mockLayoutConfig });

    const instance = { layoutId: 'clayout001', mobileLayoutId: null };
    const result = await resolveLayoutFromInstance(instance, mockPrisma as never, defaultCtx);

    expect(result.type).toBe('component');
    if (result.type === 'component') {
      expect(result.source).toBe('module_instance');
      expect(result.config.id).toBe('clayout001');
    }
  });

  // RES-2: instance.layoutId가 없지만 domain.defaultLayoutId가 있음 → domain source
  it('domain.defaultLayoutId가 있으면 domain 소스로 반환한다', async () => {
    const mockPrisma = createMockPrisma({ layoutById: mockLayoutConfig });

    const instance = { layoutId: null, mobileLayoutId: null };
    const ctx = {
      ...defaultCtx,
      domain: { ...defaultCtx.domain, defaultLayoutId: 'clayout001' },
    };

    const result = await resolveLayoutFromInstance(instance, mockPrisma as never, ctx);

    expect(result.type).toBe('component');
    if (result.type === 'component') {
      expect(result.source).toBe('domain');
    }
  });

  // RES-3: instance와 domain 모두 없지만 ThemeAssignment(SITE) 존재 → site source
  it('ThemeAssignment(SITE)가 있으면 site 소스로 반환한다', async () => {
    const mockPrisma = createMockPrisma({ layoutByAssignment: mockLayoutConfig });

    const instance = { layoutId: null, mobileLayoutId: null };
    const result = await resolveLayoutFromInstance(instance, mockPrisma as never, defaultCtx);

    expect(result.type).toBe('component');
    if (result.type === 'component') {
      expect(result.source).toBe('site');
    }
  });

  // RES-4: 모든 소스가 없을 때 fallback 반환 + console.warn 출력
  it('해석 불가 시 fallback을 반환하고 경고를 출력한다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockPrisma = createMockPrisma(); // 모두 null

    const instance = { layoutId: null, mobileLayoutId: null };
    const result = await resolveLayoutFromInstance(instance, mockPrisma as never, defaultCtx);

    expect(result.type).toBe('fallback');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Layout]'),
    );
  });

  // RES-5: instance.layoutId가 있지만 DB에 존재하지 않음 → 다음 우선순위로 넘어감
  it('instance.layoutId가 있지만 DB 조회 결과가 null이면 다음 우선순위를 시도한다', async () => {
    // layoutById는 null, ThemeAssignment는 없음 → fallback
    const mockPrisma = createMockPrisma({ layoutById: null });

    const instance = { layoutId: 'nonexistent', mobileLayoutId: null };
    const result = await resolveLayoutFromInstance(instance, mockPrisma as never, defaultCtx);

    // DB에서 못 찾으면 다음 단계로 넘어가므로 fallback
    expect(result.type).toBe('fallback');
  });

  // RES-6: module_instance가 domain보다 우선한다
  it('instance.layoutId는 domain.defaultLayoutId보다 우선순위가 높다', async () => {
    const instanceLayout = { ...mockLayoutConfig, id: 'instance-layout', name: 'instance-layout' };
    const mockPrisma = {
      layout: {
        findUnique: vi.fn().mockResolvedValue(instanceLayout),
        findFirst: vi.fn(),
      },
      themeAssignment: {
        findFirst: vi.fn(),
      },
    };

    const instance = { layoutId: 'instance-layout', mobileLayoutId: null };
    const ctx = {
      ...defaultCtx,
      domain: { ...defaultCtx.domain, defaultLayoutId: 'domain-layout' },
    };

    const result = await resolveLayoutFromInstance(instance, mockPrisma as never, ctx);

    expect(result.type).toBe('component');
    if (result.type === 'component') {
      expect(result.source).toBe('module_instance');
      expect(result.config.id).toBe('instance-layout');
    }
    // domain 조회는 수행되지 않아야 함
    expect(mockPrisma.layout.findFirst).not.toHaveBeenCalled();
  });
});

// 타입 검증: ResolveResult 판별 유니온이 올바른 구조인지 확인
describe('ResolveResult 타입', () => {
  it('타입 가드가 올바르게 동작한다', () => {
    const fallback: ResolveResult = { type: 'fallback' };
    const component: ResolveResult = {
      type: 'component',
      config: mockLayoutConfig,
      source: 'site',
    };

    expect(fallback.type).toBe('fallback');
    expect(component.type).toBe('component');
  });
});
