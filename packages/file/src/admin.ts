/**
 * admin.ts — SPEC-FILE-001 Slice C
 *
 * 파일 관리자 도메인 함수:
 *   - setCoverImage: 대표 이미지 설정
 *   - clearCoverImage: 대표 이미지 해제
 *   - listMyAttachments: 내 첨부 파일 목록 조회
 *   - listOrphans: 고아 파일 목록 조회
 *   - purgeOrphans: 고아 파일 정리
 *   - cascadeRebuild: cascade 삭제 재구축
 *   - orphanCleanupTask: 고아 파일 정리 cron 작업
 *   - migrateStorage: 스토리지 이관 (stub)
 *
 * @MX:ANCHOR [AUTO]: 파일 관리자 도메인 단일 진입점.
 * @MX:REASON: admin 라우터 + cron 작업에서 호출. fan_in >= 3.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-034, 072, 073, 098, 057
 */
import type { PrismaClient, FileAttachment } from '@prisma/client';
import type { FileStorage } from './storage/types';
import { AttachmentOwnershipError, deleteAttachment } from './attachment';

// Prisma 확장 타입 (FileAttachment + Document 모델)
interface PrismaWithFileAttachment {
  fileAttachment: {
    findUnique(args: { where: { id: number } }): Promise<FileAttachment | null>;
    findUniqueOrThrow(args: { where: { id: number } }): Promise<FileAttachment>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      take?: number;
      cursor?: Record<string, unknown>;
      skip?: number;
      // include 는 FileAttachment 가 실제로 가진 관계로만 좁힌다. 예전에는
      // Record<string, ...> 라서 존재하지 않는 uploader 관계를 include 해도
      // 컴파일을 통과했고, 런타임에서 목록 조회 전체가 깨졌다.
      include?: {
        document?: boolean | { select?: Record<string, boolean> };
        comment?: boolean | { select?: Record<string, boolean> };
      };
    }): Promise<FileAttachment[]>;
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<FileAttachment>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    delete(args: { where: { id: number } }): Promise<FileAttachment>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  document: {
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<unknown>;
  };
  user: {
    findMany(args: {
      where: { id: { in: number[] } };
      select: { id: true; nickName: true };
    }): Promise<{ id: number; nickName: string }[]>;
  };
  $transaction<T>(fn: (tx: PrismaWithFileAttachment) => Promise<T>): Promise<T>;
}

/**
 * 대표 이미지 설정.
 *
 * 소유권 검사 후 단일 트랜잭션:
 *   1) 동일 documentId의 모든 첨부 파일 coverImage 해제
 *   2) 타겟 첨부 파일 coverImage 설정
 */
export async function setCoverImage(
  input: { attachmentId: number; documentId: number },
  ctx: { prisma: PrismaClient; actor: { id: string; isAdmin: boolean } },
): Promise<FileAttachment> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;

  // 첨부 파일 조회
  const attachment = await prisma.fileAttachment.findUniqueOrThrow({
    where: { id: input.attachmentId },
  });

  // 소유권 검사
  if (!ctx.actor.isAdmin && attachment.memberId !== ctx.actor.id) {
    throw new AttachmentOwnershipError();
  }

  // 단일 트랜잭션: 모든 해제 + 타겟 설정
  const result = await prisma.$transaction(async (tx) => {
    // 동일 documentId의 모든 첨부 파일 coverImage 해제
    await tx.fileAttachment.updateMany({
      where: { documentId: input.documentId },
      data: { coverImage: false },
    });

    // 타겟 첨부 파일 coverImage 설정
    const updated = await tx.fileAttachment.update({
      where: { id: input.attachmentId },
      data: { coverImage: true },
    });

    return updated;
  });

  return result;
}

/**
 * 대표 이미지 해제.
 *
 * 소유권 검사 후 coverImage: false 설정.
 */
export async function clearCoverImage(
  input: { attachmentId: number; documentId: number },
  ctx: { prisma: PrismaClient; actor: { id: string; isAdmin: boolean } },
): Promise<FileAttachment> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;

  // 첨부 파일 조회
  const attachment = await prisma.fileAttachment.findUniqueOrThrow({
    where: { id: input.attachmentId },
  });

  // 소유권 검사
  if (!ctx.actor.isAdmin && attachment.memberId !== ctx.actor.id) {
    throw new AttachmentOwnershipError();
  }

  // coverImage 해제
  const updated = await prisma.fileAttachment.update({
    where: { id: input.attachmentId },
    data: { coverImage: false },
  });

  return updated;
}

