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
  // SPEC-BOARD-UI-001: 조회수/추천수 필드
  readedCount: 123,
  votedCount: 5,
  blamedCount: 0,
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
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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

  it('VP-8: 첨부파일이 다운로드 목록으로 렌더됨 (SPEC-EDITOR-001 AC-EDITOR-006)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([
        {
          id: 101,
          sourceFilename: '보고서.pdf',
          fileSize: 2048n,
          mimeType: 'application/pdf',
          storageKey: '2024/01/abc',
          downloadCount: 0,
        },
        {
          id: 102,
          sourceFilename: 'image.png',
          fileSize: 5120n,
          mimeType: 'image/png',
          storageKey: '2024/01/def',
          downloadCount: 0,
        },
      ]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 파일명이 표시되어야 함
    expect(html).toContain('보고서.pdf');
    expect(html).toContain('image.png');
    // 다운로드 링크: /api/files/<id>/download
    expect(html).toContain('/api/files/101/download');
    expect(html).toContain('/api/files/102/download');
  });

  it('VP-7: 댓글 수가 페이지 어딘가에 표시됨', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
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

  // ---------------------------------------------------------------------------
  // SPEC-BOARD-UI-001: Secret post access gate (REQ-BUI-006)
  // ---------------------------------------------------------------------------

  it('VP-9: status=SECRET 문서는 작성자가 아닌 비로그인 사용자에게 "비밀글입니다" 메시지 표시 (REQ-BUI-006)', async () => {
    const secretDoc = { ...FIXED_DOC, status: 'SECRET' as const };
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(secretDoc),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({ session: null }) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // "비밀글입니다" 메시지가 표시되어야 함
    expect(html).toContain('비밀글입니다');
    // 제목, 본문, 첨부파일, 댓글은 표시되지 않아야 함
    expect(html).not.toContain('테스트 문서 제목');
    expect(html).not.toContain('안전한 HTML 콘텐츠');
    expect(html).not.toContain('댓글');
  });

  it('VP-10: status=SECRET 문서는 작성자에게 내용이 정상 표시됨 (REQ-BUI-006)', async () => {
    const secretDoc = { ...FIXED_DOC, status: 'SECRET' as const };
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(secretDoc),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(
      makeFakeProps({ session: { user: { id: 7, isAdmin: false } } }) as any,
    );
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 작성자(session.user.id === doc.authorId)는 내용을 볼 수 있어야 함
    expect(html).toContain('테스트 문서 제목');
    expect(html).toContain('안전한 HTML 콘텐츠');
    expect(html).not.toContain('비밀글입니다');
  });

  it('VP-11: status=SECRET 문서는 관리자에게 내용이 정상 표시됨 (REQ-BUI-006)', async () => {
    const secretDoc = { ...FIXED_DOC, status: 'SECRET' as const };
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(secretDoc),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(
      makeFakeProps({ session: { user: { id: 999, isAdmin: true } } }) as any,
    );
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 관리자는 내용을 볼 수 있어야 함
    expect(html).toContain('테스트 문서 제목');
    expect(html).toContain('안전한 HTML 콘텐츠');
    expect(html).not.toContain('비밀글입니다');
  });

  // ---------------------------------------------------------------------------
  // SPEC-BOARD-UI-001: View/Vote counts display (REQ-BUI-007)
  // ---------------------------------------------------------------------------

  it('VP-12: 조회수와 추천수가 메타 라인에 표시됨 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // FIXED_DOC.readedCount = 123, FIXED_DOC.votedCount = 5
    expect(html).toContain('123');
    expect(html).toContain('5');
    expect(html).toContain('조회수');
    expect(html).toContain('추천수');
  });

  // ---------------------------------------------------------------------------
  // SPEC-BOARD-UI-001: Vote buttons (REQ-BUI-007)
  // ---------------------------------------------------------------------------

  it('VP-13: 비로그인 사용자에게는 추천/비추천 버튼이 표시되지 않음 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({ session: null }) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 추천/비추천 버튼이 표시되지 않아야 함
    // "비추천"은 버튼에만 표시되는 고유한 텍스트
    expect(html).not.toContain('비추천');
  });

  it('VP-14: 로그인 사용자에게는 추천/비추천 버튼이 표시됨 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(
      makeFakeProps({ session: { user: { id: 1, isAdmin: false } } }) as any,
    );
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 추천/비추천 버튼이 표시되어야 함
    expect(html).toContain('추천');
    expect(html).toContain('비추천');
  });

  // ---------------------------------------------------------------------------
  // SPEC-BOARD-UI-001: Delete button (REQ-BUI-007)
  // ---------------------------------------------------------------------------

  it('VP-15: canEdit=true인 경우 삭제 버튼이 표시됨 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // 작성자 본인 (canEdit = true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(
      makeFakeProps({ session: { user: { id: 7, isAdmin: false } } }) as any,
    );
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 삭제 버튼이 표시되어야 함
    expect(html).toContain('삭제');
  });

  it('VP-16: canEdit=false인 경우 삭제 버튼이 표시되지 않음 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // 다른 사용자 (canEdit = false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(
      makeFakeProps({ session: { user: { id: 999, isAdmin: false } } }) as any,
    );
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 삭제 버튼이 표시되지 않아야 함
    expect(html).not.toContain('삭제');
  });

  // ---------------------------------------------------------------------------
  // SPEC-BOARD-UI-001: Prev/Next links (REQ-BUI-007)
  // ---------------------------------------------------------------------------

  it('VP-17: 이전글/다음글 링크가 표시됨 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi
        .fn()
        .mockResolvedValue({ prev: { id: 41, title: '이전 글' }, next: { id: 43, title: '다음 글' } }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 이전글/다음글 링크가 표시되어야 함
    expect(html).toContain('이전글');
    expect(html).toContain('다음글');
    expect(html).toContain('/free/41');
    expect(html).toContain('/free/43');
  });

  it('VP-18: 이전글이 없으면 "이전글" 링크가 표시되지 않음 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: { id: 43, title: '다음 글' } }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 이전글 링크가 표시되지 않아야 함
    expect(html).not.toContain('이전글');
    expect(html).toContain('다음글');
  });

  it('VP-19: 다음글이 없으면 "다음글" 링크가 표시되지 않음 (REQ-BUI-007)', async () => {
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: { id: 41, title: '이전 글' }, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({
      listComments: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@rhymix-ts/file', () => ({
      listAttachments: vi.fn().mockResolvedValue([]),
    }));

    const { BoardViewPage } = await import('./view-page.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(makeFakeProps({}) as any);
    const html = renderToStaticMarkup(node as React.ReactElement);

    // 다음글 링크가 표시되지 않아야 함
    expect(html).toContain('이전글');
    expect(html).not.toContain('다음글');
  });
});
