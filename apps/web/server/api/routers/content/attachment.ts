/**
 * content.attachment tRPC 라우터 — SPEC-CONTENT-001 Slice E.
 *
 * attachment.requestUpload  — presigned PUT URL 발급 (rate limit 적용)
 * attachment.complete       — PUT 완료 후 검증 + scan + row 생성
 * attachment.delete         — 소유권 검사 + 삭제
 * attachment.list           — 첨부 파일 목록
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import {
  requestUpload,
  completeUpload,
  deleteAttachment,
  listAttachments,
  checkRateLimit,
  recordAttempt,
  RateLimitedError,
  UnsupportedMimeTypeError,
  FileTooLargeError,
  InvalidUploadTokenError,
  UploadHeadMismatchError,
  VirusDetectedError,
  AttachmentOwnershipError,
} from '@rhymix-ts/board';

/**
 * Attachment 도메인 예외를 TRPCError 로 변환.
 */
function mapAttachmentError(err: unknown): never {
  if (err instanceof UnsupportedMimeTypeError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof FileTooLargeError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof InvalidUploadTokenError) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: err.message });
  }
  if (err instanceof UploadHeadMismatchError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof VirusDetectedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof AttachmentOwnershipError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof RateLimitedError) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: err.message,
      cause: { retryAfter: err.retryAfterSeconds },
    });
  }
  throw err;
}

export const contentAttachmentRouter = router({
  /**
   * presigned PUT URL 발급 — 인증 필수 + rate limit 적용.
   */
  requestUpload: protectedProcedure
    .input(
      z.object({
        sourceFilename: z.string().min(1).max(500),
        mimeType: z.string().min(1).max(200),
        fileSize: z.number().int().positive().max(100 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const identifier = ctx.session.user.id.toString();
      const ip = ctx.ip ?? '0.0.0.0';

      // rate limit gate
      try {
        await checkRateLimit(
          { ip, identifier, endpoint: 'attachment.upload' },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapAttachmentError(err);
      }

      try {
        const result = await requestUpload(
          { ...input, memberId: identifier },
          { storage: ctx.storage, tokenSecret: ctx.uploadTokenSecret },
        );

        // 검사 통과 + 요청 성공 후 기록
        await recordAttempt(
          { ip, identifier, endpoint: 'attachment.upload' },
          { prisma: ctx.prisma },
        );

        return result;
      } catch (err) {
        mapAttachmentError(err);
      }
    }),

  /**
   * PUT 완료 후 검증 + scan + row 생성.
   */
  complete: protectedProcedure
    .input(
      z.object({
        uploadToken: z.string().min(1),
        uploadTargetType: z.enum(['DOCUMENT', 'COMMENT']),
        uploadTargetId: z.number().int().positive(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        duration: z.number().int().positive().optional(),
        directDownload: z.boolean().default(false),
        coverImage: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeUpload(input, {
          prisma: ctx.prisma,
          storage: ctx.storage,
          scanner: ctx.scanner,
          tokenSecret: ctx.uploadTokenSecret,
        });
      } catch (err) {
        mapAttachmentError(err);
      }
    }),

  /**
   * 첨부 파일 삭제.
   */
  delete: protectedProcedure
    .input(z.object({ attachmentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteAttachment(
          {
            attachmentId: input.attachmentId,
            actor: { userId: ctx.session.user.id, isAdmin: ctx.session.user.isAdmin },
          },
          { prisma: ctx.prisma, storage: ctx.storage },
        );
      } catch (err) {
        mapAttachmentError(err);
      }
    }),

  /**
   * 첨부 파일 목록 조회.
   */
  list: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive().optional(),
        commentId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => listAttachments(input, { prisma: ctx.prisma })),
});
