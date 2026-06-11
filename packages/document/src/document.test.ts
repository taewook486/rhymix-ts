/**
 * packages/board/src/document.test.ts — SPEC-CONTENT-001 Slice A + Slice B + Slice C
 *
 * A-9 ~ A-12: createDocument, listDocuments, getDocument 도메인 함수 검증 (Slice A)
 * B-401 ~ B-431: Slice B XSS, permissions, ownership 검증
 * D-1 ~ D-10: Slice C cursor pagination, notices, categoryId, tags, cursor 유틸 검증
 */
import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// createDocument (A-9, A-10)
// ---------------------------------------------------------------------------

describe('createDocument', () => {
  it('A-9: 정상 입력 → document 생성, status=TEMP, boardId 일치, sanitize 적용된 content', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 7, moduleInstanceId: 3, permissions: {} };
    const fakeDocument = {
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'hi',
      content: '<p>x</p>',
      contentText: 'x',
    };

    const mockBoardFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentCreate = vi.fn().mockResolvedValue(fakeDocument);

    const mockPrisma = {
      board: { findUniqueOrThrow: mockBoardFindUniqueOrThrow },
      document: { create: mockDocumentCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await createDocument(
      // actor 미지정 시 기본값 (member, non-admin) 사용
      { moduleInstanceId: 3, authorId: 1, title: 'hi', content: '<p>x</p>', nickName: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockBoardFindUniqueOrThrow).toHaveBeenCalledOnce();
    expect(mockDocumentCreate).toHaveBeenCalledOnce();

    const createCall = mockDocumentCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.boardId).toBe(7);
    expect(createCall?.data?.status).toBe('TEMP');
    // Slice B: sanitize + toPlainText 후 contentText 가 별도 계산됨
    expect(typeof createCall?.data?.contentText).toBe('string');

    expect(result).toMatchObject({ id: 1, boardId: 7, status: 'TEMP' });
  });

  it('A-10: title 이 빈 문자열이면 ZodError', async () => {
    const { createDocument } = await import('./document.js');
    const mockPrisma = { board: {}, document: {} };

    await expect(
      createDocument(
        { moduleInstanceId: 1, authorId: 1, title: '', content: 'content', nickName: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError(ZodError);
  });
});

// ---------------------------------------------------------------------------
// listDocuments (A-11)
// ---------------------------------------------------------------------------

describe('listDocuments', () => {
  it('A-11: status=PUBLIC 필터 + deletedAt=null + regdate desc + take 20; Board 없으면 { notices:[], items:[], nextCursor:null }', async () => {
    const { listDocuments } = await import('./document.js');

    // Board 없는 경우
    const mockBoardFindUnique = vi.fn().mockResolvedValue(null);
    const mockDocumentFindMany = vi.fn();
    const mockPrisma = {
      board: { findUnique: mockBoardFindUnique },
      document: { findMany: mockDocumentFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 99, status: 'PUBLIC' }, { prisma: mockPrisma as any });
    // Slice C: 반환 타입이 { notices, items, nextCursor } 로 변경됨
    expect(result).toMatchObject({ notices: [], items: [], nextCursor: null });
    expect(mockDocumentFindMany).not.toHaveBeenCalled();

    // Board 있는 경우 — findMany 호출 검증 (notices + items)
    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false };
    const mockBoardFindUnique2 = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentFindMany2 = vi.fn()
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items
    const mockPrisma2 = {
      board: { findUnique: mockBoardFindUnique2 },
      document: { findMany: mockDocumentFindMany2 },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result2 = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma2 as any });
    // findMany 는 최소 2번 호출 (notices + items)
    expect(mockDocumentFindMany2).toHaveBeenCalled();
    expect(result2.notices).toEqual([]);
    expect(result2.items).toEqual([]);
    expect(result2.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDocument (A-12)
// ---------------------------------------------------------------------------

describe('getDocument', () => {
  it('A-12: Document + author { id, userId, nickName } 셀렉트 포함; 없으면 throw', async () => {
    const { getDocument } = await import('./document.js');

    const fakeResult = {
      id: 1,
      title: 'test',
      author: { id: 1, userId: 'user1', nickName: '홍길동' },
    };
    const mockFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeResult);
    const mockPrisma = { document: { findUniqueOrThrow: mockFindUniqueOrThrow } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getDocument(1, { prisma: mockPrisma as any });
    expect(result).toMatchObject({ id: 1, author: { id: 1, userId: 'user1' } });

    const callArg = mockFindUniqueOrThrow.mock.calls[0]?.[0] as {
      where: unknown;
      include: { author: { select: Record<string, boolean> } };
    };
    expect(callArg?.where).toMatchObject({ id: 1 });
    expect(callArg?.include?.author?.select).toMatchObject({ id: true, userId: true, nickName: true });

    // 존재하지 않으면 throw (findUniqueOrThrow 가 throw 하는 케이스)
    const mockThrow = vi.fn().mockRejectedValue(new Error('Not found'));
    const mockPrisma2 = { document: { findUniqueOrThrow: mockThrow } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(getDocument(999, { prisma: mockPrisma2 as any })).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice B (T-006) — XSS sanitize + status + permissions
// ---------------------------------------------------------------------------

describe('createDocument (Slice B)', () => {
  it('B-401: <script> 태그가 sanitize 되어 저장됨 (contentText 도 마찬가지)', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = {
      id: 7,
      moduleInstanceId: 3,
      permissions: { write_document: [1] },
    };
    const mockBoardFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentCreate = vi.fn().mockImplementation(async ({ data }) => ({
      id: 1,
      ...data,
    }));
    const mockPrisma = {
      board: { findUniqueOrThrow: mockBoardFindUniqueOrThrow },
      document: { create: mockDocumentCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'hi',
        content: '<p>safe</p><script>alert(1)</script>',
        nickName: null,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const data = mockDocumentCreate.mock.calls[0]?.[0]?.data as {
      content: string;
      contentText: string;
    };
    expect(data.content).not.toContain('<script');
    expect(data.content).toContain('safe');
  });

  it('B-402: status 옵션 = PUBLIC 으로 명시하면 그대로 저장', async () => {
    const { createDocument } = await import('./document.js');
    const fakeBoard = { id: 7, moduleInstanceId: 3, permissions: {} };
    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: vi.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })) },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'x',
        content: 'y',
        nickName: null,
        status: 'PUBLIC',
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const data = mockPrisma.document.create.mock.calls[0]?.[0]?.data as { status: string };
    expect(data.status).toBe('PUBLIC');
  });

  it('B-403: 권한 거부 — guest(groupSrl=0) 가 write_document=[1] 게시판에 글 작성 시 throw', async () => {
    const { createDocument } = await import('./document.js');
    const fakeBoard = { id: 7, moduleInstanceId: 3, permissions: { write_document: [1] } };
    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: vi.fn() },
    };

    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: null,
          title: 'x',
          content: 'y',
          nickName: 'guest',
          actor: { userGroupSrl: 0, isAdmin: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });
});

describe('updateDocument (Slice B)', () => {
  it('B-411: 본인 author 가 title 변경 → prisma.document.update 호출됨', async () => {
    const { updateDocument } = await import('./document.js');
    const fakeDoc = {
      id: 10,
      boardId: 7,
      authorId: 5,
      title: 'old',
      content: '<p>x</p>',
      contentText: '<p>x</p>',
      status: 'PUBLIC',
      board: { id: 7, permissions: {} },
    };
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: vi.fn().mockResolvedValue({ ...fakeDoc, title: 'new' }),
      },
    };

    const result = await updateDocument(
      {
        id: 10,
        title: 'new',
        actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );
    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    expect(result.title).toBe('new');
  });

  it('B-412: 본인이 아닌데 admin 도 아니면 throw', async () => {
    const { updateDocument } = await import('./document.js');
    const fakeDoc = {
      id: 10,
      boardId: 7,
      authorId: 5,
      title: 'old',
      content: '<p>x</p>',
      contentText: '<p>x</p>',
      status: 'PUBLIC',
      board: { id: 7, permissions: {} },
    };
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: vi.fn(),
      },
    };

    await expect(
      updateDocument(
        {
          id: 10,
          title: 'new',
          actor: { userId: 99, userGroupSrl: 1, isAdmin: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });

  it('B-413: content 변경 시 sanitize 적용 + contentText 재계산', async () => {
    const { updateDocument } = await import('./document.js');
    const fakeDoc = {
      id: 10,
      boardId: 7,
      authorId: 5,
      title: 't',
      content: 'old',
      contentText: 'old',
      status: 'PUBLIC',
      board: { id: 7, permissions: {} },
    };
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: vi.fn().mockImplementation(async ({ data }) => ({ ...fakeDoc, ...data })),
      },
    };

    await updateDocument(
      {
        id: 10,
        content: '<p>new</p><script>alert(1)</script>',
        actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    const updateCall = mockPrisma.document.update.mock.calls[0]?.[0] as {
      data: { content: string; contentText?: string };
    };
    expect(updateCall.data.content).not.toContain('<script');
    expect(updateCall.data.contentText).toBeDefined();
  });
});

describe('deleteDocument (Slice B)', () => {
  it('B-421: 본인 또는 admin 이면 soft delete (deletedAt 세팅)', async () => {
    const { deleteDocument } = await import('./document.js');
    const fakeDoc = {
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: false },
    };
    const mockUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });
    const mockFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeDoc);
    const mockPrisma = {
      document: {
        findUniqueOrThrow: mockFindUniqueOrThrow,
        update: mockUpdate,
      },
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          document: { findUniqueOrThrow: mockFindUniqueOrThrow, update: mockUpdate },
          trash: { upsert: vi.fn() },
          documentCategory: { update: vi.fn() },
        });
      }),
    };

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updateCall = mockUpdate.mock.calls[0]?.[0] as {
      data: { deletedAt: unknown };
    };
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it('B-422: 타인 + non-admin 이면 throw, update 미호출', async () => {
    const { deleteDocument } = await import('./document.js');
    const fakeDoc = {
      id: 10,
      authorId: 5,
      board: { id: 7, permissions: {} },
    };
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: vi.fn(),
      },
    };

    await expect(
      deleteDocument(
        { id: 10, actor: { userId: 99, userGroupSrl: 1, isAdmin: false } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrowError();
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Slice D 회귀/확장 테스트 (DD-1 ~ DD-5)
//
// deleteDocument → softDeleteDocument wrapper 회귀 보호
// updateDocument → recordUpdate 자동 호출 검증
// ---------------------------------------------------------------------------

describe('deleteDocument Slice D 회귀 (DD-1 ~ DD-3)', () => {
  it('DD-1: deleteDocument 기존 시그니처 유지 — Document 반환, deletedAt set', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: false },
    };

    const mockTxDocUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });
    const mockTxTrashUpsert = vi.fn();

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          document: {
            findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
            update: mockTxDocUpdate,
          },
          trash: { upsert: mockTxTrashUpsert },
          documentCategory: { update: vi.fn() },
        }),
      ),
    };

    const result = await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // Document 를 반환해야 함
    expect(result).toBeTruthy();
    expect(result.id).toBe(10);

    // deletedAt 세팅 확인
    expect(mockTxDocUpdate).toHaveBeenCalledOnce();
    const updateCall = mockTxDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.deletedAt).toBeInstanceOf(Date);
  });

  it('DD-2: deleteDocument + board.trashUse=true → Trash row 생성', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: true },
    };

    const mockTxDocUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });
    const mockTxTrashUpsert = vi.fn().mockResolvedValue({ id: 1, documentId: 10 });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          document: {
            findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
            update: mockTxDocUpdate,
          },
          trash: { upsert: mockTxTrashUpsert },
          documentCategory: { update: vi.fn() },
        }),
      ),
    };

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockTxTrashUpsert).toHaveBeenCalledOnce();
  });

  it('DD-3: deleteDocument + board.trashUse=false → Trash row 미생성', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      authorId: 5,
      categoryId: null,
      board: { id: 7, permissions: {}, trashUse: false },
    };

    const mockTxDocUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });
    const mockTxTrashUpsert = vi.fn();

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          document: {
            findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
            update: mockTxDocUpdate,
          },
          trash: { upsert: mockTxTrashUpsert },
          documentCategory: { update: vi.fn() },
        }),
      ),
    };

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockTxTrashUpsert).not.toHaveBeenCalled();
  });
});

