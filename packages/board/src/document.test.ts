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
  it('A-9: 정상 입력 → document 생성, status=TEMP, boardId 일치, contentText=content', async () => {
    const { createDocument } = await import('./document.js');

    const fakeBoard = { id: 7, moduleInstanceId: 3 };
    const fakeDocument = {
      id: 1,
      boardId: 7,
      status: 'TEMP',
      title: 'hi',
      content: '<p>x</p>',
      contentText: '<p>x</p>',
    };

    const mockBoardFindUniqueOrThrow = vi.fn().mockResolvedValue(fakeBoard);
    const mockDocumentCreate = vi.fn().mockResolvedValue(fakeDocument);

    const mockPrisma = {
      board: { findUniqueOrThrow: mockBoardFindUniqueOrThrow },
      document: { create: mockDocumentCreate },
    };

    const result = await createDocument(
      { moduleInstanceId: 3, authorId: 1, title: 'hi', content: '<p>x</p>', nickName: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(mockBoardFindUniqueOrThrow).toHaveBeenCalledOnce();
    expect(mockDocumentCreate).toHaveBeenCalledOnce();

    const createCall = mockDocumentCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.boardId).toBe(7);
    expect(createCall?.data?.status).toBe('TEMP');
    expect(createCall?.data?.contentText).toBe('<p>x</p>');

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
