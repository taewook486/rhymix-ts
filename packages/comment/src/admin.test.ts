/**
 * admin.test.ts — SPEC-ADMIN-002 Slice 1E
 *
 * Cross-board comment management tests.
 * TDD RED-GREEN-REFACTOR cycle.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCommentsAcrossAllBoards,
  bulkDeleteComments,
} from './admin';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma client
function createMockPrisma() {
  let comments: any[] = [
    {
      id: 1,
      documentId: 100,
      boardId: 1,
      authorId: 10,
      content: 'First comment',
      parentId: null,
      isSecret: false,
      document: { id: 100, title: 'Test Document', boardId: 1 },
    },
    {
      id: 2,
      documentId: 100,
      boardId: 1,
      authorId: 11,
      content: 'Second comment',
      parentId: 1,
      isSecret: true,
      document: { id: 100, title: 'Test Document', boardId: 1 },
    },
    {
      id: 3,
      documentId: 101,
      boardId: 2,
      authorId: 10,
      content: 'Another comment',
      parentId: null,
      isSecret: false,
      document: { id: 101, title: 'Another Document', boardId: 2 },
    },
  ];

  let adminLogs: any[] = [];

  return {
    comments,
    adminLogs,
    comment: {
      findMany: async ({ where, take }: any) => {
        let filtered = comments;

        // Filter by boardId
        if (where?.boardId !== undefined) {
          filtered = filtered.filter((c: any) => c.boardId === where.boardId);
        }

        // Filter by authorId
        if (where?.authorId !== undefined) {
          filtered = filtered.filter((c: any) => c.authorId === where.authorId);
        }

        // Search filter
        if (where?.content?.contains) {
          filtered = filtered.filter((c: any) =>
            c.content.includes(where.content.contains)
          );
        }

        // Filter by isSecret (REQ-CPAR-017)
        if (where?.isSecret !== undefined) {
          filtered = filtered.filter((c: any) => c.isSecret === where.isSecret);
        }

        // Cursor pagination
        if (where?.id?.gt) {
          filtered = filtered.filter((c: any) => c.id > where.id.gt);
        }

        const result = filtered.slice(0, take);
        return result;
      },
      count: async ({ where }: any) => {
        let filtered = comments;

        if (where?.boardId !== undefined) {
          filtered = filtered.filter((c: any) => c.boardId === where.boardId);
        }
        if (where?.authorId !== undefined) {
          filtered = filtered.filter((c: any) => c.authorId === where.authorId);
        }
        if (where?.content?.contains) {
          filtered = filtered.filter((c: any) => c.content.includes(where.content.contains));
        }
        if (where?.isSecret !== undefined) {
          filtered = filtered.filter((c: any) => c.isSecret === where.isSecret);
        }

        return filtered.length;
      },
      findUnique: async ({ where }: any) => {
        return comments.find((c: any) => c.id === where.id);
      },
      delete: async ({ where }: any) => {
        const idx = comments.findIndex((c: any) => c.id === where.id);
        if (idx !== -1) {
          comments.splice(idx, 1);
          return where.id;
        }
        throw new Error('Comment not found');
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
        comment: {
          findUnique: async ({ where }: any) => {
            return comments.find((c: any) => c.id === where.id);
          },
          delete: async ({ where }: any) => {
            const idx = comments.findIndex((c: any) => c.id === where.id);
            if (idx !== -1) {
              comments.splice(idx, 1);
              return where.id;
            }
            throw new Error('Comment not found');
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

describe('listCommentsAcrossAllBoards', () => {
  let mockPrisma: PrismaClient;
  let adminActor = { userId: 1, userGroupSrl: 1, isAdmin: true };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return all comments when no filters provided', async () => {
    const result = await listCommentsAcrossAllBoards(
      { limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('should filter by moduleInstanceId', async () => {
    const result = await listCommentsAcrossAllBoards(
      { moduleInstanceId: 1, limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.every((c: any) => c.boardId === 1)).toBe(true);
  });

  it('should filter by authorId', async () => {
    const result = await listCommentsAcrossAllBoards(
      { authorId: 10, limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.every((c: any) => c.authorId === 10)).toBe(true);
  });

  it('should filter by isSecret (REQ-CPAR-017)', async () => {
    const result = await listCommentsAcrossAllBoards(
      { isSecret: true, limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isSecret).toBe(true);
  });

  it('should search in comment content', async () => {
    const result = await listCommentsAcrossAllBoards(
      { search: 'First', limit: 10, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.content).toContain('First');
  });

  it('should paginate with cursor', async () => {
    const result1 = await listCommentsAcrossAllBoards(
      { limit: 2, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result1.items).toHaveLength(2);
    expect(result1.nextCursor).toBeTruthy();

    const result2 = await listCommentsAcrossAllBoards(
      { limit: 2, cursor: result1.nextCursor!, actor: adminActor },
      { prisma: mockPrisma },
    );

    expect(result2.items).toHaveLength(1);
    expect(result2.nextCursor).toBeNull();
  });

  it('should throw error for non-admin', async () => {
    const nonAdminActor = { userId: 2, userGroupSrl: 2, isAdmin: false };

    await expect(
      listCommentsAcrossAllBoards(
        { limit: 10, actor: nonAdminActor },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow();
  });
});

describe('bulkDeleteComments', () => {
  let mockPrisma: PrismaClient;
  let adminActor = { userId: 1, userGroupSrl: 1, isAdmin: true };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should delete multiple comments', async () => {
    const result = await bulkDeleteComments(
      {
        commentIds: [1, 2],
        actor: adminActor,
      },
      { prisma: mockPrisma },
    );

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.adminLogIds).toHaveLength(2);
  });

  it('should handle empty commentIds array', async () => {
    const result = await bulkDeleteComments(
      {
        commentIds: [],
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
      bulkDeleteComments(
        {
          commentIds: [1],
          actor: nonAdminActor,
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow();
  });
});
