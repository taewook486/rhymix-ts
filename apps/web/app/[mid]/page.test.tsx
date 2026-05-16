// @vitest-environment jsdom
/**
 * Specification tests for [mid] dynamic route — SPEC-ADMIN-001 Slice B.
 *
 * B-5: getModuleInstanceByMid 가 instance 반환 → 렌더에 instance.name, moduleCode, mid 포함.
 * B-6: getModuleInstanceByMid 가 null 반환 → notFound() 호출됨.
 *
 * @MX:NOTE: [AUTO] 모든 모듈 인스턴스 페이지의 진입점 — Slice C 에서 def.routes.index() 로 교체 예정.
 * @MX:TODO: [AUTO] Slice C 에서 def.routes.index(props) 위임으로 교체.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetModuleInstanceByMid = vi.fn();

vi.mock('@rhymix-ts/core/modules', () => ({
  getModuleInstanceByMid: (...args: unknown[]) => mockGetModuleInstanceByMid(...args),
}));

const mockHeadersGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: (key: string) => mockHeadersGet(key),
  })),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    domain: { findFirst: vi.fn() },
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('[mid] page (Slice B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: x-site-id = '1'
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-site-id') return '1';
      return null;
    });
  });

  it('B-5: getModuleInstanceByMid 가 instance 반환 → 렌더에 name/moduleCode/mid 텍스트 포함 (REQ-ADMIN-012)', async () => {
    const instance = {
      id: 1,
      siteId: 1,
      moduleCode: 'board',
      mid: 'notice',
      name: 'Notice',
      config: null,
    };
    mockGetModuleInstanceByMid.mockResolvedValueOnce(instance);

    const { default: MidPage } = await import('./page');
    const component = await MidPage({ params: Promise.resolve({ mid: 'notice' }) });
    render(component as React.ReactElement);

    expect(screen.getByText('Notice')).toBeDefined();
    expect(screen.getByText(/module=board/)).toBeDefined();
    expect(screen.getByText(/mid=notice/)).toBeDefined();
  });

  it('B-6: getModuleInstanceByMid 가 null 반환 → notFound() 호출됨 (REQ-ADMIN-012)', async () => {
    mockGetModuleInstanceByMid.mockResolvedValueOnce(null);

    const { default: MidPage } = await import('./page');

    await expect(
      MidPage({ params: Promise.resolve({ mid: 'missing' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
