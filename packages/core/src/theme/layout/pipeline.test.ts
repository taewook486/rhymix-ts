// SPEC-LAYOUT-001 Slice B — pipeline.ts TDD 테스트
// REQ-LAYOUT-011, REQ-LAYOUT-012: renderModuleWithLayout 렌더 파이프라인

import { describe, it, expect, vi, afterEach } from 'vitest';

// 모듈 레벨 mock: resolver-with-db와 registry를 mock한다
vi.mock('./resolver-with-db', () => ({
  resolveLayoutFromInstance: vi.fn(),
}));

vi.mock('./registry', () => ({
  registerLayout: vi.fn(),
  getLayout: vi.fn(),
}));

vi.mock('./extra-vars', () => ({
  parseLayoutExtraVars: vi.fn().mockReturnValue({ layoutType: 'MAIN_PAGE' }),
}));

vi.mock('./context', () => ({
  LayoutProvider: vi.fn(),
}));

import { resolveLayoutFromInstance } from './resolver-with-db';
import { getLayout } from './registry';
import { renderModuleWithLayout } from './pipeline';
import type { LayoutConfig } from './types';

/** 테스트용 기본 LayoutConfig */
const mockLayoutConfig: LayoutConfig = {
  id: 'clayout001',
  themeId: 'ctheme001',
  name: 'default',
  title: 'Default Layout',
  layoutPath: 'themes/default/layouts/default',
  layoutType: 'DESKTOP',
  siteSrl: null,
  extraVars: { layoutType: 'MAIN_PAGE' },
};

/** 가상 Prisma 클라이언트 */
const mockPrisma = {
  site: {
    findFirst: vi.fn().mockResolvedValue({ id: 1, title: '테스트 사이트' }),
  },
  domain: {
    findFirst: vi.fn().mockResolvedValue({
      id: 1,
      hostname: 'example.com',
      defaultLayoutId: null,
    }),
  },
} as never;

/** 가상 ReadonlyHeaders (x-domain-id 없음) */
const mockHeaders = {
  get: vi.fn().mockReturnValue(null),
} as never;

/** 가상 ModuleInstance */
const mockInstance = {
  layoutId: null,
  mobileLayoutId: null,
};

describe('renderModuleWithLayout', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // PIPE-1: fallback → moduleOutput을 그대로 반환 + console.warn
  it('fallback 결과 시 moduleOutput을 그대로 반환하고 경고를 출력해야 한다', async () => {
    vi.mocked(resolveLayoutFromInstance).mockResolvedValue({ type: 'fallback' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // moduleOutput은 임의의 ReactNode (문자열도 유효)
    const moduleOutput = 'Module Content' as unknown as import('react').ReactNode;

    const result = await renderModuleWithLayout({
      instance: mockInstance,
      moduleOutput,
      prisma: mockPrisma,
      request: mockHeaders,
    });

    expect(result).toBe(moduleOutput);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Layout]'),
    );
  });

  // PIPE-2: 레지스트리에 없는 레이아웃 → moduleOutput 반환 + console.error
  it('레지스트리에 없는 레이아웃이면 moduleOutput을 반환하고 에러를 출력해야 한다', async () => {
    vi.mocked(resolveLayoutFromInstance).mockResolvedValue({
      type: 'component',
      config: mockLayoutConfig,
      source: 'site',
    });
    vi.mocked(getLayout).mockReturnValue(null);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const moduleOutput = 'Module Content' as unknown as import('react').ReactNode;

    const result = await renderModuleWithLayout({
      instance: mockInstance,
      moduleOutput,
      prisma: mockPrisma,
      request: mockHeaders,
    });

    expect(result).toBe(moduleOutput);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Layout]'),
    );
  });

  // PIPE-3: 등록된 레이아웃 → WrappedNode가 반환 (object 타입)
  it('등록된 레이아웃이면 ReactNode 형태의 결과를 반환해야 한다', async () => {
    vi.mocked(resolveLayoutFromInstance).mockResolvedValue({
      type: 'component',
      config: mockLayoutConfig,
      source: 'site',
    });
    // 가상 컴포넌트 함수 반환
    const MockComponent = vi.fn();
    vi.mocked(getLayout).mockReturnValue(MockComponent as never);

    const moduleOutput = 'Page Content' as unknown as import('react').ReactNode;

    const result = await renderModuleWithLayout({
      instance: mockInstance,
      moduleOutput,
      prisma: mockPrisma,
      request: mockHeaders,
    });

    // fallback이 아닌 경우 result는 moduleOutput과 다른 wrapped element여야 한다
    expect(result).not.toBe(moduleOutput);
    // result는 object 형태 (React element)
    expect(typeof result).toBe('object');
  });

  // PIPE-4: 통합 — mocked instance + mocked prisma + registered stub → JSX 반환
  it('통합 시나리오: instance + prisma + 등록된 컴포넌트로 wrapped result를 반환해야 한다', async () => {
    const instanceWithLayout = { layoutId: 'clayout001', mobileLayoutId: null };
    vi.mocked(resolveLayoutFromInstance).mockResolvedValue({
      type: 'component',
      config: { ...mockLayoutConfig, id: 'clayout001' },
      source: 'module_instance',
    });
    const MockComponent = vi.fn();
    vi.mocked(getLayout).mockReturnValue(MockComponent as never);

    const moduleOutput = 'Page Content' as unknown as import('react').ReactNode;

    const result = await renderModuleWithLayout({
      instance: instanceWithLayout,
      moduleOutput,
      prisma: mockPrisma,
      request: mockHeaders,
    });

    expect(result).toBeDefined();
    expect(result).not.toBe(moduleOutput);
  });

  // PIPE-5: 테마 미설치 시 fallback → 크래시 없이 moduleOutput 반환
  it('테마가 설치되지 않아 fallback이 반환되어도 크래시 없이 moduleOutput을 반환해야 한다', async () => {
    vi.mocked(resolveLayoutFromInstance).mockResolvedValue({ type: 'fallback' });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const moduleOutput = 'Fallback Content' as unknown as import('react').ReactNode;

    await expect(
      renderModuleWithLayout({
        instance: mockInstance,
        moduleOutput,
        prisma: mockPrisma,
        request: mockHeaders,
      }),
    ).resolves.toBe(moduleOutput);
  });
});
