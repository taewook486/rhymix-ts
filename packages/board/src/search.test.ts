/**
 * search.test.ts — SPEC-CONTENT-001 Slice C (T-002)
 *
 * S-1 ~ S-10: searchDocuments, searchTags 도메인 함수 검증.
 *
 * 구현 참고:
 * - searchDocuments 는 $queryRawUnsafe 를 사용 (동적 SQL 빌더)
 * - searchTags 는 $queryRaw tagged template 을 사용
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// searchDocuments (S-1 ~ S-7, S-10)
// ---------------------------------------------------------------------------

describe('searchDocuments', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('S-1: query 없이 boardId 만 → 전체 문서 반환 (삭제된 것 제외)', async () => {
    const { searchDocuments } = await import('./search.js');

    const fakeDocs = [
      { id: 1, boardId: 5, title: '글1', listOrder: BigInt(1000), count: BigInt(2) },
      { id: 2, boardId: 5, title: '글2', listOrder: BigInt(999), count: BigInt(2) },
    ];

    const mockQueryRawUnsafe = vi.fn().mockResolvedValue(fakeDocs);
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await searchDocuments({ boardId: 5, limit: 20 }, { prisma: mockPrisma as any });

    expect(result.items).toHaveLength(2);
    expect(mockQueryRawUnsafe).toHaveBeenCalledOnce();
  });

  it('S-2: FTS query 검색 — SQL 에 plainto_tsquery 포함', async () => {
    const { searchDocuments } = await import('./search.js');

    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await searchDocuments({ boardId: 5, query: 'typescript', limit: 20 }, { prisma: mockPrisma as any });

    expect(capturedSql.toLowerCase()).toContain('plainto_tsquery');
    expect(capturedSql.toLowerCase()).toContain('search_vector');
  });

  it('S-3: categoryId 필터 — SQL 에 category_id 조건 포함', async () => {
    const { searchDocuments } = await import('./search.js');

    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await searchDocuments({ boardId: 5, categoryId: 3, limit: 20 }, { prisma: mockPrisma as any });

    expect(capturedSql.toLowerCase()).toContain('category_id');
  });

  it('S-4: tags 필터 — SQL 에 tags 조건 포함', async () => {
    const { searchDocuments } = await import('./search.js');

    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await searchDocuments({ boardId: 5, tags: ['typescript'], limit: 20 }, { prisma: mockPrisma as any });

    expect(capturedSql.toLowerCase()).toContain('tags');
  });

  it('S-5: dateFrom/dateTo 범위 필터 — SQL 에 regdate 조건 포함', async () => {
    const { searchDocuments } = await import('./search.js');

    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    await searchDocuments(
      { boardId: 5, dateFrom: new Date('2026-01-01'), dateTo: new Date('2026-12-31'), limit: 20 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(capturedSql.toLowerCase()).toContain('regdate');
  });

  it('S-6: minVoted 필터 — SQL 에 voted_count 조건 포함', async () => {
    const { searchDocuments } = await import('./search.js');

    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await searchDocuments({ boardId: 5, minVoted: 5, limit: 20 }, { prisma: mockPrisma as any });

    expect(capturedSql.toLowerCase()).toContain('voted_count');
  });

  it('S-7: cursor pagination — nextCursor 디코딩 후 다음 페이지 정확히 반환', async () => {
    const { searchDocuments, encodeCursor } = await import('./search.js');

    const cursor = encodeCursor(BigInt(500), 10);
    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await searchDocuments({ boardId: 5, cursor, limit: 10 }, { prisma: mockPrisma as any });

    // cursor 조건이 SQL 에 들어가야 함
    expect(capturedSql.toLowerCase()).toContain('list_order');
  });

  it('S-10: sort update_order — SQL 에 update_order 정렬 포함', async () => {
    const { searchDocuments } = await import('./search.js');

    let capturedSql = '';
    const mockQueryRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      capturedSql = sql;
      return Promise.resolve([]);
    });
    const mockPrisma = { $queryRawUnsafe: mockQueryRawUnsafe };

    await searchDocuments(
      { boardId: 5, sort: 'update_order', sortDir: 'desc', limit: 20 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { prisma: mockPrisma as any },
    );

    expect(capturedSql.toLowerCase()).toContain('update_order');
  });
});

// ---------------------------------------------------------------------------
// searchTags (S-8, S-9)
// ---------------------------------------------------------------------------

describe('searchTags', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('S-8: prefix "type" → ["typescript", "typeorm"] 반환', async () => {
    const { searchTags } = await import('./search.js');

    const mockQueryRaw = vi.fn().mockResolvedValue([
      { tag: 'typescript' },
      { tag: 'typeorm' },
    ]);
    const mockPrisma = { $queryRaw: mockQueryRaw };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await searchTags({ boardId: 5, prefix: 'type' }, { prisma: mockPrisma as any });

    expect(result).toEqual(['typescript', 'typeorm']);
    expect(mockQueryRaw).toHaveBeenCalledOnce();
  });

  it('S-9: 게시판에 태그 없으면 빈 배열 반환', async () => {
    const { searchTags } = await import('./search.js');

    const mockQueryRaw = vi.fn().mockResolvedValue([]);
    const mockPrisma = { $queryRaw: mockQueryRaw };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await searchTags({ boardId: 5, prefix: 'none' }, { prisma: mockPrisma as any });

    expect(result).toEqual([]);
  });
});
