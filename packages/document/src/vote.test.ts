/**
 * packages/board/src/vote.test.ts — SPEC-CONTENT-001 Slice D
 *
 * V-1 ~ V-8: voteDocument, getVoteCount 도메인 함수 검증.
 *
 * REQ-CONTENT-090: 1인 1회 투표, toggle 시맨틱, 원자성.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// voteDocument
// ---------------------------------------------------------------------------

describe('voteDocument', () => {
  it('V-1: UP 최초 투표 → row 생성 + votedCount +1', async () => {
    const { voteDocument } = await import('./vote.js');

    // 트랜잭션 내 동작 시뮬레이션
    const txVoteFindUnique = vi.fn().mockResolvedValue(null); // 기존 vote 없음
    const txVoteCreate = vi.fn().mockResolvedValue({
      id: 1, documentId: 10, voterId: '42', voteType: 'UP', point: 1,
    });
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, votedCount: 1, blamedCount: 0 });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentVote: { findUnique: txVoteFindUnique, create: txVoteCreate, delete: vi.fn() },
          document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 0 }), update: txDocUpdate },
        }),
      ),
    };

    const result = await voteDocument(
      { documentId: 10, voterId: '42', voteType: 'UP' },
      { prisma: mockPrisma as never },
    );

    expect(result.action).toBe('created');
    expect(result.vote).toBeTruthy();
    expect(result.vote?.voteType).toBe('UP');
    expect(txVoteCreate).toHaveBeenCalledOnce();
    // votedCount +1 업데이트 확인
    const updateCall = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.votedCount).toEqual({ increment: 1 });
  });

  it('V-2: 동일 UP 재호출 → toggle off (row 삭제 + votedCount -1)', async () => {
    const { voteDocument } = await import('./vote.js');

    const existingVote = { id: 1, documentId: 10, voterId: '42', voteType: 'UP', point: 1 };
    const txVoteFindUnique = vi.fn().mockResolvedValue(existingVote);
    const txVoteDelete = vi.fn().mockResolvedValue(existingVote);
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 0 });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentVote: { findUnique: txVoteFindUnique, create: vi.fn(), delete: txVoteDelete },
          document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, votedCount: 1, blamedCount: 0 }), update: txDocUpdate },
        }),
      ),
    };

    const result = await voteDocument(
      { documentId: 10, voterId: '42', voteType: 'UP' },
      { prisma: mockPrisma as never },
    );

    expect(result.action).toBe('removed');
    expect(result.vote).toBeNull();
    expect(txVoteDelete).toHaveBeenCalledOnce();
    // votedCount -1 업데이트 확인
    const updateCall = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.votedCount).toEqual({ decrement: 1 });
  });

  it('V-3: DOWN 투표 → votedCount -1 (point: -1)', async () => {
    const { voteDocument } = await import('./vote.js');

    const txVoteFindUnique = vi.fn().mockResolvedValue(null);
    const txVoteCreate = vi.fn().mockResolvedValue({
      id: 2, documentId: 10, voterId: '42', voteType: 'DOWN', point: -1,
    });
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, votedCount: -1, blamedCount: 0 });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentVote: { findUnique: txVoteFindUnique, create: txVoteCreate, delete: vi.fn() },
          document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 0 }), update: txDocUpdate },
        }),
      ),
    };

    const result = await voteDocument(
      { documentId: 10, voterId: '42', voteType: 'DOWN' },
      { prisma: mockPrisma as never },
    );

    expect(result.action).toBe('created');
    expect(result.vote?.voteType).toBe('DOWN');
    // DOWN 이면 votedCount -1
    const updateCall = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.votedCount).toEqual({ decrement: 1 });
  });

  it('V-4: BLAME 신규 → blamedCount +1', async () => {
    const { voteDocument } = await import('./vote.js');

    const txVoteFindUnique = vi.fn().mockResolvedValue(null);
    const txVoteCreate = vi.fn().mockResolvedValue({
      id: 3, documentId: 10, voterId: '42', voteType: 'BLAME', point: 1,
    });
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 1 });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentVote: { findUnique: txVoteFindUnique, create: txVoteCreate, delete: vi.fn() },
          document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 0 }), update: txDocUpdate },
        }),
      ),
    };

    const result = await voteDocument(
      { documentId: 10, voterId: '42', voteType: 'BLAME' },
      { prisma: mockPrisma as never },
    );

    expect(result.action).toBe('created');
    expect(result.vote?.voteType).toBe('BLAME');
    const updateCall = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.blamedCount).toEqual({ increment: 1 });
    // votedCount 는 건드리지 않음
    expect(updateCall?.data?.votedCount).toBeUndefined();
  });

  it('V-5: BLAME toggle off → blamedCount -1', async () => {
    const { voteDocument } = await import('./vote.js');

    const existingVote = { id: 3, documentId: 10, voterId: '42', voteType: 'BLAME', point: 1 };
    const txVoteFindUnique = vi.fn().mockResolvedValue(existingVote);
    const txVoteDelete = vi.fn().mockResolvedValue(existingVote);
    const txDocUpdate = vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 0 });

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentVote: { findUnique: txVoteFindUnique, create: vi.fn(), delete: txVoteDelete },
          document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 10, votedCount: 0, blamedCount: 1 }), update: txDocUpdate },
        }),
      ),
    };

    const result = await voteDocument(
      { documentId: 10, voterId: '42', voteType: 'BLAME' },
      { prisma: mockPrisma as never },
    );

    expect(result.action).toBe('removed');
    expect(result.vote).toBeNull();
    const updateCall = txDocUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.blamedCount).toEqual({ decrement: 1 });
  });

  it('V-7: 존재하지 않는 documentId → 에러 전파', async () => {
    const { voteDocument } = await import('./vote.js');

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          documentVote: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), delete: vi.fn() },
          document: {
            findUniqueOrThrow: vi.fn().mockRejectedValue(
              Object.assign(new Error('Record not found'), { code: 'P2025' }),
            ),
            update: vi.fn(),
          },
        }),
      ),
    };

    await expect(
      voteDocument(
        { documentId: 9999, voterId: '42', voteType: 'UP' },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow();
  });

  it('V-8: 트랜잭션 롤백 시 모두 원복 (transaction 실패)', async () => {
    const { voteDocument } = await import('./vote.js');

    const mockPrisma = {
      $transaction: vi.fn().mockRejectedValue(new Error('transaction failed')),
    };

    await expect(
      voteDocument(
        { documentId: 10, voterId: '42', voteType: 'UP' },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow('transaction failed');
  });
});

// ---------------------------------------------------------------------------
// getVoteCount
// ---------------------------------------------------------------------------

describe('getVoteCount', () => {
  it('V-6: getVoteCount → { up, down, blame } 정확', async () => {
    const { getVoteCount } = await import('./vote.js');

    const mockVotes = [
      { voteType: 'UP' },
      { voteType: 'UP' },
      { voteType: 'DOWN' },
      { voteType: 'BLAME' },
    ];

    const mockPrisma = {
      documentVote: {
        findMany: vi.fn().mockResolvedValue(mockVotes),
      },
    };

    const result = await getVoteCount(10, { prisma: mockPrisma as never });

    expect(result.up).toBe(2);
    expect(result.down).toBe(1);
    expect(result.blame).toBe(1);
  });
});
