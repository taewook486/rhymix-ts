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

/** 이 화면의 게시판(instance.id=1 에 대응하는 Board id=1) 을 돌려주는 prisma mock */
function makeFakePrisma(board: { id: number } | null = { id: 1 }) {
  const prisma = createMockPrismaClient();
  prisma.board.findUnique.mockResolvedValue(board as never);
  return prisma;
}

/** 공통 fakeProps 생성 헬퍼 */
function makeFakeProps(overrides: {
  documentId?: number;
  session?: { user: { id: number; isAdmin: boolean } } | null;
}) {
  return {
    instance: { id: 1, moduleCode: 'board', mid: 'free', name: '자유게시판', config: null },
    params: { mid: 'free' },
    searchParams: {},
    prisma: makeFakePrisma(),
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

// ---------------------------------------------------------------------------
// D-4: 상세 화면 접근 규칙 — 삭제 글 / TEMP / 게시판 소속
// ---------------------------------------------------------------------------

describe('BoardViewPage — 접근 규칙 (D-4)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function render(doc: Record<string, unknown>, session: { user: { id: number; isAdmin: boolean } } | null, board: { id: number } | null = { id: 1 }) {
    vi.doMock('next/navigation', () => ({
      notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
      },
    }));
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue({ ...FIXED_DOC, ...doc }),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({ listComments: vi.fn().mockResolvedValue([]) }));
    vi.doMock('@rhymix-ts/file', () => ({ listAttachments: vi.fn().mockResolvedValue([]) }));
    const { BoardViewPage } = await import('./view-page.js');
    const props = { ...makeFakeProps({ session }), prisma: makeFakePrisma(board) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = await BoardViewPage(props as any);
    return renderToStaticMarkup(node as React.ReactElement);
  }

  it('D4-1: 삭제된 글(deletedAt≠null)은 notFound', async () => {
    await expect(render({ deletedAt: new Date('2026-01-02') }, { user: { id: 7, isAdmin: true } })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('D4-2a: TEMP 글은 비로그인에게 notFound', async () => {
    await expect(render({ status: 'TEMP' }, null)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('D4-2b: TEMP 글은 작성자가 아닌 회원에게 notFound', async () => {
    await expect(render({ status: 'TEMP' }, { user: { id: 99, isAdmin: false } })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('D4-2c: TEMP 글은 작성자에게 보인다', async () => {
    const html = await render({ status: 'TEMP' }, { user: { id: 7, isAdmin: false } });
    expect(html).toContain('테스트 문서 제목');
  });

  it('D4-2d: TEMP 글은 관리자에게 보인다', async () => {
    const html = await render({ status: 'TEMP' }, { user: { id: 1, isAdmin: true } });
    expect(html).toContain('테스트 문서 제목');
  });

  it('D4-3a: 글이 다른 게시판 소속(boardId≠board.id)이면 notFound', async () => {
    await expect(render({ boardId: 2 }, null)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('D4-3b: 이 화면의 게시판 글이면 정상 렌더', async () => {
    const html = await render({ boardId: 1 }, null);
    expect(html).toContain('테스트 문서 제목');
  });

  it('D4-3c: 게시판을 찾을 수 없으면 notFound', async () => {
    await expect(render({}, null, null)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('D4-5: SECRET 안내("비밀글입니다")는 그대로 유지', async () => {
    const html = await render({ status: 'SECRET' }, null);
    expect(html).toContain('비밀글입니다');
  });

  // D4-4: 게시판 view 권한 검사 (기본값은 전체 허용 — permissions.ts DEFAULT_PERMISSIONS)
  async function renderWithPerms(
    permissions: unknown,
    session: { user: { id: number; isAdmin: boolean; groups?: Array<{ id: number }> } } | null,
  ) {
    vi.doMock('next/navigation', () => ({
      notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
      },
    }));
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue(FIXED_DOC),
      getAdjacentDocuments: vi.fn().mockResolvedValue({ prev: null, next: null }),
    }));
    vi.doMock('@rhymix-ts/comment', () => ({ listComments: vi.fn().mockResolvedValue([]) }));
    vi.doMock('@rhymix-ts/file', () => ({ listAttachments: vi.fn().mockResolvedValue([]) }));
    const { BoardViewPage } = await import('./view-page.js');
    const props = { ...makeFakeProps({ session: session as never }), prisma: makeFakePrisma({ id: 1, permissions } as never) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return renderToStaticMarkup((await BoardViewPage(props as any)) as React.ReactElement);
  }

  it('D4-4a: permissions 가 비어 있으면(기본값) 비회원도 글이 보인다', async () => {
    const html = await renderWithPerms({}, null);
    expect(html).toContain('테스트 문서 제목');
  });

  it('D4-4b: view:[1] 이면 비회원은 안내 화면만, 글 내용은 렌더되지 않는다', async () => {
    const html = await renderWithPerms({ view: [1] }, null);
    expect(html).toContain('열람 권한이 없습니다');
    expect(html).not.toContain('테스트 문서 제목');
    expect(html).not.toContain('안전한 HTML 콘텐츠');
  });

  it('D4-4c: view:[1] 이어도 회원(그룹 정보 없음 → 1)은 본다', async () => {
    const html = await renderWithPerms({ view: [1] }, { user: { id: 99, isAdmin: false } });
    expect(html).toContain('테스트 문서 제목');
  });

  it('D4-4d: view:[2] 는 그룹 2 회원만 — 그룹 1 회원은 안내 화면, 그룹 2 회원은 본다', async () => {
    const denied = await renderWithPerms({ view: [2] }, { user: { id: 99, isAdmin: false, groups: [{ id: 1 }] } });
    expect(denied).toContain('열람 권한이 없습니다');
    const allowed = await renderWithPerms({ view: [2] }, { user: { id: 99, isAdmin: false, groups: [{ id: 2 }] } });
    expect(allowed).toContain('테스트 문서 제목');
  });

  it('D4-4e: view:[] 여도 관리자는 본다', async () => {
    const html = await renderWithPerms({ view: [] }, { user: { id: 1, isAdmin: true } });
    expect(html).toContain('테스트 문서 제목');
  });

  // D5: 이전글/다음글은 모듈 인스턴스 id 가 아니라 Board.id 로 조회한다
  it('D5-1: Board.id(9) ≠ instance.id(1) 일 때 getAdjacentDocuments 는 boardId 9 로 호출된다', async () => {
    const getAdjacentDocuments = vi.fn().mockResolvedValue({ prev: null, next: null });
    vi.doMock('next/navigation', () => ({
      notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
      },
    }));
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue({ ...FIXED_DOC, boardId: 9 }),
      getAdjacentDocuments,
    }));
    vi.doMock('@rhymix-ts/comment', () => ({ listComments: vi.fn().mockResolvedValue([]) }));
    vi.doMock('@rhymix-ts/file', () => ({ listAttachments: vi.fn().mockResolvedValue([]) }));
    const { BoardViewPage } = await import('./view-page.js');
    const props = { ...makeFakeProps({}), prisma: makeFakePrisma({ id: 9 }) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await BoardViewPage(props as any);
    expect(getAdjacentDocuments).toHaveBeenCalledOnce();
    expect(getAdjacentDocuments.mock.calls[0]?.[0]).toMatchObject({ documentId: 42, boardId: 9 });
  });

  it('D5-2: 소속 검사(notFound)에 걸린 글은 이전/다음글을 조회하지 않는다', async () => {
    const getAdjacentDocuments = vi.fn().mockResolvedValue({ prev: null, next: null });
    vi.doMock('next/navigation', () => ({
      notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
      },
    }));
    vi.doMock('@rhymix-ts/document', () => ({
      getDocument: vi.fn().mockResolvedValue({ ...FIXED_DOC, boardId: 2 }),
      getAdjacentDocuments,
    }));
    vi.doMock('@rhymix-ts/comment', () => ({ listComments: vi.fn().mockResolvedValue([]) }));
    vi.doMock('@rhymix-ts/file', () => ({ listAttachments: vi.fn().mockResolvedValue([]) }));
    const { BoardViewPage } = await import('./view-page.js');
    const props = { ...makeFakeProps({}), prisma: makeFakePrisma({ id: 9 }) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(BoardViewPage(props as any)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getAdjacentDocuments).not.toHaveBeenCalled();
  });
});
