/**
 * packages/board/src/history.test.ts — SPEC-CONTENT-001 Slice D
 *
 * H-1 ~ H-6: recordUpdate, getUpdateHistory 도메인 함수 검증.
 *
 * REQ-CONTENT-110: updateDocument 호출 시 변경 전 snapshot 을 DocumentUpdateLog 에 기록.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// recordUpdate
// ---------------------------------------------------------------------------

describe('recordUpdate', () => {
  it('H-1: recordUpdate → DocumentUpdateLog row 추가, regdate 자동 세팅', async () => {
    const { recordUpdate } = await import('./history.js');

    const fakeLog = {
      id: 1,
      documentId: 10,
      prevTitle: '이전 제목',
      prevContent: '<p>이전 내용</p>',
      prevExtraVars: null,
      editorId: 42,
      editorIp: null,
      regdate: new Date(),
    };

    const txLogCreate = vi.fn().mockResolvedValue(fakeLog);

    // recordUpdate 는 tx (PrismaClient | TransactionClient) 를 직접 받음
    const tx = {
      documentUpdateLog: { create: txLogCreate },
    };

    const result = await recordUpdate(
      {
        documentId: 10,
        prevTitle: '이전 제목',
        prevContent: '<p>이전 내용</p>',
        prevExtraVars: null,
        editorId: 42,
        editorIp: null,
      },
      tx as never,
    );

    expect(txLogCreate).toHaveBeenCalledOnce();
    const createCall = txLogCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.documentId).toBe(10);
    expect(createCall?.data?.prevTitle).toBe('이전 제목');
    expect(result.id).toBe(1);
  });

  it('H-2: 트랜잭션 클라이언트 사용 — 롤백 시 row 미생성 (transaction 실패 시 에러 전파)', async () => {
    const { recordUpdate } = await import('./history.js');

    const tx = {
      documentUpdateLog: {
        create: vi.fn().mockRejectedValue(new Error('tx rolled back')),
      },
    };

    await expect(
      recordUpdate(
        {
          documentId: 10,
          prevTitle: '이전 제목',
          prevContent: '<p>이전 내용</p>',
          prevExtraVars: null,
          editorId: 42,
          editorIp: null,
        },
        tx as never,
      ),
    ).rejects.toThrow('tx rolled back');
  });
});

// ---------------------------------------------------------------------------
// getUpdateHistory
// ---------------------------------------------------------------------------

describe('getUpdateHistory', () => {
  it('H-3: 본인 → 자신의 문서 history 반환 (최신순)', async () => {
    const { getUpdateHistory } = await import('./history.js');

    const fakeLogs = [
      { id: 2, documentId: 10, prevTitle: '제목2', regdate: new Date('2026-01-02') },
      { id: 1, documentId: 10, prevTitle: '제목1', regdate: new Date('2026-01-01') },
    ];

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, authorId: 42 }),
      },
      documentUpdateLog: {
        findMany: vi.fn().mockResolvedValue(fakeLogs),
      },
    };

    const result = await getUpdateHistory(
      { documentId: 10, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } },
      { prisma: mockPrisma as never },
    );

    expect(result).toHaveLength(2);
    // 최신순 확인 — id 2가 id 1 보다 앞
    expect(result[0]?.id).toBe(2);

    // 조회 쿼리 orderBy 확인
    const findCall = mockPrisma.documentUpdateLog.findMany.mock.calls[0]?.[0] as {
      orderBy: Record<string, unknown>;
    };
    expect(findCall?.orderBy?.regdate).toBe('desc');
  });

  it('H-4: admin → 타인의 문서 history 반환', async () => {
    const { getUpdateHistory } = await import('./history.js');

    const fakeLogs = [{ id: 1, documentId: 10, prevTitle: '제목' }];

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, authorId: 99 }), // 다른 사람 소유
      },
      documentUpdateLog: {
        findMany: vi.fn().mockResolvedValue(fakeLogs),
      },
    };

    // admin은 타인 문서도 조회 가능
    const result = await getUpdateHistory(
      { documentId: 10, actor: { userId: 1, userGroupSrl: 1, isAdmin: true } },
      { prisma: mockPrisma as never },
    );

    expect(result).toHaveLength(1);
  });

  it('H-5: 비본인 비admin → BoardPermissionDeniedError', async () => {
    const { getUpdateHistory } = await import('./history.js');
    const { BoardPermissionDeniedError } = await import('./document.js');

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, authorId: 99 }),
      },
      documentUpdateLog: { findMany: vi.fn() },
    };

    await expect(
      getUpdateHistory(
        { documentId: 10, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } }, // 42 ≠ 99
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(BoardPermissionDeniedError);
  });

  it('H-6: history 없는 문서 → 빈 배열', async () => {
    const { getUpdateHistory } = await import('./history.js');

    const mockPrisma = {
      document: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, authorId: 42 }),
      },
      documentUpdateLog: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await getUpdateHistory(
      { documentId: 10, actor: { userId: 42, userGroupSrl: 1, isAdmin: false } },
      { prisma: mockPrisma as never },
    );

    expect(result).toEqual([]);
  });
});
