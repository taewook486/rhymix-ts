/**
 * packages/file/src/server/router.ts
 *
 * tRPC 라우터 팩토리 — SPEC-FILE-001 Slice B (REQ-FILE-070~078).
 *
 * apps/web 에서 사용하는 공통 파일 라우터를 패키지 레벨에서 제공.
 * 순환 의존성 방지를 위해 팩토리 함수 형태로 내보낸다.
 *
 * @MX:NOTE [AUTO]: 팩토리 패턴을 사용하여 apps/web에 대한 의존성 제거.
 * @MX:REASON: packages/file는 apps/web을 직접 import할 수 없음(단방향 의존).
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type {
  TRPCRouterRecord,
  AnyProcedure,
} from '@trpc/server';
import type { PrismaClient, FileAttachment } from '@prisma/client';
import {
  requestUpload as requestUploadDomain,
  completeUpload as completeUploadDomain,
  deleteAttachment as deleteAttachmentDomain,
  listAttachments,
  AttachmentOwnershipError,
  UploadHeadMismatchError,
  VirusDetectedError,
  InvalidUploadTokenError,
  UnsupportedMimeTypeError,
  FileTooLargeError,
  type RequestUploadInput,
  type RequestUploadResult,
  type CompleteUploadInput,
  type DeleteAttachmentInput,
} from '../attachment.js';

// Prisma 확장 타입 (FileAttachment 모델)
interface PrismaWithFileAttachment {
  fileAttachment: {
    findUnique(args: { where: { id: number } }): Promise<FileAttachment & { memberId: string | null; storageKey: string }>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<FileAttachment[]>;
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<FileAttachment>;
  };
}

// ---------------------------------------------------------------------------
// 도메인 예외를 TRPCError 로 변환하는 헬퍼
// ---------------------------------------------------------------------------

/**
 * 도메인 계층에서 발생한 에러를 tRPC 에러로 변환한다.
 */
