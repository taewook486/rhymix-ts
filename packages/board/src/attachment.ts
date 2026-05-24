/**
 * attachment.ts — SPEC-CONTENT-001 Slice E
 *
 * File Attachment 도메인 함수:
 *   - requestUpload: presigned PUT URL 발급 (DB row 미생성, orphan 방지)
 *   - completeUpload: PUT 완료 후 검증 + scan + row 생성
 *   - deleteAttachment: 소유권 검사 + S3 + DB 삭제
 *   - listAttachments: 첨부 파일 목록
 *
 * @MX:ANCHOR [AUTO]: 파일 업로드 도메인 단일 진입점.
 * @MX:REASON: apps/web tRPC 라우터 + 향후 admin/mobile 에서 호출. fan_in >= 3.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-030, 031, 032, 033, 034
 */
import { randomUUID } from 'node:crypto';
import type { PrismaClient, FileAttachment } from '@prisma/client';
import type { FileStorage } from './storage/types.js';
import type { VirusScanner } from './storage/types.js';
import { assertMimeAllowed, assertSizeAllowed } from './storage/mime.js';
import { signUploadToken, verifyUploadToken } from './storage/upload-token.js';

// Re-export error classes for consumers
export { UnsupportedMimeTypeError, FileTooLargeError } from './storage/mime.js';
export { InvalidUploadTokenError } from './storage/upload-token.js';

/**
 * 업로드 head 불일치 에러 (PUT 미수행 또는 사이즈/MIME 불일치)
 */
export class UploadHeadMismatchError extends Error {
  readonly code = 'UPLOAD_HEAD_MISMATCH' as const;
  constructor(reason: string) {
    super(`업로드 파일 불일치: ${reason}`);
    this.name = 'UploadHeadMismatchError';
  }
}

/**
 * 바이러스 검출 에러
 */
export class VirusDetectedError extends Error {
  readonly code = 'VIRUS_DETECTED' as const;
  constructor(public readonly threats: string[]) {
    super(`바이러스 검출: ${threats.join(', ')}`);
    this.name = 'VirusDetectedError';
  }
}

/**
 * 첨부 파일 소유권 에러
 */
export class AttachmentOwnershipError extends Error {
  readonly code = 'ATTACHMENT_OWNERSHIP_DENIED' as const;
  constructor() {
    super('파일 삭제 권한이 없습니다.');
    this.name = 'AttachmentOwnershipError';
  }
}

export interface RequestUploadInput {
  sourceFilename: string;
  mimeType: string;
  fileSize: number;
  memberId: string;
}

export interface RequestUploadResult {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  storageKey: string;
  uploadToken: string;
  expiresAt: Date;
}

/**
 * 1단계: presigned PUT URL 발급.
 *
 * MIME 화이트리스트 + 사이즈 검증 → 통과 시 storageKey + uploadToken 발급.
 * DB row 는 이 시점에 생성하지 않는다 (orphan 방지).
 */
export async function requestUpload(
  input: RequestUploadInput,
  ctx: { storage: FileStorage; tokenSecret: string },
): Promise<RequestUploadResult> {
  // MIME + 사이즈 검증
  assertMimeAllowed(input.mimeType);
  assertSizeAllowed(input.mimeType, input.fileSize);

  // storageKey 생성: attachments/{yyyy}/{mm}/{uuid}.{ext}
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ext = input.sourceFilename.split('.').pop() ?? 'bin';
  const uuid = randomUUID();
  const storageKey = `attachments/${yyyy}/${mm}/${uuid}.${ext}`;

  // presigned URL 발급
  const presign = await ctx.storage.getUploadPresignedUrl({
    key: storageKey,
    contentType: input.mimeType,
    contentLength: input.fileSize,
    expiresIn: 300,
  });

  // HMAC-SHA256 업로드 토큰 생성 (TTL 10분)
  const ttlSeconds = 600;
  const uploadToken = signUploadToken(
    {
      storageKey,
      sourceFilename: input.sourceFilename,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      memberId: input.memberId,
    },
    ctx.tokenSecret,
    ttlSeconds,
  );

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  return {
    url: presign.url,
    method: presign.method,
    headers: presign.headers,
    storageKey,
    uploadToken,
    expiresAt,
  };
}

export interface CompleteUploadInput {
  uploadToken: string;
  uploadTargetType: 'DOCUMENT' | 'COMMENT';
  uploadTargetId: number;
  width?: number;
  height?: number;
  duration?: number;
  directDownload?: boolean;
  coverImage?: boolean;
}

/**
 * 2단계: 클라이언트 PUT 완료 후 검증 + scan + DB row 생성.
 *
 * @MX:WARN [AUTO]: 다단계 작업 (token 검증 → head → scan → tx) — 부분 실패 시 orphan 위험.
 * @MX:REASON: virus 검출 시 storage.delete 가 실패하면 dangling object.
 *             cleanup cron 으로 처리 필요 (SPEC-INFRA-001 이월).
 */