/**
 * 내 첨부 파일 목록 조회.
 *
 * memberId 기반 cursor pagination.
 * isvalid=true만, regdate 내림차순.
 */
export async function listMyAttachments(
  input: { memberId: string; cursor?: string; limit?: number },
  ctx: { prisma: PrismaClient },
): Promise<{ items: FileAttachment[]; nextCursor: string | null }> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;
  const limit = input.limit ?? 20;

  // cursor 디코딩 (base64(id))
  let cursorId: number | undefined;
  if (input.cursor) {
    const buffer = Buffer.from(input.cursor, 'base64');
    cursorId = parseInt(buffer.toString('utf-8'), 10);
  }

  // 조회 조건
  const where: Record<string, unknown> = {
    memberId: input.memberId,
    isvalid: true,
  };

  // cursor pagination
  const items = await prisma.fileAttachment.findMany({
    where,
    orderBy: { regdate: 'desc' },
    take: limit + 1, // nextCursor 확인용 +1
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
  });

  // nextCursor 계산
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items[limit]; // 마지막 아이템
    if (nextItem) {
      items.pop(); // limit 개만 반환
      nextCursor = Buffer.from(nextItem.id.toString()).toString('base64');
    }
  }

  return { items, nextCursor };
}

/**
 * 고아 파일 목록 조회.
 *
 * isvalid=false + 선택적 olderThanDays 필터 + cursor pagination.
 */
export async function listOrphans(
  input: { olderThanDays?: number; cursor?: string; limit?: number },
  ctx: { prisma: PrismaClient },
): Promise<{ items: FileAttachment[]; nextCursor: string | null }> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;
  const limit = input.limit ?? 20;

  // cursor 디코딩
  let cursorId: number | undefined;
  if (input.cursor) {
    const buffer = Buffer.from(input.cursor, 'base64');
    cursorId = parseInt(buffer.toString('utf-8'), 10);
  }

  // 조회 조건
  const where: Record<string, unknown> = {
    isvalid: false,
  };

  // olderThanDays 필터
  if (input.olderThanDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);
    where.regdate = { lte: cutoffDate };
  }

  // cursor pagination
  const items = await prisma.fileAttachment.findMany({
    where,
    orderBy: { regdate: 'desc' },
    take: limit + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
  });

  // nextCursor 계산
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items[limit];
    if (nextItem) {
      items.pop();
      nextCursor = Buffer.from(nextItem.id.toString()).toString('base64');
    }
  }

  return { items, nextCursor };
}

/**
 * 고아 파일 정리.
 *
 * orphan 찾아서 storage.delete + prisma.fileAttachment.delete.
 * storage.delete 실패는 warn하고 continue (best-effort).
 */
export async function purgeOrphans(
  input: { olderThanDays: number },
  ctx: { prisma: PrismaClient; storage: FileStorage },
): Promise<{ deletedCount: number }> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;

  // 정리 대상 조회
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

  const orphans = await prisma.fileAttachment.findMany({
    where: {
      isvalid: false,
      regdate: { lte: cutoffDate },
    },
  });

  let deletedCount = 0;

  // best-effort 삭제
  for (const orphan of orphans) {
    try {
      // storage 삭제
      await ctx.storage.delete(orphan.storageKey);

      // DB 삭제
      await prisma.fileAttachment.delete({
        where: { id: orphan.id },
      });

      deletedCount++;
    } catch (error) {
      // storage.delete 실패 시 warn하고 continue
      console.warn(`[purgeOrphans] Failed to delete orphan ${orphan.id}:`, error);
    }
  }

  return { deletedCount };
}

/**
 * Cascade 삭제 재구축.
 *
 * documentId: FileAttachment.isvalid=true 개수로 Document.uploadedCount 업데이트.
 * commentId: 로그만 (comment 도메인에 uploadedCount 없음).
 */
