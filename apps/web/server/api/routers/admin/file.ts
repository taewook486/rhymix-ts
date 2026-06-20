/**
 * admin.file tRPC 라우터 — SPEC-ADMIN-002 Slice 2B (파일 관리).
 *
 * 파일 관리 기능:
 * - list: 관리자용 파일 목록 (REQ-ADMIN2-078)
 * - listOrphans: 고아 파일 목록 (REQ-ADMIN2-079)
 * - purgeOrphans: 고아 파일 정리 (REQ-ADMIN2-079)
 * - getUploadSettings/updateUploadSettings: 파일 업로드 설정 (REQ-ADMIN2-080)
 * - getDownloadSettings/updateDownloadSettings: 파일 다운로드 설정 (REQ-ADMIN2-081)
 * - getOtherSettings/updateOtherSettings: 파일 기타 설정 (REQ-ADMIN2-082)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-078, REQ-ADMIN2-079, REQ-ADMIN2-080, REQ-ADMIN2-081, REQ-ADMIN2-082
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import { listFiles, listOrphans, purgeOrphans, InMemoryStorage } from '@rhymix-ts/file';
import {
  getFileUploadSettings,
  updateFileUploadSettings,
  getFileDownloadSettings,
  updateFileDownloadSettings,
  getFileOtherSettings,
  updateFileOtherSettings,
} from '@rhymix-ts/admin';

export const adminFileRouter = router({
  /**
   * 파일 목록 조회
   * - REQ-ADMIN2-078: 이름, 크기, 업로더, 첨부 문서, 다운로드 수
   * - 필터/검색 지원
   */
  list: protectedAdminProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(), // 파일명 검색
      fileType: z.string().optional(), // 이미지/비디오 등 필터
    }))
    .query(async ({ ctx, input }) => {
      // 검색 조건 변환
      const where: Record<string, unknown> = {};
      if (input.search) {
        where.sourceFilename = { contains: input.search };
      }
      if (input.fileType) {
        where.mimeType = { startsWith: input.fileType };
      }

      const result = await listFiles(
        { cursor: input.cursor, limit: input.limit, where },
        { prisma: ctx.prisma },
      );

      return result;
    }),

  /**
   * 고아 파일 목록 조회
   * - REQ-ADMIN2-079: 더 이상 참조되지 않는 파일 목록
   */
  listOrphans: protectedAdminProcedure
    .input(z.object({
      olderThanDays: z.number().int().min(1).optional(),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const result = await listOrphans(
        { cursor: input.cursor, limit: input.limit, olderThanDays: input.olderThanDays },
        { prisma: ctx.prisma },
      );

      return result;
    }),

  /**
   * 고아 파일 정리
   * - REQ-ADMIN2-079: dry-run 미리보기 후 삭제
   */
  purgeOrphans: protectedAdminProcedure
    .input(z.object({
      olderThanDays: z.number().int().min(1),
      dryRun: z.boolean().default(false), // 미리보기 모드
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.dryRun) {
        // dry-run: 목록만 반환
        const orphans = await listOrphans(
          { olderThanDays: input.olderThanDays, limit: 1000 },
          { prisma: ctx.prisma },
        );
        return {
          deletedCount: 0,
          preview: orphans.items.map((f: { id: number; sourceFilename: string; fileSize: bigint }) => ({ id: f.id, filename: f.sourceFilename, size: f.fileSize })),
        };
      }

      // 실제 삭제
      const storage = new InMemoryStorage(); // TODO: 실제 스토리지 사용 (환경 설정 필요)
      const result = await purgeOrphans(
        { olderThanDays: input.olderThanDays },
        { prisma: ctx.prisma, storage },
      );

      return {
        deletedCount: result.deletedCount,
        preview: [],
      };
    }),

  /**
   * 파일 업로드 설정 조회
   * - REQ-ADMIN2-080: 허용 확장자, 최대 크기, 첨부 수, 리사이즈
   */
  getUploadSettings: protectedAdminProcedure
    .query(async ({ ctx }) => {
      return getFileUploadSettings({ prisma: ctx.prisma });
    }),

  /**
   * 파일 업로드 설정 업데이트
   */
  updateUploadSettings: protectedAdminProcedure
    .input(z.object({
      allowedExtensions: z.array(z.string()),
      maxFileSize: z.number().int(),
      maxAttachmentsPerPost: z.number().int(),
      imageAutoResize: z.object({ width: z.number().int(), height: z.number().int() }),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateFileUploadSettings(input, { prisma: ctx.prisma });
    }),

  /**
   * 파일 다운로드 설정 조회
   * - REQ-ADMIN2-081: 권한 정책, 핫링크 보안
   */
  getDownloadSettings: protectedAdminProcedure
    .query(async ({ ctx }) => {
      return getFileDownloadSettings({ prisma: ctx.prisma });
    }),

  /**
   * 파일 다운로드 설정 업데이트
   */
  updateDownloadSettings: protectedAdminProcedure
    .input(z.object({
      downloadPermission: z.enum(['unlimited', 'member_only', 'point_deduction']),
      pointDeduction: z.number().int().optional(),
      hotlinkProtection: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateFileDownloadSettings(input, { prisma: ctx.prisma });
    }),

  /**
   * 파일 기타 설정 조회
   * - REQ-ADMIN2-082: 썸네일 생성 방식, 저장 경로 전략
   */
  getOtherSettings: protectedAdminProcedure
    .query(async ({ ctx }) => {
      return getFileOtherSettings({ prisma: ctx.prisma });
    }),

  /**
   * 파일 기타 설정 업데이트
   * - REQ-ADMIN2-082: 썸네일 생성 방식, 저장 경로 전략
   */
  updateOtherSettings: protectedAdminProcedure
    .input(z.object({
      thumbnailGenerationStrategy: z.enum(['on_demand', 'eager']),
      storagePathStrategy: z.enum(['flat', 'date_sharded']),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateFileOtherSettings(input, { prisma: ctx.prisma });
    }),
});
