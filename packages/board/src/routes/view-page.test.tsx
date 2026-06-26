/**
 * routes/view-page.test.tsx — SPEC-CONTENT-001 (View Page)
 *
 * VP-1 ~ VP-7: BoardViewPage 렌더링 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

/** 공통 픽스처 — getDocument 반환값 */
const FIXED_DOC = {
  id: 42,
  title: '테스트 문서 제목',
  content: '<p>안전한 HTML 콘텐츠</p>',
  regdate: new Date('2024-01-15T09:00:00Z'),
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T09:00:00Z'),
  commentCount: 3,
  tags: ['react', 'typescript'],
  status: 'PUBLIC',
  authorId: 7,
  boardId: 1,
  deletedAt: null,
  author: { id: 7, userId: 'hong', nickName: '홍길동' },
};

/** 공통 fakeProps 생성 헬퍼 */
function makeFakeProps(overrides: {
  documentId?: number;
  session?: { user: { id: number; isAdmin: boolean } } | null;
}) {
  return {
    instance: { id: 1, moduleCode: 'board', mid: 'free', name: '자유게시판', config: null },
    params: { mid: 'free' },
    searchParams: {},
    prisma: createMockPrismaClient(),
    documentId: overrides.documentId ?? 42,
    session: overrides.session !== undefined ? overrides.session : null,
  };
}

describe('BoardViewPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('VP-1: 문서 제목이 <h1>에 렌더됨', async () => {
    // Mock at the actual package level
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('<h1');
    expect(html).toContain('테스트 문서 제목');
  });

  it('VP-2: 문서 content가 dangerouslySetInnerHTML로 렌더됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 이미 sanitize된 HTML이 그대로 출력되어야 함
    expect(html).toContain('안전한 HTML 콘텐츠');
  });

  it('VP-3: 태그가 /<mid>?tag=<tagname> 링크로 렌더됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('/free?tag=react');
    expect(html).toContain('/free?tag=typescript');
  });

  it('VP-4: 글 목록으로 돌아가는 back 링크가 /<mid>임', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).toContain('href="/free"');
    expect(html).toContain('글 목록');
  });

  it('VP-5: session.user.id === document.authorId 이면 수정 링크가 표시됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    const props = makeFakeProps({ session: { user: { id: 7, isAdmin: false } } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(props as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 수정 링크: /<mid>/write?id=<documentId>
    expect(html).toContain('/free/write?id=42');
    expect(html).toContain('수정');
  });

  it('VP-6: session이 null이면 수정 링크가 표시되지 않음', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    const props = makeFakeProps({ session: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(props as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    expect(html).not.toContain('/free/write?id=42');
  });

  it('VP-7: 댓글 수가 페이지 어딘가에 표시됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const mockPrisma = createMockPrismaClient();

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // FIXED_DOC.commentCount = 3
    expect(html).toContain('3');
  });
});