export async function completeUpload(
  input: CompleteUploadInput,
  ctx: { prisma: PrismaClient; storage: FileStorage; scanner: VirusScanner; tokenSecret: string },
): Promise<FileAttachment> {
  // 1) 토큰 검증 + payload 추출
  const payload = verifyUploadToken(input.uploadToken, ctx.tokenSecret);

  // 2) storage.head 로 실제 업로드 확인
  const headResult = await ctx.storage.head(payload.storageKey);
  if (!headResult) {
    throw new UploadHeadMismatchError('파일이 스토리지에 존재하지 않습니다 (PUT 미수행)');
  }

  // 3) 선언 사이즈 vs 실제 사이즈 검증
  if (headResult.size !== payload.fileSize) {
    throw new UploadHeadMismatchError(
      `사이즈 불일치: 선언 ${payload.fileSize} bytes, 실제 ${headResult.size} bytes`,
    );
  }

  // 4) 바이러스 스캔
  const scanResult = await ctx.scanner.scan({
    storageKey: payload.storageKey,
    storage: ctx.storage,
    knownContentType: payload.mimeType,
    knownSize: payload.fileSize,
  });

  if (!scanResult.clean) {
    // 보상 트랜잭션: 감염된 파일 삭제
    try {
      await ctx.storage.delete(payload.storageKey);
    } catch {
      // storage.delete 실패 시 dangling object — cleanup cron 에서 처리
    }
    throw new VirusDetectedError(scanResult.threats ?? []);
  }

  // 5) 단일 트랜잭션: FileAttachment row 생성 + Document.uploadedCount +1
  const uploadedFilename = payload.storageKey.split('/').pop() ?? payload.storageKey;

  const attachment = await (ctx.prisma as unknown as PrismaWithFileAttachment).$transaction(
    async (tx) => {
      const created = await (tx as PrismaWithFileAttachment).fileAttachment.create({
        data: {
          storageKey: payload.storageKey,
          sourceFilename: payload.sourceFilename,
          uploadedFilename,
          mimeType: payload.mimeType,
          fileSize: BigInt(payload.fileSize),
          memberId: payload.memberId,
          uploadTargetType: input.uploadTargetType,
          ...(input.uploadTargetType === 'DOCUMENT'
            ? { documentId: input.uploadTargetId }
            : { commentId: input.uploadTargetId }),
          isvalid: true,
          width: input.width ?? null,
          height: input.height ?? null,
          duration: input.duration ?? null,
          directDownload: input.directDownload ?? false,
          coverImage: input.coverImage ?? false,
        },
      });

      // Document.uploadedCount +1
      if (input.uploadTargetType === 'DOCUMENT') {
        await (tx as PrismaWithFileAttachment).document.update({
          where: { id: input.uploadTargetId },
          data: { uploadedCount: { increment: 1 } },
        });
      }

      return created;
    },
  );

  return attachment;
}

export interface DeleteAttachmentInput {
  attachmentId: number;
  actor: { userId: number; isAdmin: boolean };
}

/**
 * 첨부 파일 삭제 — 소유권 검사 + S3 + DB 삭제.
 */
export async function deleteAttachment(
  input: DeleteAttachmentInput,
  ctx: { prisma: PrismaClient; storage: FileStorage },
): Promise<{ attachmentId: number }> {
  const attachment = await (
    ctx.prisma as unknown as PrismaWithFileAttachment
  ).fileAttachment.findUniqueOrThrow({ where: { id: input.attachmentId } });

  // 소유권 검사
  if (!input.actor.isAdmin && attachment.memberId !== input.actor.userId.toString()) {
    throw new AttachmentOwnershipError();
  }

  // storage 삭제 먼저 (orphan storage < dangling DB 가 더 안전)
  try {
    await ctx.storage.delete(attachment.storageKey);
  } catch {
    // storage 삭제 실패 시 DB 는 삭제하지 않음 (일관성 유지)
    throw new Error(`스토리지 파일 삭제 실패: ${attachment.storageKey}`);
  }

  await (ctx.prisma as unknown as PrismaWithFileAttachment).fileAttachment.delete({
    where: { id: input.attachmentId },
  });

  return { attachmentId: input.attachmentId };
}

/**
 * 첨부 파일 목록 조회.
 */
export async function listAttachments(
  input: { documentId?: number; commentId?: number },
  ctx: { prisma: PrismaClient },
): Promise<FileAttachment[]> {
  return (ctx.prisma as unknown as PrismaWithFileAttachment).fileAttachment.findMany({
    where: {
      ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
      ...(input.commentId !== undefined ? { commentId: input.commentId } : {}),
    },
    orderBy: { regdate: 'asc' },
  });
}

// Prisma 확장 타입 (FileAttachment 모델)
interface PrismaWithFileAttachment {
  fileAttachment: {
    create(args: { data: Record<string, unknown> }): Promise<FileAttachment>;
    findUniqueOrThrow(args: { where: { id: number } }): Promise<FileAttachment & { memberId: string | null; storageKey: string }>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<FileAttachment[]>;
    delete(args: { where: { id: number } }): Promise<FileAttachment>;
  };
  document: {
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: PrismaWithFileAttachment) => Promise<T>): Promise<T>;
}
