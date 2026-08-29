/**
 * admin.test.ts — SPEC-ADMIN-002 Slice 1E
 *
 * Cross-board document management tests.
 * TDD RED-GREEN-REFACTOR cycle.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listDocumentsAcrossAllBoards,
  bulkUpdateDocuments,
} from './admin';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma client
function createMockPrisma() {
  let documents: any[] = [
    {
      id: 1,
      boardId: 1,
      authorId: 10,
      status: 'PUBLIC',
      title: 'Test Document 1',
      content: 'Content 1',
      blamedCount: 0,
      ipAddress: '127.0.0.1',
      board: { id: 1, name: '자유게시판', moduleInstance: { mid: 'freeboard', moduleCode: 'board' } },
    },
    {
      id: 2,
      boardId: 1,
      authorId: 11,
      status: 'SECRET',
      title: 'Test Document 2',
      content: 'Content 2',
      blamedCount: 0,
      ipAddress: '10.0.0.5',
      board: { id: 1, name: '자유게시판', moduleInstance: { mid: 'freeboard', moduleCode: 'board' } },
    },
    {
      id: 3,
      boardId: 2,
      authorId: 10,
      status: 'TEMP',
      title: 'Draft Document',
      content: 'Draft content',
      blamedCount: 0,
      ipAddress: '127.0.0.1',
      board: { id: 2, name: '공지사항', moduleInstance: { mid: 'notice', moduleCode: 'board' } },
    },
  ];

  let adminLogs: any[] = [];

  return {
    documents,
    adminLogs,
    document: {
      findMany: async ({ where, take }: any) => {
        let filtered = documents;

        // Filter by boardId
        if (where?.boardId !== undefined) {
          filtered = filtered.filter((d: any) => d.boardId === where.boardId);
        }

        // Filter by authorId
        if (where?.authorId !== undefined) {
          filtered = filtered.filter((d: any) => d.authorId === where.authorId);
        }

        // Filter by status
        if (where?.status !== undefined) {
          filtered = filtered.filter((d: any) => d.status === where.status);
        }

        // Filter by blamedCount (DECLARED status)
        if (where?.blamedCount?.gt !== undefined) {
          filtered = filtered.filter((d: any) => d.blamedCount > 0);
        }

        // Filter by ipAddress (REQ-CPAR-014a)
        if (where?.ipAddress !== undefined) {
          filtered = filtered.filter((d: any) => d.ipAddress === where.ipAddress);
        }

        // Search filter
        if (where?.OR) {
          filtered = filtered.filter((d: any) =>
            d.title.includes(where.OR[0].title.contains) || d.content.includes(where.OR[1].content.contains)
          );
        }

        // Cursor pagination
        if (where?.id?.gt) {
          filtered = filtered.filter((d: any) => d.id > where.id.gt);
        }

        const result = filtered.slice(0, take);
        return result;
      },
      count: async ({ where }: any) => {
        let filtered = documents;

        if (where?.boardId !== undefined) {
          filtered = filtered.filter((d: any) => d.boardId === where.boardId);
        }
        if (where?.authorId !== undefined) {
          filtered = filtered.filter((d: any) => d.authorId === where.authorId);
        }
        if (where?.status !== undefined) {
          filtered = filtered.filter((d: any) => d.status === where.status);
        }
        if (where?.blamedCount?.gt !== undefined) {
          filtered = filtered.filter((d: any) => d.blamedCount > 0);
        }
        if (where?.ipAddress !== undefined) {
          filtered = filtered.filter((d: any) => d.ipAddress === where.ipAddress);
        }

        return filtered.length;
      },
      findUnique: async ({ where }: any) => {
        return documents.find((d: any) => d.id === where.id);
      },
      update: async ({ where, data }: any) => {
        const idx = documents.findIndex((d: any) => d.id === where.id);
        if (idx !== -1) {
          documents[idx] = { ...documents[idx], ...data };
          return documents[idx];
        }
        throw new Error('Document not found');
      },
      delete: async ({ where }: any) => {
        const idx = documents.findIndex((d: any) => d.id === where.id);
        if (idx !== -1) {
          documents.splice(idx, 1);
          return where.id;
        }
        throw new Error('Document not found');
      },
    },
    trash: {
      upsert: async ({ create }: any) => {
        return { id: 1, ...create };
      },
    },
    adminLog: {
      create: async ({ data }: any) => {
        const log = { id: BigInt(adminLogs.length + 1), ...data };
        adminLogs.push(log);
        return log;
      },
    },
    $transaction: async (callback: any) => {
      return callback({
        document: {
          findUnique: async ({ where }: any) => {
            return documents.find((d: any) => d.id === where.id);
          },
          update: async ({ where, data }: any) => {
            const idx = documents.findIndex((d: any) => d.id === where.id);
            if (idx !== -1) {
              documents[idx] = { ...documents[idx], ...data };
              return documents[idx];
            }
            throw new Error('Document not found');
          },
          delete: async ({ where }: any) => {
            const idx = documents.findIndex((d: any) => d.id === where.id);
            if (idx !== -1) {
              documents.splice(idx, 1);
              return where.id;
            }
            throw new Error('Document not found');
          },
        },
        trash: {
          upsert: async ({ create }: any) => {
            return { id: 1, ...create };
          },
        },
        adminLog: {
          create: async ({ data }: any) => {
            const log = { id: BigInt(adminLogs.length + 1), ...data };
            adminLogs.push(log);
            return log;
          },
        },
      });
    },
  } as unknown as PrismaClient;
}

describe('listDocumentsAcrossAllBoards', () => {
  let mockPrisma: PrismaClient;
  let adminActor = { userId: 1, userGroupSrl: 1, isAdmin: true };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return all documents when no filters provided', async () => {
    const result = await listDocumentsAcrossAllBoards(
      { limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('should filter by moduleInstanceId', async () => {
    const result = await listDocumentsAcrossAllBoards(
      { moduleInstanceId: 1, limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.every((d: any) => d.boardId === 1)).toBe(true);
  });

  it('should filter by authorId', async () => {
    const result = await listDocumentsAcrossAllBoards(
      { authorId: 10, limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.every((d: any) => d.authorId === 10)).toBe(true);
  });

  it('should filter by status', async () => {
    const result = await listDocumentsAcrossAllBoards(
      { status: 'PUBLIC', limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe('PUBLIC');
  });

  it('should filter by ip address (REQ-CPAR-014a)', async () => {
    const result = await listDocumentsAcrossAllBoards(
      { ip: '127.0.0.1', limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.every((d: any) => d.ipAddress === '127.0.0.1')).toBe(true);
  });

  it('should search in title and content', async () => {
    const result = await listDocumentsAcrossAllBoards(
      { search: 'Test', limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should paginate with cursor', async () => {
    const result1 = await listDocumentsAcrossAllBoards(
      { limit: 2, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result1.items).toHaveLength(2);
    expect(result1.nextCursor).toBeTruthy();

    const result2 = await listDocumentsAcrossAllBoards(
      { limit: 2, cursor: result1.nextCursor!, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result2.items).toHaveLength(1);
    expect(result2.nextCursor).toBeNull();
  });

  it('should throw error for non-admin', async () => {
    const nonAdminActor = { userId: 2, userGroupSrl: 2, isAdmin: false };

    await expect(
      listDocumentsAcrossAllBoards(
        { limit: 10, actor: nonAdminActor },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow();
  });
});

describe('bulkUpdateDocuments', () => {
  let mockPrisma: PrismaClient;
  let adminActor = { userId: 1, userGroupSrl: 1, isAdmin: true };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should delete multiple documents', async () => {
    const result = await bulkUpdateDocuments(
      {
        documentIds: [1, 2],
        action: 'delete',
        actor: adminActor,
      },
      { prisma: mockPrisma },
    );

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.adminLogIds).toHaveLength(2);
  });

  it('should move multiple documents to trash', async () => {
    const result = await bulkUpdateDocuments(
      {
        documentIds: [1],
        action: 'trash',
        actor: adminActor,
      },
      { prisma: mockPrisma },
    );

    expect(result.success).toBe(1);
    expect(result.adminLogIds).toHaveLength(1);
  });

  it('should move documents to another board', async () => {
    const result = await bulkUpdateDocuments(
      {
        documentIds: [1],
        action: 'move',
        targetBoardId: 2,
        actor: adminActor,
      },
      { prisma: mockPrisma },
    );

    expect(result.success).toBe(1);
  });

  it('should change document status', async () => {
    const result = await bulkUpdateDocuments(
      {
        documentIds: [1],
        action: 'status',
        targetStatus: 'SECRET',
        actor: adminActor,
      },
      { prisma: mockPrisma },
    );

    expect(result.success).toBe(1);
  });

  it('should handle empty documentIds array', async () => {
    const result = await bulkUpdateDocuments(
      {
        documentIds: [],
        action: 'delete',
        actor: adminActor,
      },
      { prisma: mockPrisma },
    );

    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('should throw error for non-admin', async () => {
    const nonAdminActor = { userId: 2, userGroupSrl: 2, isAdmin: false };

    await expect(
      bulkUpdateDocuments(
        {
          documentIds: [1],
          action: 'delete',
          actor: nonAdminActor,
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow();
  });
});