export async function cascadeRebuild(
  input: { documentId?: number; commentId?: number },
  ctx: { prisma: PrismaClient },
): Promise<{ updatedCount: number }> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;

  if (input.documentId !== undefined) {
    // documentId 기반 재구축
    const count = await prisma.fileAttachment.count({
      where: {
        documentId: input.documentId,
        isvalid: true,
      },
    });

    await prisma.document.update({
      where: { id: input.documentId },
      data: { uploadedCount: count },
    });

    return { updatedCount: 1 };
  }

  if (input.commentId !== undefined) {
    // commentId 기반 — 로그만 (comment 도메인에 uploadedCount 없음)
    const count = await prisma.fileAttachment.count({
      where: {
        commentId: input.commentId,
        isvalid: true,
      },
    });

    console.log(`[cascadeRebuild] Comment ${input.commentId} has ${count} valid attachments (no uploadedCount field to update)`);

    return { updatedCount: 0 };
  }

  return { updatedCount: 0 };
}

/**
 * 고아 파일 정리 cron 작업.
 *
 * purgeOrphans와 동일하지만 cron용 별도 export.
 * storage 없으면 isvalid=false만 DB에서 삭제.
 */
export async function orphanCleanupTask(
  input: { olderThanDays: number },
  ctx: { prisma: PrismaClient; storage?: FileStorage },
): Promise<{ deletedCount: number }> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;

  // 정리 대상 조회
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

  const orphans = await prisma.fileAttachment.findMany({
    where: {
      isvalid: false,
      regdate: { lte: cutoffDate },
    },
  });

  let deletedCount = 0;

  for (const orphan of orphans) {
    if (ctx.storage) {
      // storage 있는 경우: purgeOrphans와 동일
      try {
        await ctx.storage.delete(orphan.storageKey);
        await prisma.fileAttachment.delete({
          where: { id: orphan.id },
        });
        deletedCount++;
      } catch (error) {
        console.warn(`[orphanCleanupTask] Failed to delete orphan ${orphan.id}:`, error);
      }
    } else {
      // storage 없는 경우: DB에서만 삭제
      try {
        await prisma.fileAttachment.delete({
          where: { id: orphan.id },
        });
        deletedCount++;
      } catch (error) {
        console.warn(`[orphanCleanupTask] Failed to delete orphan ${orphan.id} from DB:`, error);
      }
    }
  }

  return { deletedCount };
}

/**
 * 스토리지 이관 (stub).
 *
 * 타입 정의만, 구현 없음.
 */
export interface MigrateStorageOptions {
  dryRun?: boolean;
  batchSize?: number;
}

export async function migrateStorage(
  _input: { from: string; to: string; options?: MigrateStorageOptions },
): Promise<never> {
  throw new Error('migrateStorage not implemented yet - SPEC-FILE-057');
}

// 정렬 키 → Prisma 컬럼 매핑 (REQ-CPAR-022)
const FILE_SORT_FIELD_MAP = {
  size: 'fileSize',
  downloads: 'downloadCount',
  regdate: 'regdate',
} as const;

export type FileSortBy = keyof typeof FILE_SORT_FIELD_MAP;
export type FileSortOrder = 'asc' | 'desc';

/**
 * 관리자용 파일 목록 조회.
 *
 * REQ-ADMIN2-078: 이름, 크기, 업로더, 첨부 문서, 다운로드 수 포함.
 * uploader(Member) + document(Document) join.
 * REQ-CPAR-022: sortBy(size/downloads/regdate) + sortOrder(asc/desc) 지원.
 *               미지정 시 기본값 regdate desc (하위 호환).
 *
 * @MX:NOTE [AUTO]: 필터/검색 기능은 tRPC 라우터 레벨에서 구현 (Prisma where 조건).
 */