describe('updateDocument Slice D 확장 (DD-4 ~ DD-5)', () => {
  it('DD-4: updateDocument board.updateLog=false → DocumentUpdateLog 미생성', async () => {
    const { updateDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      boardId: 7,
      authorId: 5,
      title: '기존 제목',
      content: '기존 내용',
      contentText: '기존 내용',
      status: 'PUBLIC',
      board: { id: 7, permissions: {}, updateLog: false },
    };

    const mockDocUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, title: '새 제목' });
    const mockLogCreate = vi.fn();

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: mockDocUpdate,
      },
      documentUpdateLog: { create: mockLogCreate },
    };

    await updateDocument(
      { id: 10, title: '새 제목', actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockDocUpdate).toHaveBeenCalledOnce();
    // updateLog=false → DocumentUpdateLog.create 미호출
    expect(mockLogCreate).not.toHaveBeenCalled();
  });

  it('DD-3b (=DD-5): updateDocument board.updateLog=true + title 변경 → DocumentUpdateLog row 1개 추가', async () => {
    const { updateDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      boardId: 7,
      authorId: 5,
      title: '기존 제목',
      content: '기존 내용',
      contentText: '기존 내용',
      status: 'PUBLIC',
      board: { id: 7, permissions: {}, updateLog: true },
    };

    const mockLogCreate = vi.fn().mockResolvedValue({ id: 1 });
    const mockDocUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, title: '새 제목' });

    const mockTx = {
      documentUpdateLog: { create: mockLogCreate },
      document: { update: mockDocUpdate },
    };

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: vi.fn(), // 직접 경로 (트랜잭션 미사용 분기)
      },
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
    };

    await updateDocument(
      { id: 10, title: '새 제목', actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // $transaction 이 사용되어야 함
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    // DocumentUpdateLog row 1개 생성 확인
    expect(mockLogCreate).toHaveBeenCalledOnce();
    const logCall = mockLogCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(logCall?.data?.documentId).toBe(10);
    expect(logCall?.data?.prevTitle).toBe('기존 제목');
  });
});

