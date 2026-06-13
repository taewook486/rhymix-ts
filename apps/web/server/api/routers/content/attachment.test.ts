/**
 * Specification tests for content.attachment tRPC router — SPEC-CONTENT-001 Slice E.
 *
 * C-1: content.attachment.requestUpload 정상 → { url, uploadToken, ... } 반환.
 * C-2: content.attachment.complete 정상 → row 생성.
 * C-3: requestUpload 미인증 → UNAUTHORIZED.
 * C-4: requestUpload MIME 위반 → BAD_REQUEST.
 * C-5: requestUpload rate limit 초과 → TOO_MANY_REQUESTS.
 * C-6: complete 위변조 token → UNAUTHORIZED.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Domain mocks
const mockRequestUpload = vi.fn();
const mockCompleteUpload = vi.fn();
const mockDeleteAttachment = vi.fn();
const mockListAttachments = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockRecordAttempt = vi.fn();

vi.mock('@rhymix-ts/board', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rhymix-ts/board')>();
  return {
    ...actual,
    requestUpload: (...args: unknown[]) => mockRequestUpload(...args),
    completeUpload: (...args: unknown[]) => mockCompleteUpload(...args),
    deleteAttachment: (...args: unknown[]) => mockDeleteAttachment(...args),
    listAttachments: (...args: unknown[]) => mockListAttachments(...args),
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
    recordAttempt: (...args: unknown[]) => mockRecordAttempt(...args),
  };
});

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
  contentRateLimit: {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
    findFirst: vi.fn().mockResolvedValue(null),
  },
};

const mockStorage = {
  getUploadPresignedUrl: vi.fn(),
  getDownloadUrl: vi.fn(),
  delete: vi.fn(),
  head: vi.fn(),
};

const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
  prisma: mockPrisma,
  ip: '1.2.3.4',
  userAgent: 'test',
  storage: mockStorage,
  scanner: { scan: vi.fn().mockResolvedValue({ clean: true, scannedAt: new Date() }) },
  uploadTokenSecret: 'test-secret-32-bytes-minimum-ok',
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '1.2.3.4',
  userAgent: 'test',
  storage: mockStorage,
  scanner: { scan: vi.fn() },
  uploadTokenSecret: 'test-secret-32-bytes-minimum-ok',
};

describe('content.attachment tRPC router (Slice E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(undefined);
    mockRecordAttempt.mockResolvedValue(undefined);
  });

  // C-1: requestUpload 정상
  it('C-1: requestUpload 정상 → { url, uploadToken, storageKey } 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');

    mockRequestUpload.mockResolvedValue({
      url: 'https://s3.example.com/put/test',
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      storageKey: 'attachments/2024/01/uuid.png',
      uploadToken: 'token.payload.sig',
      expiresAt: new Date(),
    });

    const caller = createCallerFactory(contentAttachmentRouter)(memberCtx as never);
    const result = await caller.requestUpload({
      sourceFilename: 'test.png',
      mimeType: 'image/png',
      fileSize: 1024 * 1024,
    });

    expect(result.url).toBeTruthy();
    expect(result.uploadToken).toBe('token.payload.sig');
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'attachment.upload' }),
      expect.anything(),
    );
    expect(mockRecordAttempt).toHaveBeenCalled();
  });

  // C-2: complete 정상
  it('C-2: complete 정상 → FileAttachment row 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');

    const mockAttachment = {
      id: 10,
      storageKey: 'attachments/2024/01/uuid.png',
      memberId: '42',
    };
    mockCompleteUpload.mockResolvedValue(mockAttachment);

    const caller = createCallerFactory(contentAttachmentRouter)(memberCtx as never);
    const result = await caller.complete({
      uploadToken: 'valid.token.here',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result).toMatchObject({ storageKey: 'attachments/2024/01/uuid.png' });
  });

  // C-3: 미인증 → UNAUTHORIZED (protectedProcedure 자동 처리)
  it('C-3: requestUpload 미인증 → UNAUTHORIZED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');

    const caller = createCallerFactory(contentAttachmentRouter)(guestCtx as never);
    await expect(
      caller.requestUpload({ sourceFilename: 'test.png', mimeType: 'image/png', fileSize: 1024 }),
    ).rejects.toThrow(TRPCError);
    await expect(
      caller.requestUpload({ sourceFilename: 'test.png', mimeType: 'image/png', fileSize: 1024 }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  // C-4: MIME 위반 → BAD_REQUEST (mapAttachmentError 변환)
  it('C-4: requestUpload MIME 위반 → BAD_REQUEST', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');
    const { UnsupportedMimeTypeError } = await import('@rhymix-ts/file');

    mockRequestUpload.mockRejectedValue(
      new UnsupportedMimeTypeError('application/x-msdownload', ['image/png']),
    );

    const caller = createCallerFactory(contentAttachmentRouter)(memberCtx as never);
    await expect(
      caller.requestUpload({
        sourceFilename: 'evil.exe',
        mimeType: 'application/x-msdownload',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  // C-5: rate limit 초과 → TOO_MANY_REQUESTS
  it('C-5: requestUpload rate limit 초과 → TOO_MANY_REQUESTS', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');
    const { RateLimitedError } = await import('@rhymix-ts/board');

    mockCheckRateLimit.mockRejectedValue(new RateLimitedError('attachment.upload', 1800));

    const caller = createCallerFactory(contentAttachmentRouter)(memberCtx as never);
    await expect(
      caller.requestUpload({ sourceFilename: 'test.png', mimeType: 'image/png', fileSize: 1024 }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });

  // C-6: 위변조 token → UNAUTHORIZED
  it('C-6: complete 위변조 token → UNAUTHORIZED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');
    const { InvalidUploadTokenError } = await import('@rhymix-ts/file');

    mockCompleteUpload.mockRejectedValue(new InvalidUploadTokenError('서명 불일치'));

    const caller = createCallerFactory(contentAttachmentRouter)(memberCtx as never);
    await expect(
      caller.complete({
        uploadToken: 'forged.token.here',
        uploadTargetType: 'DOCUMENT',
        uploadTargetId: 1,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('list → listAttachments 호출', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentAttachmentRouter } = await import('./attachment');

    mockListAttachments.mockResolvedValue([{ id: 1 }]);

    const caller = createCallerFactory(contentAttachmentRouter)(memberCtx as never);
    const result = await caller.list({ documentId: 1 });
    expect(result).toHaveLength(1);
  });
});
