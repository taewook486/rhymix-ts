/**
 * adjacent.test.ts — SPEC-BOARD-UI-001 이전글/다음글 조회 테스트
 */
import { describe, it, expect } from 'vitest';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

describe('getAdjacentDocuments', () => {
  it('BUIT-ADJ-001: 첫 번째 문서 → prev=null, next 존재', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const currentDoc = {
      id: 1,
      boardId: 5,
      listOrder: BigInt(100),
      updateOrder: BigInt(100),
      status: 'PUBLIC',
      isNotice: false,
    };

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(currentDoc as any);
    // findFirst는 두 번 호출됨
    mockPrisma.document.findFirst
      .mockResolvedValueOnce({ id: 2, title: 'Next Doc' } as any) // next
      .mockResolvedValueOnce(null); // prev 없음

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getAdjacentDocuments(
      { documentId: 1, boardId: 5 },
      { prisma: mockPrisma as any },
    );

    expect(result).toMatchObject({
      prev: null,
      next: { id: 2, title: 'Next Doc' },
    });
  });

  it('BUIT-ADJ-002: 마지막 문서 → prev 존재, next=null', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const currentDoc = {
      id: 5,
      boardId: 5,
      listOrder: BigInt(10),
      updateOrder: BigInt(10),
      status: 'PUBLIC',
      isNotice: false,
    };

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(currentDoc as any);
    mockPrisma.document.findFirst
      .mockResolvedValueOnce(null) // next 없음
      .mockResolvedValueOnce({ id: 4, title: 'Prev Doc' } as any); // prev

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getAdjacentDocuments(
      { documentId: 5, boardId: 5 },
      { prisma: mockPrisma as any },
    );

    expect(result).toMatchObject({
      prev: { id: 4, title: 'Prev Doc' },
      next: null,
    });
  });

  it('BUIT-ADJ-003: 중간 문서 → prev, next 모두 존재', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const currentDoc = {
      id: 3,
      boardId: 5,
      listOrder: BigInt(50),
      updateOrder: BigInt(50),
      status: 'PUBLIC',
      isNotice: false,
    };

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(currentDoc as any);
    // findFirst는 두 번 호출됨 (next, prev 각각)
    mockPrisma.document.findFirst
      .mockResolvedValueOnce({ id: 4, title: 'Next Doc' } as any) // next (listOrder > 50)
      .mockResolvedValueOnce({ id: 2, title: 'Prev Doc' } as any); // prev (listOrder < 50)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getAdjacentDocuments(
      { documentId: 3, boardId: 5 },
      { prisma: mockPrisma as any },
    );

    expect(result).toMatchObject({
      prev: { id: 2, title: 'Prev Doc' },
      next: { id: 4, title: 'Next Doc' },
    });
  });

  it('BUIT-ADJ-004: 공지사항은 prev/next에서 제외', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const currentDoc = {
      id: 3,
      boardId: 5,
      listOrder: BigInt(50),
      updateOrder: BigInt(50),
      status: 'PUBLIC',
      isNotice: false,
    };

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(currentDoc as any);
    // isNotice=true인 문서는 where 절에서 자동 제외됨
    mockPrisma.document.findFirst
      .mockResolvedValueOnce(null) // next 없음
      .mockResolvedValueOnce({ id: 4, title: 'Prev Non-Notice' } as any); // prev (공지 아님)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getAdjacentDocuments(
      { documentId: 3, boardId: 5 },
      { prisma: mockPrisma as any },
    );

    expect(result.prev).not.toBeNull();
    expect(result.next).toBeNull();

    // where 절에 isNotice: false가 포함되었는지 검증
    const nextCall = mockPrisma.document.findFirst.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(nextCall.where.isNotice).toBe(false);
  });

  it('BUIT-ADJ-005: 다른 boardId의 문서는 반환하지 않음', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const currentDoc = {
      id: 10,
      boardId: 99, // 다른 게시판
      listOrder: BigInt(50),
      updateOrder: BigInt(50),
      status: 'PUBLIC',
      isNotice: false,
    };

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(currentDoc as any);

    // boardId가 다르므로 빈 결과 반환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getAdjacentDocuments(
      { documentId: 10, boardId: 5 }, // 다른 boardId로 요청
      { prisma: mockPrisma as any },
    );

    expect(result).toMatchObject({ prev: null, next: null });
  });

  it('BUIT-ADJ-006: sort=update_order → updateOrder 기준 정렬', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const currentDoc = {
      id: 3,
      boardId: 5,
      listOrder: BigInt(50),
      updateOrder: BigInt(80),
      status: 'PUBLIC',
      isNotice: false,
    };

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(currentDoc as any);
    mockPrisma.document.findFirst.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await getAdjacentDocuments(
      { documentId: 3, boardId: 5, sort: 'update_order' },
      { prisma: mockPrisma as any },
    );

    // next 쿼리 (findFirst 첫 번째 호출)
    const nextCall = mockPrisma.document.findFirst.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
    };
    expect(nextCall.orderBy).toEqual([{ updateOrder: 'asc' }, { id: 'asc' }]);
    expect(nextCall.where.updateOrder).toMatchObject({ gt: BigInt(80) });

    // prev 쿼리 (findFirst 두 번째 호출)
    const prevCall = mockPrisma.document.findFirst.mock.calls[1]?.[0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
    };
    expect(prevCall.orderBy).toEqual([{ updateOrder: 'desc' }, { id: 'desc' }]);
    expect(prevCall.where.updateOrder).toMatchObject({ lt: BigInt(80) });
  });

  it('BUIT-ADJ-007: 문서 없으면 빈 결과', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');

    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValueOnce(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getAdjacentDocuments(
      { documentId: 999, boardId: 5 },
      { prisma: mockPrisma as any },
    );

    expect(result).toMatchObject({ prev: null, next: null });
  });
});