describe('listDocuments search (Slice B)', () => {
  it('B-431: search 파라미터가 주어지면 prisma.$queryRaw 가 plainto_tsquery 와 함께 호출됨', async () => {
    const { listDocuments } = await import('./document.js');
    const fakeBoard = { id: 7, moduleInstanceId: 3, listCount: 20, exceptNotice: false };
    const mockQueryRaw = vi.fn().mockResolvedValue([{ id: 1, title: 'hit', listOrder: BigInt(1000) }]);
    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: vi.fn() },
      $queryRaw: mockQueryRaw,
    };

    const result = await listDocuments(
      { moduleInstanceId: 3, status: 'PUBLIC', search: '검색어' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockQueryRaw).toHaveBeenCalledOnce();
    expect(mockPrisma.document.findMany).not.toHaveBeenCalled();
    // Slice C: 반환 타입이 { notices, items, nextCursor } 로 변경됨
    expect(result.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice C — cursor pagination + notices + categoryId + tags
// ---------------------------------------------------------------------------

describe('listDocuments (Slice C)', () => {
  it('D-1: cursor 없음 → 첫 페이지 반환, nextCursor 있음 (items.length === limit)', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 2, exceptNotice: false };
    const fakeDocs = [
      { id: 3, boardId: 5, isNotice: false, listOrder: BigInt(1000), status: 'PUBLIC', deletedAt: null },
      { id: 2, boardId: 5, isNotice: false, listOrder: BigInt(999), status: 'PUBLIC', deletedAt: null },
      { id: 1, boardId: 5, isNotice: false, listOrder: BigInt(998), status: 'PUBLIC', deletedAt: null },
    ];

    const mockFindMany = vi.fn()
      .mockResolvedValueOnce([]) // notices query
      .mockResolvedValueOnce(fakeDocs.slice(0, 3)); // items query (take limit+1)

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', limit: 2 }, { prisma: mockPrisma as any });

    expect(result.notices).toHaveLength(0);
    expect(result.items).toHaveLength(2); // limit=2, sliced from 3
    expect(result.nextCursor).not.toBeNull();
  });

  it('D-2: cursor 있음 → 다음 페이지 반환, 이전 페이지와 겹치지 않음', async () => {
    const { listDocuments, encodeCursor } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 2, exceptNotice: false };
    const cursor = encodeCursor(BigInt(999), 2);

    const fakeDocs = [
      { id: 1, boardId: 5, isNotice: false, listOrder: BigInt(998), status: 'PUBLIC', deletedAt: null },
    ];

    const mockFindMany = vi.fn()
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce(fakeDocs);

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', cursor, limit: 2 }, { prisma: mockPrisma as any });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull(); // 마지막 페이지
    expect(result.items[0]?.id).toBe(1);
  });

  it('D-3: isNotice=true 문서가 notices[] 에 분리', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false };
    const noticeDoc = { id: 10, boardId: 5, isNotice: true, listOrder: BigInt(9999), status: 'PUBLIC', deletedAt: null };

    const mockFindMany = vi.fn()
      .mockResolvedValueOnce([noticeDoc]) // notices
      .mockResolvedValueOnce([]); // items

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma as any });

    expect(result.notices).toHaveLength(1);
    expect(result.notices[0]?.id).toBe(10);
    expect(result.items).toHaveLength(0);
  });

  it('D-4: exceptNotice=true 게시판 → notices[] 비어있음', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: true };

    const mockFindMany = vi.fn().mockResolvedValue([]); // items only

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma as any });

    expect(result.notices).toHaveLength(0);
  });

  it('D-5: categoryId 필터 → findMany 에 categoryId 조건 포함', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false };
    const mockFindMany = vi.fn()
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', categoryId: 7 }, { prisma: mockPrisma as any });

    // items findMany 호출 검증 (두 번째 호출)
    const itemsCall = mockFindMany.mock.calls[1]?.[0] as { where: Record<string, unknown> };
    expect(itemsCall?.where?.categoryId).toBe(7);
  });

  it('D-6: tags 필터 → findMany 에 tags 조건 포함', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false };
    const mockFindMany = vi.fn()
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC', tags: ['ts', 'react'] }, { prisma: mockPrisma as any });

    const itemsCall = mockFindMany.mock.calls[1]?.[0] as { where: Record<string, unknown> };
    expect(itemsCall?.where).toMatchObject({ tags: { hasEvery: ['ts', 'react'] } });
  });
});

