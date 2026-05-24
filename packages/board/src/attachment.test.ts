/**
 * attachment.test.ts — SPEC-CONTENT-001 Slice E
 *
 * A-1 ~ A-12: requestUpload, completeUpload, deleteAttachment, listAttachments 검증.
 *
 * REQ-CONTENT-030~034: file upload lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestUpload,
  completeUpload,
  deleteAttachment,
  listAttachments,
  UnsupportedMimeTypeError,
  FileTooLargeError,
  InvalidUploadTokenError,
  UploadHeadMismatchError,
  VirusDetectedError,
  AttachmentOwnershipError,
} from './attachment.js';
import { InMemoryStorage } from './storage/memory.js';
import { NoopScanner, FakeMalwareScanner } from './storage/scanner.js';
import { signUploadToken } from './storage/upload-token.js';

const TEST_SECRET = 'test-secret-32-bytes-minimum-ok';

// ---------------------------------------------------------------------------
// Prisma mock 빌더
// ---------------------------------------------------------------------------

function makeDocument(overrides = {}) {
  return {
    id: 1,
    uploadedCount: 0,
    ...overrides,
  };
}

function makeAttachment(overrides = {}) {
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
    isvalid: true,
    regdate: new Date(),
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    fileAttachment: {
      create: vi.fn().mockResolvedValue(makeAttachment()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(makeAttachment()),
      findMany: vi.fn().mockResolvedValue([makeAttachment()]),
      delete: vi.fn().mockResolvedValue(makeAttachment()),
    },
    document: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(makeDocument()),
      update: vi.fn().mockResolvedValue(makeDocument({ uploadedCount: 1 })),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        fileAttachment: {
          create: vi.fn().mockResolvedValue(makeAttachment()),
          delete: vi.fn().mockResolvedValue(makeAttachment()),
        },
        document: {
          update: vi.fn().mockResolvedValue(makeDocument({ uploadedCount: 1 })),
        },
      };
      return fn(tx);
    }),
    ...overrides,
  };
}

describe('requestUpload', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  // A-1: requestUpload 정상 → { url, storageKey, uploadToken, expiresAt } 반환
  it('A-1: requestUpload 정상 → url, storageKey, uploadToken, expiresAt 반환', async () => {
    const result = await requestUpload(
      {
        sourceFilename: 'test.png',
        mimeType: 'image/png',
        fileSize: 1024 * 1024,
        memberId: '42',
      },
      { storage, tokenSecret: TEST_SECRET },
    );

    expect(result.url).toBeTruthy();
    expect(result.storageKey).toMatch(/^attachments\//);
    expect(result.uploadToken).toBeTruthy();
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.method).toBe('PUT');
  });

  it('A-1: uploadToken 은 동일 secret 으로 검증 가능', async () => {
    const result = await requestUpload(
      {
        sourceFilename: 'test.png',
        mimeType: 'image/png',
        fileSize: 1024,
        memberId: '42',
      },
      { storage, tokenSecret: TEST_SECRET },
    );

    const { verifyUploadToken } = await import('./storage/upload-token.js');
    const payload = verifyUploadToken(result.uploadToken, TEST_SECRET);
    expect(payload.mimeType).toBe('image/png');
    expect(payload.memberId).toBe('42');
    expect(payload.storageKey).toBe(result.storageKey);
  });

  // A-2: 허용되지 않는 MIME → UnsupportedMimeTypeError
  it('A-2: 화이트리스트 외 MIME → UnsupportedMimeTypeError', async () => {
    await expect(
      requestUpload(
        {
          sourceFilename: 'evil.exe',
          mimeType: 'application/x-msdownload',
          fileSize: 1024,
          memberId: '42',
        },
        { storage, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(UnsupportedMimeTypeError);
  });

  // A-3: 사이즈 초과 → FileTooLargeError
  it('A-3: 사이즈 초과 (image/png, 11MB) → FileTooLargeError', async () => {
    await expect(
      requestUpload(
        {
          sourceFilename: 'huge.png',
          mimeType: 'image/png',
          fileSize: 11 * 1024 * 1024,
          memberId: '42',
        },
        { storage, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(FileTooLargeError);
  });
});

describe('completeUpload', () => {
  let storage: InMemoryStorage;
  let noopScanner: NoopScanner;

  beforeEach(() => {
    storage = new InMemoryStorage();
    noopScanner = new NoopScanner();
  });

  function makeToken(overrides: Record<string, unknown> = {}) {
    return signUploadToken(
      {
        storageKey: 'attachments/2024/01/uuid.png',
        sourceFilename: 'test.png',
        mimeType: 'image/png',
        fileSize: 1024,
        memberId: '42',
        ...overrides,
      } as Parameters<typeof signUploadToken>[0],
      TEST_SECRET,
    );
  }

  // A-4: 정상 흐름 — storage head 일치 + NoopScanner clean → row 생성
  it('A-4: completeUpload 정상 → FileAttachment row 생성', async () => {
    const key = 'attachments/2024/01/uuid.png';
    storage.put(key, Buffer.alloc(1024), 'image/png');

    const token = makeToken();
    const prisma = makePrisma();

    const result = await completeUpload(
      {
        uploadToken: token,
        uploadTargetType: 'DOCUMENT',
        uploadTargetId: 1,
      },
      { prisma: prisma as never, storage, scanner: noopScanner, tokenSecret: TEST_SECRET },
    );

    expect(result).toBeTruthy();
    expect(result.storageKey).toBe(key);
  });

  // A-5: token 위변조 → InvalidUploadTokenError
  it('A-5: 위변조 토큰 → InvalidUploadTokenError', async () => {
    await expect(
      completeUpload(
        {
          uploadToken: 'forged.token.here',
          uploadTargetType: 'DOCUMENT',
          uploadTargetId: 1,
        },
        { prisma: makePrisma() as never, storage, scanner: noopScanner, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(InvalidUploadTokenError);
  });

  // A-6: token 만료 → InvalidUploadTokenError
  it('A-6: 만료된 토큰 → InvalidUploadTokenError', async () => {
    // exp = 과거 시간 직접 설정
    const expiredToken = signUploadToken(
      {
        storageKey: 'attachments/2024/01/uuid.png',
        sourceFilename: 'test.png',
        mimeType: 'image/png',
        fileSize: 1024,
        memberId: '42',
      },
      TEST_SECRET,
      -1, // 이미 만료
    );

    await expect(
      completeUpload(
        {
          uploadToken: expiredToken,
          uploadTargetType: 'DOCUMENT',
          uploadTargetId: 1,
        },
        { prisma: makePrisma() as never, storage, scanner: noopScanner, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(InvalidUploadTokenError);
  });

  // A-7: storage.head null (클라이언트 PUT 안 함) → UploadHeadMismatchError
  it('A-7: storage head null (PUT 미수행) → UploadHeadMismatchError', async () => {
    const token = makeToken();
    // storage 에 파일을 넣지 않음

    await expect(
      completeUpload(
        {
          uploadToken: token,
          uploadTargetType: 'DOCUMENT',
          uploadTargetId: 1,
        },
        { prisma: makePrisma() as never, storage, scanner: noopScanner, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(UploadHeadMismatchError);
  });

  // A-8: 선언 사이즈 != 실제 사이즈 → UploadHeadMismatchError
  it('A-8: 선언 사이즈 != 실제 사이즈 → UploadHeadMismatchError', async () => {
    const key = 'attachments/2024/01/uuid.png';
    storage.put(key, Buffer.alloc(2048), 'image/png'); // 실제 2048

    const token = makeToken({ fileSize: 1024 }); // 선언 1024

    await expect(
      completeUpload(
        {
          uploadToken: token,
          uploadTargetType: 'DOCUMENT',
          uploadTargetId: 1,
        },
        { prisma: makePrisma() as never, storage, scanner: noopScanner, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(UploadHeadMismatchError);
  });

  // A-9: virus 검출 (FakeMalwareScanner) → storage.delete 호출 + VirusDetectedError + row 미생성
  it('A-9: virus 검출 → storage.delete 호출 + VirusDetectedError + row 미생성', async () => {
    const key = 'attachments/2024/01/uuid.png';
    storage.put(key, Buffer.alloc(1024), 'image/png');

    const token = makeToken();
    const malwareScanner = new FakeMalwareScanner();
    const prisma = makePrisma();

    await expect(
      completeUpload(
        {
          uploadToken: token,
          uploadTargetType: 'DOCUMENT',
          uploadTargetId: 1,
        },
        { prisma: prisma as never, storage, scanner: malwareScanner, tokenSecret: TEST_SECRET },
      ),
    ).rejects.toThrow(VirusDetectedError);

    // storage 에서 파일이 삭제되어야 함 (보상 트랜잭션)
    expect(await storage.head(key)).toBeNull();

    // DB row 는 생성되지 않아야 함
    const txFn = vi.mocked(prisma.$transaction);
    expect(txFn).not.toHaveBeenCalled();
  });
});

describe('deleteAttachment', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    storage.put('attachments/2024/01/uuid.png', Buffer.alloc(1024), 'image/png');
  });

  // A-10: 본인 삭제 → storage + DB 동시 삭제
  it('A-10: 본인 삭제 → storage + DB 삭제', async () => {
    const prisma = makePrisma();
    const result = await deleteAttachment(
      { attachmentId: 10, actor: { userId: 42, isAdmin: false } },
      { prisma: prisma as never, storage },
    );
    expect(result.attachmentId).toBe(10);
  });

  // A-11: 타인 비admin → AttachmentOwnershipError
  it('A-11: 타인 비admin → AttachmentOwnershipError', async () => {
    const prisma = makePrisma({
      fileAttachment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(makeAttachment({ memberId: '99' })),
        delete: vi.fn(),
      },
    });
    await expect(
      deleteAttachment(
        { attachmentId: 10, actor: { userId: 1, isAdmin: false } }, // userId=1, 소유자=99
        { prisma: prisma as never, storage },
      ),
    ).rejects.toThrow(AttachmentOwnershipError);
  });

  it('admin 은 타인 파일도 삭제 가능', async () => {
    const prisma = makePrisma({
      fileAttachment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(makeAttachment({ memberId: '99' })),
        delete: vi.fn().mockResolvedValue(makeAttachment()),
      },
    });
    await expect(
      deleteAttachment(
        { attachmentId: 10, actor: { userId: 1, isAdmin: true } },
        { prisma: prisma as never, storage },
      ),
    ).resolves.not.toThrow();
  });
});

describe('listAttachments', () => {
  // A-12: listAttachments(documentId) → 해당 문서 첨부 목록
  it('A-12: listAttachments({ documentId }) → 목록 반환', async () => {
    const prisma = makePrisma({
      fileAttachment: {
        findMany: vi.fn().mockResolvedValue([makeAttachment(), makeAttachment({ id: 11 })]),
      },
    });
    const result = await listAttachments({ documentId: 1 }, { prisma: prisma as never });
    expect(result).toHaveLength(2);
    expect(prisma.fileAttachment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ documentId: 1 }),
      }),
    );
  });

  it('listAttachments({ commentId }) → 댓글 첨부 목록 반환', async () => {
    const prisma = makePrisma({
      fileAttachment: {
        findMany: vi.fn().mockResolvedValue([makeAttachment({ commentId: 5 })]),
      },
    });
    const result = await listAttachments({ commentId: 5 }, { prisma: prisma as never });
    expect(result).toHaveLength(1);
  });
});
