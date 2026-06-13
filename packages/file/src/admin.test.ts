/**
 * admin.test.ts — SPEC-FILE-001 Slice C (REQ-FILE-092)
 *
 * admin 도메인 함수들에 대한 단위 테스트.
 *
 * REQ-FILE-092: 85%+ 커버리지 달성.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryStorage } from './storage/memory';
import type { FileAttachment } from '@prisma/client';
import { AttachmentOwnershipError } from './attachment';
import {
  setCoverImage,
  clearCoverImage,
  listMyAttachments,
  listOrphans,
  purgeOrphans,
  cascadeRebuild,
  orphanCleanupTask,
  migrateStorage,
} from './admin';

// ---------------------------------------------------------------------------
// Mock 빌더
// ---------------------------------------------------------------------------

function makeAttachment(overrides: Partial<FileAttachment> = {}): FileAttachment {
  return {
    id: 10,
    storageKey: 'attachments/2024/01/uuid.png',
    memberId: '42',
    documentId: 1,
    commentId: null,
    uploadTargetType: 'DOCUMENT',
    sourceFilename: 'test.png',
    uploadedFilename: 'uuid.png',
    fileSize: BigInt(1024),
    mimeType: 'image/png',
    width: 100,
    height: 100,
    duration: null,
    directDownload: false,
    coverImage: false,
    isvalid: true,
    deleted: false,
    regdate: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  } as FileAttachment;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    fileAttachment: {
      findUnique: vi.fn().mockResolvedValue(makeAttachment()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(makeAttachment()),
      findMany: vi.fn().mockResolvedValue([makeAttachment()]),
      update: vi.fn().mockResolvedValue(makeAttachment()),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(makeAttachment()),
      count: vi.fn().mockResolvedValue(1),
    },
    document: {
      update: vi.fn().mockResolvedValue({ id: 1, uploadedCount: 1 }),
    },
    ...overrides,
  };
  base.$transaction = vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(base));
  return base;
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('admin.ts — REQ-FILE-092', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let storage: InMemoryStorage;

  beforeEach(() => {
    prisma = makePrisma();
    storage = new InMemoryStorage();
  });

  // ---------------------------------------------------------------------------
  // setCoverImage
  // ---------------------------------------------------------------------------

  describe('setCoverImage — REQ-FILE-034', () => {
    it('성공: 트랜잭션 호출 확인, coverImage 플래그 설정 확인', async () => {
      const attachment = makeAttachment({ id: 100, documentId: 1, coverImage: false });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(attachment),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({ ...attachment, coverImage: true }),
        },
      });

      const result = await setCoverImage(
        { attachmentId: 100, documentId: 1 },
        { prisma: mockPrisma as never, actor: { id: '42', isAdmin: false } },
      );

      expect(result).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.fileAttachment.updateMany).toHaveBeenCalledWith({
        where: { documentId: 1 },
        data: { coverImage: false },
      });
      expect(mockPrisma.fileAttachment.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { coverImage: true },
      });
    });

    it('소유권 오류: actor.id !== memberId + !isAdmin → AttachmentOwnershipError', async () => {
      const attachment = makeAttachment({ id: 100, memberId: '99' });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(attachment),
        },
      });

      await expect(
        setCoverImage(
          { attachmentId: 100, documentId: 1 },
          { prisma: mockPrisma as never, actor: { id: '42', isAdmin: false } },
        ),
      ).rejects.toThrow(AttachmentOwnershipError);
    });

    it('admin 성공: actor.isAdmin=true → 소유권 무시하고 성공', async () => {
      const attachment = makeAttachment({ id: 100, memberId: '99', documentId: 1 });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(attachment),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({ ...attachment, coverImage: true }),
        },
      });

      const result = await setCoverImage(
        { attachmentId: 100, documentId: 1 },
        { prisma: mockPrisma as never, actor: { id: '42', isAdmin: true } },
      );

      expect(result).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // clearCoverImage
  // ---------------------------------------------------------------------------

  describe('clearCoverImage — REQ-FILE-034', () => {
    it('성공: coverImage false로 설정', async () => {
      const attachment = makeAttachment({ id: 100, documentId: 1, coverImage: true });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(attachment),
          update: vi.fn().mockResolvedValue({ ...attachment, coverImage: false }),
        },
      });

      const result = await clearCoverImage(
        { attachmentId: 100, documentId: 1 },
        { prisma: mockPrisma as never, actor: { id: '42', isAdmin: false } },
      );

      expect(result).toBeDefined();
      expect(mockPrisma.fileAttachment.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { coverImage: false },
      });
    });

    it('소유권 오류: actor.id !== memberId + !isAdmin → AttachmentOwnershipError', async () => {
      const attachment = makeAttachment({ id: 100, memberId: '99' });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(attachment),
        },
      });

      await expect(
        clearCoverImage(
          { attachmentId: 100, documentId: 1 },
          { prisma: mockPrisma as never, actor: { id: '42', isAdmin: false } },
        ),
      ).rejects.toThrow(AttachmentOwnershipError);
    });

    it('admin 성공: actor.isAdmin=true → 소유권 무시하고 성공', async () => {
      const attachment = makeAttachment({ id: 100, memberId: '99', coverImage: true });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(attachment),
          update: vi.fn().mockResolvedValue({ ...attachment, coverImage: false }),
        },
      });

      const result = await clearCoverImage(
        { attachmentId: 100, documentId: 1 },
        { prisma: mockPrisma as never, actor: { id: '42', isAdmin: true } },
      );

      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // listMyAttachments
  // ---------------------------------------------------------------------------

  describe('listMyAttachments — REQ-FILE-072', () => {
    it('기본 조회: memberId 기반 필터링', async () => {
      const attachments = [
        makeAttachment({ id: 1, memberId: '42', regdate: new Date('2024-01-02T00:00:00Z') }),
        makeAttachment({ id: 2, memberId: '42', regdate: new Date('2024-01-01T00:00:00Z') }),
      ];

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue(attachments),
        },
      });

      const result = await listMyAttachments(
        { memberId: '42' },
        { prisma: mockPrisma as never },
      );

      expect(result.items).toHaveLength(2);
      expect(mockPrisma.fileAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: '42', isvalid: true },
          orderBy: { regdate: 'desc' },
        }),
      );
    });

    it('cursor pagination: nextCursor가 null이 아닐 때 (limit < total)', async () => {
      const attachments = Array.from({ length: 21 }, (_, i) =>
        makeAttachment({ id: i + 1, memberId: '42' }),
      );

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue(attachments),
        },
      });

      const result = await listMyAttachments(
        { memberId: '42', limit: 20 },
        { prisma: mockPrisma as never },
      );

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).not.toBeNull();
      expect(result.nextCursor).toBe(Buffer.from('21').toString('base64'));
    });

    it('빈 결과: nextCursor null', async () => {
      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      });

      const result = await listMyAttachments(
        { memberId: '42' },
        { prisma: mockPrisma as never },
      );

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('cursor 디코딩: base64(id) → number', async () => {
      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([makeAttachment({ id: 50 })]),
        },
      });

      await listMyAttachments(
        { memberId: '42', cursor: Buffer.from('50').toString('base64') },
        { prisma: mockPrisma as never },
      );

      expect(mockPrisma.fileAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 50 },
          skip: 1,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // listOrphans
  // ---------------------------------------------------------------------------

  describe('listOrphans — REQ-FILE-073', () => {
    it('기본 조회: isvalid=false 필터', async () => {
      const orphans = [makeAttachment({ id: 1, isvalid: false })];

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue(orphans),
        },
      });

      const result = await listOrphans({}, { prisma: mockPrisma as never });

      expect(result.items).toHaveLength(1);
      expect(mockPrisma.fileAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isvalid: false },
        }),
      );
    });

    it('olderThanDays 필터 적용 확인 (regdate 조건 확인)', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      });

      await listOrphans({ olderThanDays: 30 }, { prisma: mockPrisma as never });

      expect(mockPrisma.fileAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isvalid: false,
            regdate: { lte: expect.any(Date) },
          },
        }),
      );
    });

    it('cursor pagination', async () => {
      const orphans = Array.from({ length: 21 }, (_, i) =>
        makeAttachment({ id: i + 1, isvalid: false }),
      );

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue(orphans),
        },
      });

      const result = await listOrphans(
        { limit: 20 },
        { prisma: mockPrisma as never },
      );

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // purgeOrphans
  // ---------------------------------------------------------------------------

  describe('purgeOrphans — REQ-FILE-073', () => {
    it('성공: storage.delete 호출 + DB delete 호출 + deletedCount 반환', async () => {
      const orphan = makeAttachment({ id: 1, isvalid: false, storageKey: 'orphan/1.png' });
      storage.put(orphan.storageKey, Buffer.alloc(1024), 'image/png');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([orphan]),
          delete: vi.fn().mockResolvedValue(orphan),
        },
      });

      const result = await purgeOrphans(
        { olderThanDays: 30 },
        { prisma: mockPrisma as never, storage },
      );

      expect(result.deletedCount).toBe(1);
      expect(mockPrisma.fileAttachment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('storage.delete 실패 시 계속 진행 (best-effort)', async () => {
      const orphan = makeAttachment({ id: 1, isvalid: false, storageKey: 'orphan/1.png' });
      const failingStorage = {
        delete: vi.fn().mockRejectedValue(new Error('Storage failed')),
      } as never;

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([orphan]),
          delete: vi.fn().mockResolvedValue(orphan),
        },
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await purgeOrphans(
        { olderThanDays: 30 },
        { prisma: mockPrisma as never, storage: failingStorage },
      );

      expect(result.deletedCount).toBe(0); // storage 실패로 DB 삭제도 안 됨
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('0 orphans: { deletedCount: 0 }', async () => {
      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      });

      const result = await purgeOrphans(
        { olderThanDays: 30 },
        { prisma: mockPrisma as never, storage },
      );

      expect(result.deletedCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // cascadeRebuild
  // ---------------------------------------------------------------------------

  describe('cascadeRebuild — REQ-FILE-073', () => {
    it('documentId 기반: document.update uploadedCount 확인', async () => {
      const mockPrisma = makePrisma({
        fileAttachment: {
          count: vi.fn().mockResolvedValue(5),
        },
        document: {
          update: vi.fn().mockResolvedValue({ id: 1, uploadedCount: 5 }),
        },
      });

      const result = await cascadeRebuild(
        { documentId: 1 },
        { prisma: mockPrisma as never },
      );

      expect(result.updatedCount).toBe(1);
      expect(mockPrisma.fileAttachment.count).toHaveBeenCalledWith({
        where: { documentId: 1, isvalid: true },
      });
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { uploadedCount: 5 },
      });
    });

    it('commentId 기반: updatedCount 반환 (comment엔 uploadedCount 없음)', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockPrisma = makePrisma({
        fileAttachment: {
          count: vi.fn().mockResolvedValue(3),
        },
      });

      const result = await cascadeRebuild(
        { commentId: 5 },
        { prisma: mockPrisma as never },
      );

      expect(result.updatedCount).toBe(0);
      expect(mockPrisma.fileAttachment.count).toHaveBeenCalledWith({
        where: { commentId: 5, isvalid: true },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[cascadeRebuild] Comment 5 has 3 valid attachments (no uploadedCount field to update)',
      );
      consoleLogSpy.mockRestore();
    });

    it('둘 다 없을 때: { updatedCount: 0 }', async () => {
      const result = await cascadeRebuild({}, { prisma });

      expect(result.updatedCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // orphanCleanupTask
  // ---------------------------------------------------------------------------

  describe('orphanCleanupTask — REQ-FILE-098', () => {
    it('storage 있을 때: purgeOrphans와 동일 동작', async () => {
      const orphan = makeAttachment({ id: 1, isvalid: false, storageKey: 'orphan/1.png' });
      storage.put(orphan.storageKey, Buffer.alloc(1024), 'image/png');

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([orphan]),
          delete: vi.fn().mockResolvedValue(orphan),
        },
      });

      const result = await orphanCleanupTask(
        { olderThanDays: 30 },
        { prisma: mockPrisma as never, storage },
      );

      expect(result.deletedCount).toBe(1);
      expect(mockPrisma.fileAttachment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('storage 없을 때: DB만 삭제', async () => {
      const orphan = makeAttachment({ id: 1, isvalid: false, storageKey: 'orphan/1.png' });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([orphan]),
          delete: vi.fn().mockResolvedValue(orphan),
        },
      });

      const result = await orphanCleanupTask(
        { olderThanDays: 30 },
        { prisma: mockPrisma as never },
      );

      expect(result.deletedCount).toBe(1);
      expect(mockPrisma.fileAttachment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('storage 없을 때 DB 실패 시 warn 로그', async () => {
      const orphan = makeAttachment({ id: 1, isvalid: false });

      const mockPrisma = makePrisma({
        fileAttachment: {
          findMany: vi.fn().mockResolvedValue([orphan]),
          delete: vi.fn().mockRejectedValue(new Error('DB failed')),
        },
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await orphanCleanupTask(
        { olderThanDays: 30 },
        { prisma: mockPrisma as never },
      );

      expect(result.deletedCount).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // migrateStorage
  // ---------------------------------------------------------------------------

  describe('migrateStorage — REQ-FILE-057', () => {
    it('stub: 항상 Error 던짐', async () => {
      await expect(
        migrateStorage({ from: 's3', to: 'gcs' }),
      ).rejects.toThrow('migrateStorage not implemented yet - SPEC-FILE-057');
    });
  });
});