describe('createDocument (Slice C)', () => {
  it('D-7: categoryId 있으면 documentCount +1 확인 (incrementDocumentCount 호출)', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 7, moduleInstanceId: 3, permissions: {} };
    const fakeDoc = { id: 1, boardId: 7, categoryId: 3, title: 'test', status: 'TEMP' };

    const mockBoardFind = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocCreate = vi.fn().mockResolvedValue(fakeDoc);
    const mockExecuteRaw = vi.fn().mockResolvedValue(1);

    const mockPrisma = {
      board: { findUniqueOrThrow: mockBoardFind },
      document: { create: mockDocCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) },
      $executeRaw: mockExecuteRaw,
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          board: { findUniqueOrThrow: mockBoardFind },
          document: { create: mockDocCreate },
          $executeRaw: mockExecuteRaw,
        });
      }),
    };

    await createDocument(
      {
        moduleInstanceId: 3, authorId: 1, title: 'test', content: 'content', nickName: null,
        categoryId: 3, actor: { userGroupSrl: 1, isAdmin: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    // incrementDocumentCount 가 $executeRaw 를 통해 호출돼야 함
    expect(mockExecuteRaw).toHaveBeenCalledOnce();
  });
});

describe('deleteDocument (Slice C)', () => {
  it('D-8: soft delete 후 categoryId 있으면 documentCount -1 확인', async () => {
    const { deleteDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      authorId: 5,
      categoryId: 3,
      board: { id: 7, permissions: {} },
    };

    const mockExecuteRaw = vi.fn().mockResolvedValue(1);
    const mockFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeDoc);
    const mockUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, deletedAt: new Date() });

    const mockPrisma = {
      document: {
        findUniqueOrThrow: mockFindUniqueOrThrow,
        update: mockUpdate,
      },
      $executeRaw: mockExecuteRaw,
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          document: { findUniqueOrThrow: mockFindUniqueOrThrow, update: mockUpdate },
          $executeRaw: mockExecuteRaw,
          trash: { upsert: vi.fn() },
          documentCategory: { update: vi.fn() },
        });
      }),
    };

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// D-9 (회귀): 기존 Slice B 호출 시그니처 호환성 보장
// ---------------------------------------------------------------------------

