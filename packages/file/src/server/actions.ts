/**
 * packages/file/src/server/actions.ts
 *
 * Next.js Server Actions — SPEC-FILE-001 Slice B (REQ-FILE-080~083).
 *
 * Server Actions는 RSC에서 직접 호출 가능한 서버 사이드 함수.
 * 클라이언트 컴포넌트에서 form 제출 등에 사용.
 *
 * @MX:NOTE [AUTO]: Server Actions는 tRPC와 별개의 인터페이스.
 * @MX:REASON: RSC form 제출에 최적화된 "use server" 진입점 제공.
 */
'use server';

import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import {
  requestUpload as requestUploadDomain,
  completeUpload as completeUploadDomain,
  deleteAttachment as deleteAttachmentDomain,
  AttachmentOwnershipError,
  UploadHeadMismatchError,
  VirusDetectedError,
  InvalidUploadTokenError,
  UnsupportedMimeTypeError,
  FileTooLargeError,
  type RequestUploadInput,
  type CompleteUploadInput,
  type DeleteAttachmentInput,
} from '../attachment';

// ---------------------------------------------------------------------------
// ActionResult 타입
// ---------------------------------------------------------------------------

/**
 * Server Action의 결과 타입.
 * 성공 시 { ok: true; data: T }, 실패 시 { ok: false; error: string; code? }.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

// ---------------------------------------------------------------------------
// 세션 및 Prisma 컨텍스트 헬퍼
// ---------------------------------------------------------------------------

/**
 * Server Action에서 세션을 가져온다.
 *
 * apps/web/lib/auth/config.ts의 auth()를 호출하여 세션을 가져온다.
 */
async function getSession(): Promise<{ userId: number; isAdmin: boolean } | null> {
  try {
    const { auth } = await import('@/lib/auth/config');
    const session = await auth();
    if (!session?.user) {
      return null;
    }
    return {
      userId: session.user.id,
      isAdmin: session.user.isAdmin,
    };
  } catch {
    // 모듈 로드 실패 또는 auth 설정이 없는 경우
    return null;
  }
}

/**
 * Server Action에서 Prisma 클라이언트를 가져온다.
 *
 * apps/web/lib/db/prisma.ts의 prisma를 가져온다.
 */
async function getPrisma(): Promise<PrismaClient> {
  try {
    const { prisma } = await import('@/lib/db/prisma');
    return prisma;
  } catch {
    throw new Error('Prisma client not available');
  }
}

/**
 * Server Action에서 Storage를 가져온다.
 *
 * @rhymix-ts/file의 getStorage()를 호출하여 싱글턴 인스턴스를 가져온다.
 */
async function getStorage() {
  try {
    const { getStorage } = await import('@rhymix-ts/file');
    return getStorage();
  } catch {
    throw new Error('Storage not available');
  }
}

/**
 * Server Action에서 Scanner를 가져온다.
 *
 * @rhymix-ts/file의 getScanner()를 호출하여 싱글턴 인스턴스를 가져온다.
 */
async function getScanner() {
  try {
    const { getScanner } = await import('@rhymix-ts/file');
    return getScanner();
  } catch {
    throw new Error('Scanner not available');
  }
}

/**
 * Server Action에서 token secret을 가져온다.
 *
 * 환경변수 UPLOAD_TOKEN_SECRET에서 값을 읽어온다.
 */
function getTokenSecret(): string {
  return process.env.UPLOAD_TOKEN_SECRET ?? 'default-secret-change-in-production';
}

// ---------------------------------------------------------------------------
// Actor 빌더
// ---------------------------------------------------------------------------

function buildActor(session: { userId: number; isAdmin: boolean }) {
  return {
    userId: session.userId,
    isAdmin: session.isAdmin,
  };
}

// ---------------------------------------------------------------------------
// Error 매핑
// ---------------------------------------------------------------------------

