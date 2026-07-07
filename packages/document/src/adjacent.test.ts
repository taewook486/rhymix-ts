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