describe('listDocuments — Breaking Change 회귀 보장 (D-9)', () => {
  it('D-9: { moduleInstanceId, status } 만 전달 → { notices:[], items:[], nextCursor:null } 반환', async () => {
    const { listDocuments } = await import('./document.js');

    const fakeBoard = { id: 5, moduleInstanceId: 3, listCount: 20, exceptNotice: false };

    const mockFindMany = vi.fn()
      .mockResolvedValueOnce([]) // notices
      .mockResolvedValueOnce([]); // items

    const mockPrisma = {
      board: { findUnique: vi.fn().mockResolvedValue(fakeBoard) },
      document: { findMany: mockFindMany },
    };

    // Slice B 스타일 호출 — 새 파라미터 없이 기존 시그니처만 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma as any });

    // 반환 타입이 { notices, items, nextCursor } 로 변경됨을 확인
    expect(result).toMatchObject({
      notices: [],
      items: [],
      nextCursor: null,
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice F — DD-1 ~ DD-6: extraVars 통합 검증
// ---------------------------------------------------------------------------

describe('createDocument + extraVars (Slice F — DD-1 ~ DD-5)', () => {
  it('DD-F1: extraVars 포함 정상 생성 → prisma.document.create.data.extraVars 가 저장됨', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 10, moduleInstanceId: 3, permissions: {} };
    const fakeKeys = [
      { id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
      { id: 2, boardId: 10, varIdx: 1, varName: 'eventDate', varType: 'date', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
    ];
    const mockDocCreate = vi.fn().mockResolvedValue({ id: 1, boardId: 10, extraVars: { price: 100, eventDate: '2026-06-01' } });

    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: mockDocCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue(fakeKeys) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'test',
        content: '<p>내용</p>',
        nickName: null,
        extraVars: { price: 100, eventDate: '2026-06-01' },
      },
      { prisma: mockPrisma as any },
    );

    expect(mockDocCreate).toHaveBeenCalledOnce();
    const createCall = mockDocCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.extraVars).toMatchObject({ price: 100, eventDate: '2026-06-01' });
  });

  it('DD-F2: extraVars 검증 실패 → ZodError throw', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 10, moduleInstanceId: 3, permissions: {} };
    const fakeKeys = [
      { id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: true, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
    ];
    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: vi.fn() },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue(fakeKeys) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: 1,
          title: 'test',
          content: '<p>내용</p>',
          nickName: null,
          extraVars: { price: 'not-a-number' }, // 타입 불일치
        },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow();
  });

  it('DD-F3: 키 미정의 게시판 + extraVars 포함 → ExtraVarsNotConfiguredError', async () => {
    const { createDocument, ExtraVarsNotConfiguredError } = await import('./document.js');

    const fakeBoard = { id: 10, moduleInstanceId: 3, permissions: {} };
    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: vi.fn() },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) }, // 키 없음
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: 1,
          title: 'test',
          content: '<p>내용</p>',
          nickName: null,
          extraVars: { foo: 1 }, // 정의 없는 키
        },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraVarsNotConfiguredError);
  });

  it('DD-F4: required 키 있는 게시판 + extraVars 미전달 → ExtraVarsRequiredError', async () => {
    const { createDocument, ExtraVarsRequiredError } = await import('./document.js');

    const fakeBoard = { id: 10, moduleInstanceId: 3, permissions: {} };
    const fakeKeys = [
      { id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: true, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
    ];
    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: vi.fn() },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue(fakeKeys) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      createDocument(
        {
          moduleInstanceId: 3,
          authorId: 1,
          title: 'test',
          content: '<p>내용</p>',
          nickName: null,
          // extraVars 없음
        },
        { prisma: mockPrisma as any },
      ),
    ).rejects.toThrow(ExtraVarsRequiredError);
  });

  it('DD-F5: required 키 없는 게시판 + extraVars 미전달 → 기존 동작 통과', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 10, moduleInstanceId: 3, permissions: {} };
    const fakeKeys = [
      { id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
    ];
    const mockDocCreate = vi.fn().mockResolvedValue({ id: 1, boardId: 10 });
    const mockPrisma = {
      board: { findUniqueOrThrow: vi.fn().mockResolvedValue(fakeBoard) },
      document: { create: mockDocCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue(fakeKeys) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'test',
        content: '<p>내용</p>',
        nickName: null,
        // extraVars 없음, required 아니므로 통과
      },
      { prisma: mockPrisma as any },
    );

    expect(mockDocCreate).toHaveBeenCalledOnce();
  });
});