export async function listFiles(
  input: {
    cursor?: string;
    limit?: number;
    where?: Record<string, unknown>;
    sortBy?: FileSortBy;
    sortOrder?: FileSortOrder;
  },
  ctx: { prisma: PrismaClient },
): Promise<{ items: (FileAttachment & { uploader?: { id: string; nickname: string }; document?: { id: number; title: string } })[]; nextCursor: string | null; totalCount: number }> {
  const prisma = ctx.prisma as unknown as PrismaWithFileAttachment;
  const limit = input.limit ?? 20;

  // cursor 디코딩
  let cursorId: number | undefined;
  if (input.cursor) {
    const buffer = Buffer.from(input.cursor, 'base64');
    cursorId = parseInt(buffer.toString('utf-8'), 10);
  }

  // 조회 조건 (isvalid=true만)
  const where: Record<string, unknown> = {
    isvalid: true,
    ...input.where,
  };

  // 정렬 조건 (REQ-CPAR-022) — 미지정 시 regdate desc
  const sortField = FILE_SORT_FIELD_MAP[input.sortBy ?? 'regdate'];
  const sortOrder = input.sortOrder ?? 'desc';

  // totalCount 조회 (pagination 메타데이터용)
  const totalCount = await prisma.fileAttachment.count({ where });

  // cursor pagination + document join.
  // FileAttachment 에는 uploader 관계가 없다 — memberId 는 User.id 를 담은 평범한
  // 문자열 컬럼이라 include 로 join 할 수 없다. 업로더는 아래에서 별도 조회한다.
  const items = (await prisma.fileAttachment.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    take: limit + 1, // nextCursor 확인용 +1
    include: {
      document: { select: { id: true, title: true } },
    },
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
  })) as (FileAttachment & { uploader?: { id: string; nickname: string }; document?: { id: number; title: string } })[];

  // nextCursor 계산
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items[limit]; // 마지막 아이템
    if (nextItem) {
      items.pop(); // limit 개만 반환
      nextCursor = Buffer.from(nextItem.id.toString()).toString('base64');
    }
  }

  // 업로더 복원 — memberId(문자열) → User.id(정수) 로 한 번에 조회한다.
  const uploaderIds = [
    ...new Set(
      items
        .map((item) => Number(item.memberId))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  if (uploaderIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: uploaderIds } },
      select: { id: true, nickName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    for (const item of items) {
      const user = byId.get(Number(item.memberId));
      if (user) {
        item.uploader = { id: String(user.id), nickname: user.nickName };
      }
    }
  }

  return { items, nextCursor, totalCount };
}

// ---------------------------------------------------------------------------
// bulkDeleteFiles — REQ-CPAR-023
// ---------------------------------------------------------------------------

export interface BulkDeleteFilesInput {
  fileIds: number[];
  actor: { userId: number; isAdmin: boolean };
}

export interface BulkDeleteFilesResult {
  success: number;
  failed: number;
  failedIds: number[];
  adminLogIds: bigint[];
}

// Prisma 확장 타입 (AdminLog 모델)
interface PrismaWithAdminLog {
  adminLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: bigint }>;
  };
}

/**
 * 파일 일괄 삭제 (admin 전용).
 *
 * REQ-CPAR-023: 선택한 파일을 SPEC-FILE-001의 기존 cascade 삭제 서비스
 * (deleteAttachment — storage.delete + DB delete)를 경유해 삭제하고,
 * 성공 건마다 AdminLog에 기록한다.
 *
 * @MX:WARN [AUTO]: storage I/O가 포함되어 단일 DB 트랜잭션으로 묶지 않는다 — best-effort.
 * @MX:REASON: deleteAttachment는 항목별로 외부 storage.delete 후 DB delete를 수행한다.
 *             여러 파일을 하나의 Prisma $transaction 안에 넣으면 외부 I/O 지연이 트랜잭션
 *             타임아웃을 유발할 수 있어, purgeOrphans와 동일한 per-item best-effort 패턴
 *             (개별 실패는 warn 후 계속 진행)을 따른다.
 */
export async function bulkDeleteFiles(
  input: BulkDeleteFilesInput,
  ctx: { prisma: PrismaClient; storage: FileStorage },
): Promise<BulkDeleteFilesResult> {
  if (!input.actor.isAdmin) {
    throw new AttachmentOwnershipError();
  }

  if (input.fileIds.length === 0) {
    return { success: 0, failed: 0, failedIds: [], adminLogIds: [] };
  }

  const prismaWithAdminLog = ctx.prisma as unknown as PrismaWithAdminLog;

  const failedIds: number[] = [];
  let success = 0;
  const adminLogIds: bigint[] = [];
  const now = new Date();

  for (const fileId of input.fileIds) {
    try {
      await deleteAttachment(
        { attachmentId: fileId, actor: { userId: input.actor.userId, isAdmin: true } },
        { prisma: ctx.prisma, storage: ctx.storage },
      );

      const log = await prismaWithAdminLog.adminLog.create({
        data: {
          actorId: input.actor.userId,
          action: 'bulk_delete_file',
          target: `file:${fileId}`,
          diff: {},
          createdAt: now,
        },
      });
      adminLogIds.push(log.id);

      success++;
    } catch (error) {
      console.warn(`[bulkDeleteFiles] Failed to delete file ${fileId}:`, error);
      failedIds.push(fileId);
    }
  }

  return { success, failed: failedIds.length, failedIds, adminLogIds };
}
