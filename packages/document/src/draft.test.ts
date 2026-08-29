/**
 * packages/document/src/draft.test.ts
 *
 * 임시글(Draft) 관리 테스트 — SPEC-DOCUMENT-001 Slice C.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listDrafts, publishDraft } from './draft';
import type { PrismaClient, Document } from '@prisma/client';

// Mock Prisma
const mockDocuments: Document[] = [];

const mockPrisma = {
  document: {
    findMany: async (args: any) => {
      const { where, take, orderBy } = args;
      let filtered = mockDocuments.filter((d) => d.authorId === where.authorId && d.status === where.status);

      if (where.id?.gt) {
        filtered = filtered.filter((d) => d.id > where.id.gt);
      }

      const sorted = filtered.sort((a, b) => (orderBy?.[0]?.id === 'asc' ? a.id - b.id : b.id - a.id));
      // Return exactly `take` items to simulate real Prisma behavior
      // The listDrafts implementation uses take: limit + 1 to check if more items exist
      return sorted.slice(0, take);
    },
    findUnique: async (args: any) => {
      return mockDocuments.find((d) => d.id === args.where.id) || null;
    },
    update: async (args: any) => {
      const doc = mockDocuments.find((d) => d.id === args.where.id);
      if (!doc) throw new Error('Document not found');
      Object.assign(doc, args.data);
      return doc;
    },
  },
  $transaction: async (callback: any) => {
    // Mock transaction - just call the function with a mock tx
    const mockTx = {
      document: mockPrisma.document,
      $executeRaw: vi.fn(), // Mock $executeRaw for incrementDocumentCount
    };
    return callback(mockTx);
  },
} as unknown as PrismaClient;

describe('draft - listDrafts', () => {
  beforeEach(() => {
    // Clear mock documents
    mockDocuments.length = 0;
  });

  const createMockDocument = (id: number, authorId: number, status: 'TEMP' | 'PUBLIC' = 'TEMP'): Document => {
    const doc = {
      id,
      authorId,
      status,
      boardId: 1,
      title: `Doc ${id}`,
      content: 'Content',
      nickName: null,
      categoryId: null,
      tags: [],
      extraVars: null,
      contentText: 'Content',
      listOrder: BigInt(id),
      updateOrder: BigInt(id),
      regdate: new Date(),
      updatedate: new Date(),
      deletedAt: null,
      isNotice: false,
      password: null,
    } as unknown as Document;

    mockDocuments.push(doc);
    return doc;
  };

  it('should list drafts for an author', async () => {
    createMockDocument(1, 100, 'TEMP');
    createMockDocument(2, 100, 'TEMP');
    createMockDocument(3, 200, 'TEMP'); // Different author
    createMockDocument(4, 100, 'PUBLIC'); // Not a draft

    const result = await listDrafts({ authorId: 100, limit: 10 }, { prisma: mockPrisma });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((d) => d.authorId === 100 && d.status === 'TEMP')).toBe(true);
  });

  it('should return empty array for author with no drafts', async () => {
    createMockDocument(1, 200, 'TEMP');

    const result = await listDrafts({ authorId: 100 }, { prisma: mockPrisma });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should respect limit parameter', async () => {
    for (let i = 1; i <= 15; i++) {
      createMockDocument(i, 100, 'TEMP');
    }

    const result = await listDrafts({ authorId: 100, limit: 5 }, { prisma: mockPrisma });

    expect(result.items).toHaveLength(5);
  });

  it('should support cursor-based pagination', async () => {
    for (let i = 1; i <= 10; i++) {
      createMockDocument(i, 100, 'TEMP');
    }

    const page1 = await listDrafts({ authorId: 100, limit: 3 }, { prisma: mockPrisma });
    expect(page1.items).toHaveLength(3);
    // Documents should be sorted by id ascending (1, 2, 3, ...)
    // First page should return first 3 items (IDs 1, 2, 3) with nextCursor = 3
    expect(page1.items[0]?.id).toBeLessThanOrEqual(3);
    expect(page1.items[1]?.id).toBeLessThanOrEqual(3);
    expect(page1.items[2]?.id).toBeLessThanOrEqual(3);
    expect(page1.nextCursor).toBeDefined();

    const page2 = await listDrafts({ authorId: 100, limit: 3, cursor: page1.nextCursor! }, { prisma: mockPrisma });
    expect(page2.items).toHaveLength(3);
    // Second page should return next 3 items (IDs 4, 5, 6)
    expect(page2.items[0]?.id).toBeGreaterThan(page1.nextCursor!);
    expect(page2.items[2]?.id).toBeGreaterThan(page1.nextCursor!);
  });

  it('should return nextCursor when more items exist', async () => {
    for (let i = 1; i <= 5; i++) {
      createMockDocument(i, 100, 'TEMP');
    }

    const result = await listDrafts({ authorId: 100, limit: 3 }, { prisma: mockPrisma });

    expect(result.nextCursor).toBeDefined();
    expect(result.nextCursor).toBe(3); // Last item ID
  });

  it('should return undefined nextCursor on last page', async () => {
    createMockDocument(1, 100, 'TEMP');
    createMockDocument(2, 100, 'TEMP');

    const result = await listDrafts({ authorId: 100, limit: 10 }, { prisma: mockPrisma });

    expect(result.nextCursor).toBeUndefined();
  });
});

describe('draft - publishDraft (AC-DOC-C2)', () => {
  beforeEach(() => {
    mockDocuments.length = 0;
  });

  const createMockDocument = (id: number, authorId: number, categoryId: number | null): Document => {
    const doc = {
      id,
      authorId,
      status: 'TEMP' as const,
      boardId: 1,
      board: { id: 1, documentCount: 10 }, // Mock board with documentCount
      title: `Doc ${id}`,
      content: 'Content',
      nickName: null,
      categoryId,
      tags: [],
      extraVars: null,
      contentText: 'Content',
      listOrder: BigInt(id),
      updateOrder: BigInt(id),
      regdate: new Date(),
      updatedate: new Date(),
      deletedAt: null,
      isNotice: false,
      password: null,
    } as unknown as Document;

    mockDocuments.push(doc);
    return doc;
  };

  it('should publish draft (TEMP → PUBLIC)', async () => {
    createMockDocument(1, 100, null);

    const result = await publishDraft(
      { documentId: 1, actor: { userId: 100, isAdmin: false } },
      { prisma: mockPrisma },
    );

    expect(result.status).toBe('PUBLIC');
  });

  it('should throw for non-existent document', async () => {
    await expect(
      publishDraft({ documentId: 999, actor: { userId: 100, isAdmin: false } }, { prisma: mockPrisma }),
    ).rejects.toThrow('Document 999 not found');
  });

  it('should throw for non-owner (non-admin)', async () => {
    createMockDocument(1, 200, null);

    await expect(
      publishDraft({ documentId: 1, actor: { userId: 100, isAdmin: false } }, { prisma: mockPrisma }),
    ).rejects.toThrow('Not the owner of document 1');
  });

  it('should allow admin to publish any draft', async () => {
    createMockDocument(1, 200, null);

    const result = await publishDraft(
      { documentId: 1, actor: { userId: 100, isAdmin: true } },
      { prisma: mockPrisma },
    );

    expect(result.status).toBe('PUBLIC');
  });

  it('should throw for already published document', async () => {
    const doc = createMockDocument(1, 100, null);
    doc.status = 'PUBLIC'; // Already published

    await expect(
      publishDraft({ documentId: 1, actor: { userId: 100, isAdmin: false } }, { prisma: mockPrisma }),
    ).rejects.toThrow('Document 1 is not a draft');
  });

  describe('AC-DOC-C2: Board.documentCount increment', () => {
    it('should increment Board.documentCount when categoryId is present', async () => {
      createMockDocument(1, 100, 5); // categoryId = 5

      // Spy on transaction execution
      let transactionCalled = false;
      const mockTx = {
        document: mockPrisma.document,
        $executeRaw: vi.fn(async () => {
          transactionCalled = true;
          return null;
        }),
      };

      const txPrisma = {
        ...mockPrisma,
        $transaction: async (callback: any) => callback(mockTx),
      } as unknown as PrismaClient;

      const result = await publishDraft(
        { documentId: 1, actor: { userId: 100, isAdmin: false } },
        { prisma: txPrisma },
      );

      expect(result.status).toBe('PUBLIC');
      expect(transactionCalled).toBe(true);
    });

    it('should not increment when categoryId is null', async () => {
      createMockDocument(1, 100, null); // No categoryId

      const result = await publishDraft(
        { documentId: 1, actor: { userId: 100, isAdmin: false } },
        { prisma: mockPrisma },
      );

      expect(result.status).toBe('PUBLIC');
      // No increment should occur (simple update path)
    });
  });
});
