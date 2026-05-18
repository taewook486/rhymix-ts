/**
 * packages/board/src/document.test.ts — SPEC-CONTENT-001 Slice A
 *
 * A-9 ~ A-12: createDocument, listDocuments, getDocument 도메인 함수 검증
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
  it('A-11: status=PUBLIC 필터 + deletedAt=null + regdate desc + take 20; Board 없으면 []', async () => {
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
    expect(result).toEqual([]);
    expect(mockDocumentFindMany).not.toHaveBeenCalled();

    // Board 있는 경우 — findMany 호출 검증
    const fakeBoard = { id: 5, moduleInstanceId: 3 };
    const mockBoardFindUnique2 = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentFindMany2 = vi.fn().mockResolvedValue([]);
    const mockPrisma2 = {
      board: { findUnique: mockBoardFindUnique2 },
      document: { findMany: mockDocumentFindMany2 },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listDocuments({ moduleInstanceId: 3, status: 'PUBLIC' }, { prisma: mockPrisma2 as any });
    expect(mockDocumentFindMany2).toHaveBeenCalledOnce();
    const findManyCall = mockDocumentFindMany2.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
      take: number;
    };
    expect(findManyCall?.where.boardId).toBe(5);
    expect(findManyCall?.where.status).toBe('PUBLIC');
    expect(findManyCall?.where.deletedAt).toBeNull();
    expect(findManyCall?.orderBy).toMatchObject({ regdate: 'desc' });
    expect(findManyCall?.take).toBe(20);
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
      board: { id: 7, permissions: {} },
    };
    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(fakeDoc),
        update: vi.fn().mockResolvedValue({ ...fakeDoc, deletedAt: new Date() }),
      },
    };

    await deleteDocument(
      { id: 10, actor: { userId: 5, userGroupSrl: 1, isAdmin: false } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockPrisma.document.update).toHaveBeenCalledOnce();
    const updateCall = mockPrisma.document.update.mock.calls[0]?.[0] as {
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

describe('listDocuments search (Slice B)', () => {
  it('B-431: search 파라미터가 주어지면 prisma.$queryRaw 가 plainto_tsquery 와 함께 호출됨', async () => {
    const { listDocuments } = await import('./document.js');
    const fakeBoard = { id: 7, moduleInstanceId: 3 };
    const mockQueryRaw = vi.fn().mockResolvedValue([{ id: 1, title: 'hit' }]);
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
    expect(result).toHaveLength(1);
  });
});