function mapErrorToActionResult(err: unknown): ActionResult<never> {
  if (err instanceof AttachmentOwnershipError) {
    return { ok: false, error: err.message, code: 'FORBIDDEN' };
  }
  if (err instanceof UploadHeadMismatchError) {
    return { ok: false, error: err.message, code: 'BAD_REQUEST' };
  }
  if (err instanceof VirusDetectedError) {
    return { ok: false, error: err.message, code: 'FORBIDDEN' };
  }
  if (err instanceof InvalidUploadTokenError) {
    return { ok: false, error: err.message, code: 'UNAUTHORIZED' };
  }
  if (err instanceof UnsupportedMimeTypeError) {
    return { ok: false, error: err.message, code: 'BAD_REQUEST' };
  }
  if (err instanceof FileTooLargeError) {
    return { ok: false, error: err.message, code: 'BAD_REQUEST' };
  }
  if (err instanceof z.ZodError) {
    return { ok: false, error: 'Invalid input: ' + err.message, code: 'BAD_REQUEST' };
  }
  return { ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' };
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * requestUpload — 파일 업로드 요청 Server Action.
 *
 * 1단계: presigned PUT URL 발급.
 *
 * @param input - 업로드 요청 정보
 * @returns ActionResult<RequestUploadResult>
 */
export async function requestUploadAction(
  input: {
    sourceFilename: string;
    mimeType: string;
    fileSize: number;
  },
): Promise<ActionResult<{ url: string; uploadToken: string; expiresAt: Date }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const prisma = await getPrisma();
    const storage = await getStorage();
    const tokenSecret = getTokenSecret();

    const actor = buildActor(session);
    const requestInput: RequestUploadInput = {
      sourceFilename: input.sourceFilename,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      memberId: actor.userId.toString(),
    };

    const result = await requestUploadDomain(requestInput, {
      storage,
      tokenSecret,
    });

    return {
      ok: true,
      data: {
        url: result.url,
        uploadToken: result.uploadToken,
        expiresAt: result.expiresAt,
      },
    };
  } catch (err) {
    return mapErrorToActionResult(err);
  }
}

/**
 * completeUpload — 파일 업로드 완료 Server Action.
 *
 * 2단계: 클라이언트 PUT 완료 후 검증 + scan + DB row 생성.
 *
 * @param input - 업로드 완료 정보
 * @returns ActionResult<{ attachmentId: number }>
 */
export async function completeUploadAction(
  input: {
    uploadToken: string;
    uploadTargetType: 'DOCUMENT' | 'COMMENT';
    uploadTargetId: number;
    width?: number;
    height?: number;
    duration?: number;
    directDownload?: boolean;
    coverImage?: boolean;
  },
): Promise<ActionResult<{ attachmentId: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const prisma = await getPrisma();
    const storage = await getStorage();
    const scanner = await getScanner();
    const tokenSecret = getTokenSecret();

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

    const attachment = await completeUploadDomain(completeInput, {
      prisma,
      storage,
      scanner,
      tokenSecret,
    });

    return { ok: true, data: { attachmentId: attachment.id } };
  } catch (err) {
    return mapErrorToActionResult(err);
  }
}

/**
 * deleteAttachment — 첨부 파일 삭제 Server Action.
 *
 * 소유권 검사 + S3 + DB 삭제.
 *
 * @param input - 삭제할 첨부 파일 ID
 * @returns ActionResult<{ attachmentId: number }>
 */
export async function deleteAttachmentAction(
  input: { attachmentId: number },
): Promise<ActionResult<{ attachmentId: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const prisma = await getPrisma();
    const storage = await getStorage();

    const actor = buildActor(session);
    const deleteInput: DeleteAttachmentInput = {
      attachmentId: input.attachmentId,
      actor,
    };

    const result = await deleteAttachmentDomain(deleteInput, {
      prisma,
      storage,
    });

    return { ok: true, data: { attachmentId: result.attachmentId } };
  } catch (err) {
    return mapErrorToActionResult(err);
  }
}

/**
 * setCoverImage — 대표 이미지 설정 Server Action.
 *
 * 문서의 첨부 파일 중 하나를 대표 이미지로 지정한다.
 *
 * REQ-FILE-045 구현 후 완료 예정.
 *
 * @param input - 대표 이미지 설정 정보
 * @returns ActionResult<{ attachmentId: number }>
 */
export async function setCoverImageAction(
  input: { attachmentId: number; documentId: number },
): Promise<ActionResult<{ attachmentId: number }>> {
  // TODO: Slice C backend - setCoverImage 구현 필요
  return { ok: false, error: 'setCoverImage not implemented yet - Slice C', code: 'NOT_IMPLEMENTED' };
}