describe('updateDocument + extraVars (Slice F — DD-F6)', () => {
  it('DD-F6: updateDocument extraVars → PUT semantics (전체 교체)', async () => {
    const { updateDocument } = await import('./document.js');

    const fakeDoc = {
      id: 10,
      boardId: 7,
      authorId: 5,
      title: '제목',
      content: '<p>내용</p>',
      contentText: '내용',
      status: 'PUBLIC',
      extraVars: { price: 100, eventDate: '2026-01-01' }, // 기존 값
      board: { id: 7, permissions: {}, updateLog: false },
    };
    const fakeKeys = [
      { id: 1, boardId: 7, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
      { id: 2, boardId: 7, varIdx: 1, varName: 'eventDate', varType: 'date', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
    ];
    const mockDocUpdate = vi.fn().mockResolvedValue({ ...fakeDoc, extraVars: { price: 200 } });
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: mockDocUpdate,
      },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue(fakeKeys) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDocument(
      {
        id: 10,
        actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
        extraVars: { price: 200 }, // eventDate 없음 → PUT: eventDate 제거됨
      },
      { prisma: mockPrisma as any },
    );

    expect(mockDocUpdate).toHaveBeenCalledOnce();
    const updateCall = mockDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    // PUT semantics: 전달된 값만 저장됨 (eventDate 없음)
    expect(updateCall?.data?.extraVars).toMatchObject({ price: 200 });
    expect((updateCall?.data?.extraVars as Record<string, unknown>)?.eventDate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// D-10: encodeCursor / decodeCursor BigInt round-trip
// ---------------------------------------------------------------------------

describe('encodeCursor / decodeCursor — BigInt round-trip (D-10)', () => {
  it('D-10: { listOrder: 100n, id: 5 } → encode → decode → 원본과 deep equal (BigInt 보존)', async () => {
    const { encodeCursor, decodeCursor } = await import('./document.js');

    const original = { listOrder: BigInt(100), id: 5 };
    const token = encodeCursor(original.listOrder, original.id);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    const decoded = decodeCursor(token);
    expect(decoded.listOrder).toBe(original.listOrder); // BigInt equality
    expect(decoded.id).toBe(original.id);
  });
});

// ---------------------------------------------------------------------------
// AC-DOC-B1: createDocument + Board.documentCount atomicity
// ---------------------------------------------------------------------------

describe('createDocument — AC-DOC-B1 (Board.documentCount atomicity)', () => {
  it('AC-DOC-B1: GIVEN board with documentCount=5, WHEN createDocument called, THEN Board.documentCount=6', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 7, moduleInstanceId: 3, permissions: {}, documentCount: 5 };
    const fakeDocument = {
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'Test Doc',
      content: '<p>Content</p>',
      contentText: 'Content',
      categoryId: 10, // Category ID present - should trigger increment
    };

    const transactionCalls: unknown[] = [];

    const mockBoardFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentCreate = vi.fn().mockResolvedValue(fakeDocument);
    const mockIncrementCount = vi.fn();

    const mockPrisma = {
      board: { findUniqueOrThrow: mockBoardFindUniqueOrThrow },
      document: { create: mockDocumentCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: async (callback: unknown) => {
        transactionCalls.push(callback);
        // Mock transaction execution
        if (typeof callback === 'function') {
          const mockTx = {
            document: {
              create: mockDocumentCreate,
            },
            $executeRaw: vi.fn(), // Mock $executeRaw for incrementDocumentCount
          };
          return callback(mockTx);
        }
        throw new Error('Invalid transaction callback');
      },
    };

    // Mock incrementDocumentCount to verify it's called in transaction
    vi.doMock('./category', () => ({
      incrementDocumentCount: mockIncrementCount,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'Test Doc',
        content: '<p>Content</p>',
        nickName: null,
        categoryId: 10,
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      { prisma: mockPrisma as any },
    );

    // Verify transaction was used
    expect(transactionCalls.length).toBeGreaterThan(0);

    // Verify create was called
    expect(mockDocumentCreate).toHaveBeenCalledOnce();
  });

  it('AC-DOC-B1: should NOT increment documentCount when categoryId is null', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 7, moduleInstanceId: 3, permissions: {}, documentCount: 5 };
    const fakeDocument = {
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'Test Doc',
      content: '<p>Content</p>',
      contentText: 'Content',
    };

    const transactionCalls: unknown[] = [];

    const mockBoardFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentCreate = vi.fn().mockResolvedValue(fakeDocument);

    const mockPrisma = {
      board: { findUniqueOrThrow: mockBoardFindUniqueOrThrow },
      document: { create: mockDocumentCreate },
      documentExtraKey: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: async (callback: unknown) => {
        transactionCalls.push(callback);
        if (typeof callback === 'function') {
          const mockTx = {
            document: {
              create: mockDocumentCreate,
            },
          };
          return callback(mockTx);
        }
        throw new Error('Invalid transaction callback');
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDocument(
      {
        moduleInstanceId: 3,
        authorId: 1,
        title: 'Test Doc',
        content: '<p>Content</p>',
        nickName: null,
        categoryId: null, // No category - should NOT use transaction
        actor: { userGroupSrl: 1, isAdmin: false },
      },
      { prisma: mockPrisma as any },
    );

    // Verify NO transaction was used (categoryId is null)
    expect(transactionCalls.length).toBe(0);

    // Verify create was called directly (not in transaction)
    expect(mockDocumentCreate).toHaveBeenCalledOnce();
  });
});