function mapDomainError(err: unknown): never {
  if (err instanceof AttachmentOwnershipError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof UploadHeadMismatchError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof VirusDetectedError) {
    // UNPROCESSABLE_CONTENT가 없으면 FORBIDDEN 사용
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof InvalidUploadTokenError) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: err.message });
  }
  if (err instanceof UnsupportedMimeTypeError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof FileTooLargeError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Actor 빌더 헬퍼
// ---------------------------------------------------------------------------

/**
 * 세션에서 도메인 함수가 기대하는 actor 형태를 추출한다.
 */
function buildActor(session: {
  user: { id: number; isAdmin: boolean };
}): { userId: number; isAdmin: boolean } {
  return {
    userId: session.user.id,
    isAdmin: session.user.isAdmin,
  };
}

// ---------------------------------------------------------------------------
// 라우터 팩토리 타입 정의
// ---------------------------------------------------------------------------

/** 공개 프로시저 컨텍스트 타입 */
type PubCtx = {
  prisma: PrismaClient;
  storage: unknown;
  tokenSecret: string;
};

/** 인증 필요 프로시저 컨텍스트 타입 */
type ProCtx = {
  prisma: PrismaClient;
  storage: unknown;
  scanner: unknown;
  tokenSecret: string;
  session: { user: { id: number; isAdmin: boolean } };
};

/**
 * tRPC 라우터 팩토리에 전달되는 빌딩 블록 타입.
 */
export interface TrpcBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: (record: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicProcedure: AnyProcedure | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protectedProcedure: AnyProcedure | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminProcedure: AnyProcedure | any;
}

// ---------------------------------------------------------------------------
// 라우터 팩토리 함수
// ---------------------------------------------------------------------------

/**
 * 파일 라우터를 생성하는 팩토리 함수.
 *
 * @param trpc - tRPC 빌딩 블록 (router, publicProcedure, protectedProcedure, adminProcedure)
 * @returns tRPC 라우터 객체
 *
 * 구현된 프로시저:
 * - getDownloadUrl({ attachmentId, variant? }) - 공개
 * - getMetadata({ attachmentId }) - 공개
 * - requestUpload({ sourceFilename, mimeType, fileSize }) - 인증 필요
 * - completeUpload({ uploadToken, uploadTargetType, uploadTargetId, ... }) - 인증 필요
 * - delete({ attachmentId }) - 인증 필요
 * - setCoverImage({ attachmentId, documentId }) - 인증 필요
 * - clearCoverImage({ attachmentId, documentId }) - 인증 필요
 * - listMyAttachments({ cursor?, limit? }) - 인증 필요
 * - admin.listOrphans({ olderThanDays?, cursor?, limit? }) - admin 필요
 * - admin.purgeOrphans({ olderThanDays }) - admin 필요
 * - admin.cascadeRebuild({ documentId?, commentId? }) - admin 필요
 */
export function createFileRouter<
  TProcedure extends AnyProcedure,
  TProtectedProcedure extends AnyProcedure,
  TAdminProcedure extends AnyProcedure
>(trpc: {
  router: <T extends TRPCRouterRecord>(record: T) => T;
  publicProcedure: TProcedure;
  protectedProcedure: TProtectedProcedure;
  adminProcedure: TAdminProcedure;
}) {
  const { router, publicProcedure, protectedProcedure, adminProcedure } = trpc;

  return router({
    /**
     * 파일 다운로드 URL 생성 — 공개.
     *
     * 첨부 파일이 속한 문서/댓글의 공개 여부를 확인하고,
     * 공개인 경우에만 presigned URL을 반환한다.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getDownloadUrl: (publicProcedure as any)
      .input(
        z.object({
          attachmentId: z.number().int().positive(),
          variant: z.enum(['original', 'thumbnail', 'medium', 'large']).optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async ({ ctx, input }: { ctx: PubCtx; input: any }) => {
        // TODO: 문서/댓글 공개 여부 확인 로직 추가 필요
        // 현재는 항상 FORBIDDEN 반환
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '첨부 파일이 속한 문서를 확인할 수 없습니다',
        });

        // 실제 구현 시:
        // const attachment = await (ctx.prisma as PrismaWithFileAttachment).fileAttachment.findUnique({
        //   where: { id: input.attachmentId },
        // });
        // if (!attachment) throw new TRPCError({ code: 'NOT_FOUND', message: '첨부 파일을 찾을 수 없습니다' });
        // // 문서/댓글 공개 여부 확인
        // const url = await getAttachmentDownloadUrl(...);
        // return { url, expiresAt };
      }),

    /**
     * 첨부 파일 메타데이터 조회 — 공개.
     *
     * storageKey, memberId, uploadedFilename 등의 내부 필드는 제외하고
     * 클라이언트에 필요한 메타데이터만 반환한다.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMetadata: (publicProcedure as any)
      .input(z.object({ attachmentId: z.number().int().positive() }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async ({ ctx, input }: { ctx: PubCtx; input: any }) => {
        const attachment = await (ctx.prisma as unknown as PrismaWithFileAttachment).fileAttachment.findUnique({
          where: { id: input.attachmentId },
        });

        if (!attachment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '첨부 파일을 찾을 수 없습니다' });
        }

        // 내부 필드 제외
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { storageKey, memberId, uploadedFilename, ...publicMetadata } = attachment;
        return publicMetadata;
      }),

    /**
     * 파일 업로드 요청 — 인증 필수.
     *
     * 1단계: presigned PUT URL 발급.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestUpload: (protectedProcedure as any)
      .input(
        z.object({
          sourceFilename: z.string().min(1).max(255),
          mimeType: z.string().min(1),
          fileSize: z.number().int().positive(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          const actor = buildActor(ctx.session);
          const requestInput: RequestUploadInput = {
            sourceFilename: input.sourceFilename,
            mimeType: input.mimeType,
            fileSize: input.fileSize,
            memberId: actor.userId.toString(),
          };

          return await requestUploadDomain(requestInput, {
            storage: ctx.storage as any,
            tokenSecret: ctx.tokenSecret,
          });
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 파일 업로드 완료 — 인증 필수.
     *
     * 2단계: 클라이언트 PUT 완료 후 검증 + scan + DB row 생성.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completeUpload: (protectedProcedure as any)
      .input(
        z.object({
          uploadToken: z.string().min(1),
          uploadTargetType: z.enum(['DOCUMENT', 'COMMENT']),
          uploadTargetId: z.number().int().positive(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          duration: z.number().int().optional(),
          directDownload: z.boolean().optional(),
          coverImage: z.boolean().optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          const completeInput: CompleteUploadInput = {
            uploadToken: input.uploadToken,
            uploadTargetType: input.uploadTargetType,
            uploadTargetId: input.uploadTargetId,
            width: input.width,
            height: input.height,
            duration: input.duration,
            directDownload: input.directDownload,
            coverImage: input.coverImage,
          };

          return await completeUploadDomain(completeInput, {
            prisma: ctx.prisma,
            storage: ctx.storage as any,
            scanner: ctx.scanner as any,
            tokenSecret: ctx.tokenSecret,
          });
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 첨부 파일 삭제 — 인증 필수.
     *
     * 소유권 검사 + S3 + DB 삭제.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: (protectedProcedure as any)
      .input(z.object({ attachmentId: z.number().int().positive() }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          const actor = buildActor(ctx.session);
          const deleteInput: DeleteAttachmentInput = {
            attachmentId: input.attachmentId,
            actor,
          };

          return await deleteAttachmentDomain(deleteInput, {
            prisma: ctx.prisma,
            storage: ctx.storage as any,
          });
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 대표 이미지 설정 — 인증 필수.
     *
     * 문서의 첨부 파일 중 하나를 대표 이미지로 지정한다.
     * 같은 문서에 속한 첨부 파일만 대표 이미지로 설정 가능하다.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCoverImage: (protectedProcedure as any)
      .input(
        z.object({
          attachmentId: z.number().int().positive(),
          documentId: z.number().int().positive(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        // TODO: Slice C backend - setCoverImage 구현 필요
        throw new Error('setCoverImage not implemented yet - Slice C');
      }),

    /**
     * 대표 이미지 해제 — 인증 필수.
     *
     * 문서의 대표 이미지 설정을 해제한다.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearCoverImage: (protectedProcedure as any)
      .input(
        z.object({
          attachmentId: z.number().int().positive(),
          documentId: z.number().int().positive(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        // TODO: Slice C backend - clearCoverImage 구현 필요
        throw new Error('clearCoverImage not implemented yet - Slice C');
      }),

    /**
     * 내 첨부 파일 목록 조회 — 인증 필수.
     *
     * cursor pagination 지원.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listMyAttachments: (protectedProcedure as any)
      .input(
        z.object({
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        // TODO: Slice C backend - listMyAttachments 구현 필요
        throw new Error('listMyAttachments not implemented yet - Slice C');
      }),

    /**
     * Admin 전용 프로시저.
     */
    admin: router({
      /**
       * 고아 파일 목록 조회 — admin 필요.
       *
       * isvalid=false 이거나 연결된 문서/댓글이 삭제된 파일을 조회한다.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listOrphans: (adminProcedure as any)
        .input(
          z.object({
            olderThanDays: z.number().int().min(0).optional(),
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(100).optional(),
          }),
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .query(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
          // TODO: Slice C backend - listOrphans 구현 필요
          throw new Error('listOrphans not implemented yet - Slice C');
        }),

      /**
       * 고아 파일 정리 — admin 필요.
       *
       * 오래된 고아 파일을 삭제한다.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      purgeOrphans: (adminProcedure as any)
        .input(z.object({ olderThanDays: z.number().int().min(0) }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
          // TODO: Slice C backend - purgeOrphans 구현 필요
          throw new Error('purgeOrphans not implemented yet - Slice C');
        }),

      /**
       * Cascade 삭제 재구축 — admin 필요.
       *
       * 문서/댓글 삭제 시 연결된 첨부 파일을 다시 soft-delete 한다.
       * 데이터 정합성 복구용.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cascadeRebuild: (adminProcedure as any)
        .input(
          z.object({
            documentId: z.number().int().positive().optional(),
            commentId: z.number().int().positive().optional(),
          }),
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
          // TODO: Slice C backend - cascadeRebuild 구현 필요
          throw new Error('cascadeRebuild not implemented yet - Slice C');
        }),
    }),
  });
}
