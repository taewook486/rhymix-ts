/**
 * routes/edit-page.test.tsx — D-4 규칙 6: 삭제된 글은 수정 화면에서 notFound.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

const DOC = {
  id: 42,
  title: '수정할 글',
  content: '본문',
  status: 'PUBLIC',
  authorId: 7,
  boardId: 1,
  deletedAt: null as Date | null,
};

describe('BoardEditPage — 접근 규칙 (D-4)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function render(doc: Record<string, unknown>, session: { user: { id: number; isAdmin: boolean } } | null) {
    vi.doMock('next/navigation', () => ({
      notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
      },
    }));
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue({ ...DOC, ...doc }),
    }));
    const { BoardEditPage } = await import('./edit-page.js');
    const node = await BoardEditPage({
      instance: { id: 1, moduleCode: 'board', mid: 'free', name: '자유게시판', config: null },
      params: { mid: 'free', id: '42' },
      searchParams: {},
      prisma: createMockPrismaClient(),
      documentId: 42,
      session,
      updateAction: async () => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return renderToStaticMarkup(node as React.ReactElement);
  }

  it('D4-6a: 삭제된 글은 작성자·관리자에게도 notFound', async () => {
    const deleted = { deletedAt: new Date('2026-01-02') };
    await expect(render(deleted, { user: { id: 7, isAdmin: false } })).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render(deleted, { user: { id: 1, isAdmin: true } })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('D4-6b: 작성자는 수정 폼이 보인다 (기존 동작 유지)', async () => {
    const html = await render({}, { user: { id: 7, isAdmin: false } });
    expect(html).toContain('글수정');
    expect(html).toContain('수정할 글');
  });

  it('D4-6c: 작성자가 아니면 "수정 권한이 없습니다" (기존 가드 유지)', async () => {
    const html = await render({}, { user: { id: 99, isAdmin: false } });
    expect(html).toContain('수정 권한이 없습니다');
  });
});
