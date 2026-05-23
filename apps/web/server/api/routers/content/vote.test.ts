/**
 * Specification tests for content.vote tRPC router — SPEC-CONTENT-001 Slice D.
 *
 * CV-1: content.vote.toggle UP → row 생성.
 * CV-2: content.vote.toggle 동일 UP 재호출 → row 삭제 (toggle off).
 * CV-3: content.vote.toggle 미인증 → UNAUTHORIZED.
 * CV-4: content.vote.count → { up, down, blame }.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockVoteDocument = vi.fn();
const mockGetVoteCount = vi.fn();

vi.mock('@rhymix-ts/board', () => ({
  voteDocument: (...args: unknown[]) => mockVoteDocument(...args),
  getVoteCount: (...args: unknown[]) => mockGetVoteCount(...args),
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
};

const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};
const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('content.vote tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CV-1: toggle UP → voteDocument 호출, row 생성 결과 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentVoteRouter } = await import('./vote');

    mockVoteDocument.mockResolvedValue({
      action: 'created',
      vote: { id: 1, documentId: 10, voterId: '42', voteType: 'UP' },
      newCounts: { voted: 1, blamed: 0 },
    });

    const caller = createCallerFactory(contentVoteRouter)(memberCtx as never);
    const result = await caller.toggle({ documentId: 10, voteType: 'UP' });

    expect(mockVoteDocument).toHaveBeenCalledOnce();
    expect(mockVoteDocument).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 10, voterId: '42', voteType: 'UP' }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
    expect(result.action).toBe('created');
  });

  it('CV-2: toggle 동일 UP 재호출 → toggle off (action: removed)', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentVoteRouter } = await import('./vote');

    mockVoteDocument.mockResolvedValue({
      action: 'removed',
      vote: null,
      newCounts: { voted: 0, blamed: 0 },
    });

    const caller = createCallerFactory(contentVoteRouter)(memberCtx as never);
    const result = await caller.toggle({ documentId: 10, voteType: 'UP' });

    expect(result.action).toBe('removed');
    expect(result.vote).toBeNull();
  });

  it('CV-3: toggle 미인증 → UNAUTHORIZED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentVoteRouter } = await import('./vote');

    const caller = createCallerFactory(contentVoteRouter)(guestCtx as never);

    await expect(
      caller.toggle({ documentId: 10, voteType: 'UP' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(mockVoteDocument).not.toHaveBeenCalled();
  });

  it('CV-4: count → getVoteCount 호출, { up, down, blame } 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentVoteRouter } = await import('./vote');

    mockGetVoteCount.mockResolvedValue({ up: 3, down: 1, blame: 0 });

    const caller = createCallerFactory(contentVoteRouter)(guestCtx as never);
    const result = await caller.count({ documentId: 10 });

    expect(mockGetVoteCount).toHaveBeenCalledWith(10, expect.objectContaining({ prisma: mockPrisma }));
    expect(result).toEqual({ up: 3, down: 1, blame: 0 });
  });
});
