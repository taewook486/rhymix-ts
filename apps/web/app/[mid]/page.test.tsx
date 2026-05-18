// @vitest-environment jsdom
/**
 * Specification tests for [mid] dynamic route — SPEC-CONTENT-001 Slice B (T-005).
 *
 * B-901: getModuleDefinition + def.routes.index 위임 확인.
 * B-902: instance 없으면 notFound() 호출.
 * B-903: def 없으면 notFound() 호출.
 *
 * @MX:NOTE: [AUTO] Slice B 에서 def.routes.index() 위임으로 교체됨 (T-005).
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetModuleInstanceByMid = vi.fn();
const mockGetModuleDefinition = vi.fn();

vi.mock('@rhymix-ts/core/modules', () => ({
  getModuleInstanceByMid: (...args: unknown[]) => mockGetModuleInstanceByMid(...args),
}));

vi.mock('@/lib/modules/registry', () => ({
  getModuleDefinition: (code: string) => mockGetModuleDefinition(code),
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
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('[mid] page (Slice B — module delegation)', () => {
  const mockInstance = {
    id: 1,
    siteId: 1,
    moduleCode: 'board',
    mid: 'notice',
    name: 'Notice',
    config: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-site-id') return '1';
      return null;
    });
  });

  it('B-901: def.routes.index 가 존재할 때 위임 결과를 렌더한다 (REQ-CONTENT-001)', async () => {
    mockGetModuleInstanceByMid.mockResolvedValueOnce(mockInstance);
    mockGetModuleDefinition.mockReturnValueOnce({
      code: 'board',
      routes: {
        index: async () => <p data-testid="board-index">board-index-output</p>,
      },
    });

    const { default: MidPage } = await import('./page');
    const component = await MidPage({
      params: Promise.resolve({ mid: 'notice' }),
      searchParams: Promise.resolve({}),
    });
    render(component as React.ReactElement);

    expect(screen.getByTestId('board-index')).toBeDefined();
  });

  it('B-902: getModuleInstanceByMid 가 null 반환 → notFound() 호출됨 (REQ-CONTENT-001)', async () => {
    mockGetModuleInstanceByMid.mockResolvedValueOnce(null);

    const { default: MidPage } = await import('./page');
    await expect(
      MidPage({
        params: Promise.resolve({ mid: 'missing' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('B-903: getModuleDefinition 이 undefined 반환 → notFound() 호출됨', async () => {
    mockGetModuleInstanceByMid.mockResolvedValueOnce(mockInstance);
    mockGetModuleDefinition.mockReturnValueOnce(undefined);

    const { default: MidPage } = await import('./page');
    await expect(
      MidPage({
        params: Promise.resolve({ mid: 'notice' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
