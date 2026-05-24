/**
 * Specification tests for content.extraKeys tRPC router — SPEC-CONTENT-001 Slice F.
 *
 * C-1: 익명 + content.extraKeys.list(boardId) → row[] 정상 반환.
 * C-2: 존재하지 않는 boardId → 빈 배열 (에러 X).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockListExtraKeys = vi.fn();

vi.mock('@rhymix-ts/board', () => ({
  listExtraKeys: (...args: unknown[]) => mockListExtraKeys(...args),
}));

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('content.extraKeys tRPC router (Slice F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // C-1: 익명 + list → 정상 반환
  // ---------------------------------------------------------------------------

  it('C-1: 익명 + content.extraKeys.list(boardId) → 키 목록 반환', async () => {
    const fakeKeys = [
      { id: 1, boardId: 10, varIdx: 0, varName: 'price', varType: 'number', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
      { id: 2, boardId: 10, varIdx: 1, varName: 'eventDate', varType: 'date', varIsRequired: false, varSearch: false, varSort: false, varOptions: null, langCode: 'ko' },
    ];
    mockListExtraKeys.mockResolvedValue(fakeKeys);

    const { contentExtraKeysRouter } = await import('./extra-keys');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentExtraKeysRouter)(guestCtx as any);

    const result = await caller.list({ boardId: 10 });
    expect(mockListExtraKeys).toHaveBeenCalledOnce();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ varName: 'price' });
  });

  // ---------------------------------------------------------------------------
  // C-2: 존재하지 않는 boardId → 빈 배열
  // ---------------------------------------------------------------------------

  it('C-2: 존재하지 않는 boardId → 빈 배열 반환 (에러 X)', async () => {
    mockListExtraKeys.mockResolvedValue([]);

    const { contentExtraKeysRouter } = await import('./extra-keys');
    const { createCallerFactory } = await import('../../trpc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(contentExtraKeysRouter)(guestCtx as any);

    const result = await caller.list({ boardId: 99999 });
    expect(result).toEqual([]);
  });
});
