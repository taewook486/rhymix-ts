// @vitest-environment jsdom
/**
 * Specification tests for [mid]/write route auth guard — SPEC-BOARD-UI-001 REQ-BUI-008.
 *
 * W-901: 비로그인 사용자가 접근하면 /login?callbackUrl=/{mid}/write 로 리다이렉트된다 (AC-BUI-008).
 * W-902: 로그인 사용자는 정상적으로 글쓰기 폼이 렌더된다.
 *
 * @MX:SPEC: SPEC-BOARD-UI-001 REQ-BUI-008
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockAuth = vi.fn();
const mockGetModuleInstanceByMid = vi.fn();
const mockGetModuleDefinition = vi.fn();
const mockHeadersGet = vi.fn();

vi.mock('@/lib/auth/config', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

vi.mock('@rhymix-ts/core/modules', () => ({
  getModuleInstanceByMid: (...args: unknown[]) => mockGetModuleInstanceByMid(...args),
}));

vi.mock('@/lib/modules/registry', () => ({
  getModuleDefinition: (code: string) => mockGetModuleDefinition(code),
}));

vi.mock('@rhymix-ts/board/actions', () => ({
  handleCreateDocumentForm: vi.fn(),
}));

// SPEC-TAG-001: page.tsx imports TagInput from @rhymix-ts/board.
// @rhymix-ts/board 의 실제 모듈을 로드하면 @rhymix-ts/document → @rhymix-ts/tag → @rhymix-ts/db
// 트랜지티브 import 가 발생해 테스트 환경이 오염됨 (PrismaClient 인스턴스화 등).
// 이 테스트는 auth guard 가 대상이므로 TagInput 을 stub 처리.
vi.mock('@rhymix-ts/board', () => ({
  TagInput: () => null,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: (key: string) => mockHeadersGet(key),
  })),
}));

const mockRedirect = vi.fn((_url: string) => {
  throw new Error('NEXT_REDIRECT');
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

describe('[mid]/write page auth guard (SPEC-BOARD-UI-001 REQ-BUI-008)', () => {
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
    mockGetModuleInstanceByMid.mockResolvedValue(mockInstance);
    mockGetModuleDefinition.mockReturnValue({ code: 'board', routes: {} });
  });

  it('W-901: 비로그인 사용자는 /login?callbackUrl=/{mid}/write 로 리다이렉트된다 (AC-BUI-008)', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const { default: WritePage } = await import('./page');
    await expect(
      WritePage({ params: Promise.resolve({ mid: 'notice' }) }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/login?callbackUrl=/notice/write');
  });

  it('W-902: 로그인 사용자는 리다이렉트 없이 글쓰기 폼이 렌더된다', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 42, isAdmin: false } });

    const { default: WritePage } = await import('./page');
    const component = await WritePage({ params: Promise.resolve({ mid: 'notice' }) });
    render(component as React.ReactElement);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText('작성')).toBeDefined();
  });
});
