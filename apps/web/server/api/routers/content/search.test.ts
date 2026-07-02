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

// Module instances mock (shared across tests)
const mockModuleInstances = [
  { id: 101, mid: 'freeboard' },
  { id: 102, mid: 'qa' },
];

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

// Board domain mock — importOriginal 없이 필요한 함수만 제공 (전체 패키지 로드 방지)
vi.mock('@rhymix-ts/board', () => ({
  searchDocuments: (...args: unknown[]) => mockSearchDocuments(...args),
  searchTags: (...args: unknown[]) => mockSearchTags(...args),
}));

// Create complete mock Prisma client
const mockPrisma = createMockPrismaClient();
mockPrisma.siteSetting.findFirst.mockResolvedValue(null);
// @ts-ignore - Mock implementation
mockPrisma.moduleInstance.findFirst.mockImplementation((args?: any) => {
  if (!args?.where?.mid) return Promise.resolve(null);
  const instance = mockModuleInstances.find((mi) => mi.mid === args.where.mid);
  return Promise.resolve(instance || null);
});

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

// ---------------------------------------------------------------------------
// SPEC-SEARCH-001: Integrated cross-board search tests (S-INT-1 ~ S-INT-10)
// ---------------------------------------------------------------------------

describe('content.search.integrated — SPEC-SEARCH-001', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBoards = [
    { id: 1, name: '자유게시판', moduleInstance: { mid: 'freeboard' } },
    { id: 2, name: 'Q&A게시판', moduleInstance: { mid: 'qa' } },
  ];

  it('S-INT-1: cross-board search returns results from multiple boards', async () => {
    const mockResults = [
      {
        id: 1,
        boardId: 1,
        title: '타입스크립트 튜토리얼',
        content: '타입스크립트 기초를 배워봅시다',
        authorId: 1,
        nickName: 'user1',
        regdate: new Date('2026-01-01'),
      },
      {
        id: 2,
        boardId: 2,
        title: 'TS 도움 needed',
        content: '타입스크립트 질문입니다',
        authorId: 2,
        nickName: 'user2',
        regdate: new Date('2026-01-02'),
      },
    ];

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(
      mockResults.map((r) => ({ ...r, rank: 0.8, totalCount: BigInt(2) })) as never,
    );
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.integrated({ q: '타입스크립트', page: 1 });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledOnce();
    expect(result.results).toHaveLength(2);
    expect(result.totalCount).toBe(2);
  });

  it('S-INT-2: mid filter restricts search to specific board', async () => {
    const mockResults = [
      {
        id: 1,
        boardId: 1,
        title: '타입스크립트 튜토리얼',
        content: '타입스크립트 기초',
        authorId: 1,
        nickName: 'user1',
        regdate: new Date('2026-01-01'),
      },
    ];

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(
      mockResults.map((r) => ({ ...r, rank: 0.8, totalCount: BigInt(1) })) as never,
    );
    mockPrisma.board.findFirst.mockResolvedValueOnce({ id: 1 } as never);
    mockPrisma.board.findMany.mockResolvedValueOnce([mockBoards[0]] as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.integrated({ q: '타입스크립트', mid: 'freeboard', page: 1 });

    expect(mockPrisma.board.findFirst).toHaveBeenCalledWith({
      where: { moduleInstanceId: 101 },
      select: { id: true },
    });
    expect(result.results).toHaveLength(1);
  });

  it('S-INT-3: field=title searches using search_vector', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    await caller.integrated({ q: '타입스크립트', field: 'title', page: 1 });

    const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0] as [string];
    const sql = sqlCall[0];
    // Should use search_vector for FTS
    expect(sql.toLowerCase()).toContain('search_vector');
  });

  it('S-INT-4: field=author searches by nickname', async () => {
    const mockResults = [
      {
        id: 1,
        boardId: 1,
        title: 'test',
        content: 'test',
        authorId: 1,
        nickName: 'user1',
        regdate: new Date('2026-01-01'),
      },
    ];

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(
      mockResults.map((r) => ({ ...r, rank: 0, totalCount: BigInt(1) })) as never,
    );
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.integrated({ q: 'user1', field: 'author', page: 1 });

    const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0] as [string];
    const sql = sqlCall[0];
    expect(sql.toLowerCase()).toContain('nickname');
    expect(result.results).toHaveLength(1);
  });

  it('S-INT-5: sort=relevance orders by ts_rank', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    await caller.integrated({ q: '타입스크립트', sort: 'relevance', page: 1 });

    const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0] as [string];
    const sql = sqlCall[0];
    expect(sql.toLowerCase()).toContain('ts_rank');
    expect(sql.toLowerCase()).toContain('desc');
  });

  it('S-INT-6: sort=latest orders by regdate', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    await caller.integrated({ q: '타입스크립트', sort: 'latest', page: 1 });

    const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0] as [string];
    const sql = sqlCall[0];
    expect(sql.toLowerCase()).toContain('regdate');
    expect(sql.toLowerCase()).toContain('desc');
  });

  it('S-INT-7: pagination returns 20 results per page', async () => {
    const mockResults = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      boardId: 1,
      title: `title ${i}`,
      content: `content ${i}`,
      authorId: 1,
      nickName: 'user1',
      regdate: new Date('2026-01-01'),
    }));

    mockPrisma.$queryRawUnsafe.mockResolvedValue(
      mockResults.map((r) => ({ ...r, rank: 0.8, totalCount: BigInt(50) })) as never,
    );
    mockPrisma.board.findMany.mockResolvedValue(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.integrated({ q: 'test', page: 1 });

    expect(result.results).toHaveLength(20);
    expect(result.totalCount).toBe(50);
  });

  it('S-INT-8: page=2 returns offset results', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    await caller.integrated({ q: 'test', page: 2 });

    const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0] as [string];
    const sql = sqlCall[0];
    expect(sql).toContain('OFFSET 20');
  });

  it('S-INT-9: empty results returns empty array with zero count', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.board.findMany.mockResolvedValueOnce(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.integrated({ q: 'nonexistent', page: 1 });

    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('S-INT-10: results include board information', async () => {
    const mockResults = [
      {
        id: 1,
        boardId: 1,
        title: 'title1',
        content: 'content1',
        authorId: 1,
        nickName: 'user1',
        regdate: new Date('2026-01-01'),
      },
      {
        id: 2,
        boardId: 2,
        title: 'title2',
        content: 'content2',
        authorId: 2,
        nickName: 'user2',
        regdate: new Date('2026-01-02'),
      },
    ];

    mockPrisma.$queryRawUnsafe.mockResolvedValue(
      mockResults.map((r) => ({ ...r, rank: 0.8, totalCount: BigInt(2) })) as never,
    );
    mockPrisma.board.findMany.mockResolvedValue(mockBoards as never);

    const { contentSearchRouter } = await import('./search');
    const { createCallerFactory } = await import('../../trpc');

    const createCaller = createCallerFactory(contentSearchRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(publicCtx as any);

    const result = await caller.integrated({ q: 'test', page: 1 });

    expect(result.results).toHaveLength(2);
    // Results should include board info
    expect(result.results[0]).toBeDefined();
    expect(result.results[0]!.boardName).toBe('자유게시판');
  });
});