// ---------------------------------------------------------------------------
// D-6: viewer 지정 시 게시판 list 권한 · 기준 글 상태 검사
// ---------------------------------------------------------------------------

describe('getAdjacentDocuments — viewer 권한 (D-6)', () => {
  const anon = { userId: null, userGroupSrl: 0, isAdmin: false };
  const author = { userId: 7, userGroupSrl: 1, isAdmin: false };
  const other = { userId: 8, userGroupSrl: 1, isAdmin: false };
  const admin = { userId: 1, userGroupSrl: 1, isAdmin: true };

  const setup = (currentOverride: Record<string, unknown> = {}, permissions: unknown = {}) => {
    const mockPrisma = createMockPrismaClient();
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 10,
      boardId: 5,
      authorId: 7,
      listOrder: BigInt(100),
      updateOrder: BigInt(100),
      status: 'PUBLIC',
      isNotice: false,
      deletedAt: null,
      ...currentOverride,
    } as any);
    mockPrisma.document.findFirst
      .mockResolvedValueOnce({ id: 11, title: 'Next' } as any)
      .mockResolvedValueOnce({ id: 9, title: 'Prev' } as any);
    mockPrisma.board.findUnique.mockResolvedValue({ id: 5, permissions } as any);
    return mockPrisma;
  };

  it('D6-1: list 권한을 제한한 게시판(list:[1])은 비회원에게 BoardPermissionDeniedError', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');
    const { BoardPermissionDeniedError } = await import('./document.js');
    const mockPrisma = setup({}, { list: [1] });
    await expect(
      getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: mockPrisma as any }, { viewer: anon }),
    ).rejects.toBeInstanceOf(BoardPermissionDeniedError);
    expect(mockPrisma.document.findFirst).not.toHaveBeenCalled();
  });

  it('D6-2: 회원은 같은 게시판(list:[1])에서 이웃 글을 받는다', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');
    const mockPrisma = setup({}, { list: [1] });
    const result = await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: mockPrisma as any }, { viewer: other });
    expect(result).toEqual({ prev: { id: 9, title: 'Prev' }, next: { id: 11, title: 'Next' } });
  });

  it('D6-3: 게시판이 없으면 빈 결과', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');
    const mockPrisma = setup();
    mockPrisma.board.findUnique.mockResolvedValue(null);
    const result = await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: mockPrisma as any }, { viewer: anon });
    expect(result).toEqual({ prev: null, next: null });
  });

  it('D6-4: 기준 글이 삭제됐으면 빈 결과 (관리자도)', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');
    const mockPrisma = setup({ deletedAt: new Date('2026-01-02') });
    const result = await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: mockPrisma as any }, { viewer: admin });
    expect(result).toEqual({ prev: null, next: null });
    expect(mockPrisma.document.findFirst).not.toHaveBeenCalled();
  });

  it.each(['TEMP', 'SECRET'] as const)('D6-5: %s 기준 글은 작성자·관리자만, 남·비회원은 빈 결과', async (status) => {
    const { getAdjacentDocuments } = await import('./adjacent.js');
    const empty = { prev: null, next: null };
    expect(await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: setup({ status }) as any }, { viewer: other })).toEqual(empty);
    expect(await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: setup({ status }) as any }, { viewer: anon })).toEqual(empty);
    const forAuthor = await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: setup({ status }) as any }, { viewer: author });
    expect(forAuthor.next).toEqual({ id: 11, title: 'Next' });
    const forAdmin = await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: setup({ status }) as any }, { viewer: admin });
    expect(forAdmin.prev).toEqual({ id: 9, title: 'Prev' });
  });

  it('D6-6: viewer 를 생략하면 종전 동작 그대로 — board 조회 없음, 권한 제한 게시판이어도 이웃 반환', async () => {
    const { getAdjacentDocuments } = await import('./adjacent.js');
    const mockPrisma = setup({ status: 'TEMP', deletedAt: new Date('2026-01-02') }, { list: [1] });
    const result = await getAdjacentDocuments({ documentId: 10, boardId: 5 }, { prisma: mockPrisma as any });
    expect(result.next).toEqual({ id: 11, title: 'Next' });
    expect(mockPrisma.board.findUnique).not.toHaveBeenCalled();
  });
});

