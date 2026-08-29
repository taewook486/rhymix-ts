/**
 * apps/web/app/(member)/documents/[id]/history/page.test.tsx
 *
 * 문서 수정 이력 페이지 회귀 테스트 — SPEC-DOCUMENT-001 Slice C.
 *
 * 이 테스트가 존재하는 이유: 이 페이지는 오랫동안 "구현 예정" 자리표시자였다.
 * 페이지 주석은 listDocumentHistory 가 없다고 적어 뒀지만, 실제 도메인 함수
 * 이름은 getUpdateHistory 였고 packages/document/src/history.ts 에 이미 있었다.
 *
 * 따라서 핵심 검증은 "페이지가 도메인 getUpdateHistory 를 실제로 호출하고
 * 그 결과를 렌더하는가" 이다. 자리표시자로 되돌아가면 mock 이 호출되지 않아
 * 이 테스트가 깨진다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type React from 'react';

const mockAuth = vi.fn();
const mockGetUpdateHistory = vi.fn();
const mockFindUnique = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error('NEXT_REDIRECT');
});
const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

class FakePermissionDenied extends Error {
  constructor(action: string) {
    super(`permission denied: ${action}`);
    this.name = 'BoardPermissionDeniedError';
  }
}

vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { document: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect, notFound: mockNotFound }));
vi.mock('@rhymix-ts/document', () => ({
  getUpdateHistory: mockGetUpdateHistory,
  BoardPermissionDeniedError: FakePermissionDenied,
}));

async function render(id: string): Promise<string> {
  const { default: Page } = await import('./page');
  const node = await Page({ params: Promise.resolve({ id }) });
  return renderToStaticMarkup(node as React.ReactElement);
}

describe('DocumentHistoryPage — 수정 이력 배선', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.mockResolvedValue({ user: { id: '1', isAdmin: true } });
    mockFindUnique.mockResolvedValue({ board: { moduleInstance: { mid: 'free' } } });
    mockGetUpdateHistory.mockResolvedValue([]);
  });

  it('도메인 getUpdateHistory 를 문서 ID 와 actor 로 호출한다', async () => {
    await render('2');

    expect(mockGetUpdateHistory).toHaveBeenCalledOnce();
    const arg = mockGetUpdateHistory.mock.calls[0]?.[0] as {
      documentId: number;
      actor: { userId: number; isAdmin: boolean };
    };
    expect(arg.documentId).toBe(2);
    expect(arg.actor.userId).toBe(1);
    expect(arg.actor.isAdmin).toBe(true);
  });

  it('이력이 없으면 안내 문구를 낸다', async () => {
    const html = await render('2');
    expect(html).toContain('수정 이력이 없습니다');
    expect(html).not.toContain('구현 예정');
  });

  it('이력이 있으면 제목과 편집자를 렌더한다', async () => {
    mockGetUpdateHistory.mockResolvedValue([
      {
        id: 11,
        documentId: 2,
        prevTitle: '이전 제목',
        prevContent: '0123456789',
        editorId: 1,
        editorIp: null,
        regdate: new Date('2026-08-29T06:07:00.000Z'),
      },
    ]);

    const html = await render('2');
    expect(html).toContain('이전 제목');
    expect(html).toContain('10자');
    expect(html).toContain('편집자 #1');
    // 문서로 돌아가는 링크는 실재하는 /{mid}/{id} 를 가리켜야 한다
    expect(html).toContain('href="/free/2"');
  });

  it('권한이 없으면 안내로 바꾸고 예외를 새어 나가게 하지 않는다', async () => {
    mockGetUpdateHistory.mockRejectedValue(new FakePermissionDenied('update_view'));

    const html = await render('2');
    expect(html).toContain('권한이 없습니다');
  });

  it('비로그인이면 callbackUrl 을 붙여 로그인으로 보낸다', async () => {
    mockAuth.mockResolvedValue(null);

    await expect(render('2')).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/login?callbackUrl=/documents/2/history');
  });

  it('id 가 숫자가 아니면 404 로 보낸다', async () => {
    await expect(render('abc')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockGetUpdateHistory).not.toHaveBeenCalled();
  });
});
