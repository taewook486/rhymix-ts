/**
 * content/search.test.ts — SPEC-CONTENT-001 Slice C
 *
 * CS-1 ~ CS-4: content.search.documents / content.search.tags tRPC 라우터 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

// Board domain mock variables
const mockSearchDocuments = vi.fn();
const mockSearchTags = vi.fn();

// NextAuth + DB mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// Board domain mock
vi.mock('@rhymix-ts/board', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rhymix-ts/board')>();
  return {
    ...actual,
    searchDocuments: (...args: unknown[]) => mockSearchDocuments(...args),
    searchTags: (...args: unknown[]) => mockSearchTags(...args),
  };
});

// Create complete mock Prisma client
const mockPrisma = createMockPrismaClient();
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);

const publicCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('content.search tRPC router (Slice C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CS-1: content.search.documents — query + boardId → 결과 반환', async () => {
    const fakeResult = {
      items: [{ id: 1, title: 'TypeScript 가이드' }],
      nextCursor: null,
      total: 1,
    };
    mockSearchDocuments.mockResolvedValueOnce(fakeResult as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.documents({ boardId: 5, query: 'TypeScript', limit: 20 });

    expect(mockSearchDocuments).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('CS-2: content.search.documents — cursor pagination 연속 호출', async () => {
    const fakeCursor = 'dGVzdA'; // base64url
    const firstPage = { items: [{ id: 2 }, { id: 1 }], nextCursor: fakeCursor, total: 5 };
    const secondPage = { items: [{ id: 3 }], nextCursor: null, total: 5 };

    mockSearchDocuments
      .mockResolvedValueOnce(firstPage as never)
      .mockResolvedValueOnce(secondPage as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const page1 = await caller.documents({ boardId: 5, limit: 2 });
    expect(page1.nextCursor).toBe(fakeCursor);

    const page2 = await caller.documents({ boardId: 5, cursor: fakeCursor, limit: 2 });
    expect(page2.nextCursor).toBeNull();
    expect(mockSearchDocuments).toHaveBeenCalledTimes(2);
  });

  it('CS-3: content.search.documents — 없는 boardId → { items: [], nextCursor: null, total: 0 }', async () => {
    mockSearchDocuments.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      total: 0,
    } as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.documents({ boardId: 99999, limit: 20 });

    expect(result).toMatchObject({ items: [], nextCursor: null, total: 0 });
  });

  it('CS-4: content.search.tags — prefix 매칭', async () => {
    mockSearchTags.mockResolvedValueOnce(['typescript', 'typeorm'] as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.tags({ boardId: 5, prefix: 'type' });

    expect(mockSearchTags).toHaveBeenCalledWith({ boardId: 5, prefix: 'type' }, expect.anything());
    expect(result).toEqual(['typescript', 'typeorm']);
  });
});
