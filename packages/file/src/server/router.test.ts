/**
 * router.test.ts — SPEC-FILE-001 (REQ-FILE-091) 파일 라우터 실측 테스트.
 *
 * 이 파일은 ./router 를 값으로 import 하여 실제 프로시저를 실행한다.
 * (2026-08-23 전면 재작성 — 이전 버전은 라우터를 import 하지 않고
 *  도메인 복제물을 검사하는 테스트여서 커버리지 0% 였다.)
 *
 * 테스트 전략:
 * - createFileRouter 에 실제 initTRPC 빌더를 주입해 실제 tRPC 런타임에서 호출한다
 *   (apps/web/server/api/trpc.ts 의 requireAuth/requireAdmin 구조를 최소 재현).
 * - 도메인 함수(../attachment, ../admin)는 협력자이므로 mock 한다.
 *   단 에러 클래스는 importOriginal spread 로 실제 클래스를 그대로 사용해
 *   mapDomainError 의 instanceof 분기가 실제 클래스를 대상으로 동작하게 한다.
 * - prisma/storage/scanner 는 ctx 주입이므로 테스트에서 가짜 객체를 전달한다.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { initTRPC, TRPCError, type AnyProcedure } from '@trpc/server';
import { createFileRouter } from './router';
import {
  AttachmentOwnershipError,
  UploadHeadMismatchError,
  VirusDetectedError,
  InvalidUploadTokenError,
  UnsupportedMimeTypeError,
  FileTooLargeError,
} from '../attachment';

// ---------------------------------------------------------------------------
// 도메인 협력자 mock — 에러 클래스 등 나머지 export 는 실제 모듈 것을 그대로 사용
// ---------------------------------------------------------------------------

const {
  mockRequestUpload,
  mockCompleteUpload,
  mockDeleteAttachment,
  mockSetCoverImage,
  mockClearCoverImage,
  mockListMyAttachments,
  mockListOrphans,
  mockPurgeOrphans,
  mockCascadeRebuild,
  mockGetStorage,
} = vi.hoisted(() => ({
  mockRequestUpload: vi.fn(),
  mockCompleteUpload: vi.fn(),
  mockDeleteAttachment: vi.fn(),
  mockSetCoverImage: vi.fn(),
  mockClearCoverImage: vi.fn(),
  mockListMyAttachments: vi.fn(),
  mockListOrphans: vi.fn(),
  mockPurgeOrphans: vi.fn(),
  mockCascadeRebuild: vi.fn(),
  mockGetStorage: vi.fn(),
}));

vi.mock('../attachment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../attachment')>();
  return {
    ...actual,
    requestUpload: (...args: unknown[]) => mockRequestUpload(...(args as Parameters<typeof mockRequestUpload>)),
    completeUpload: (...args: unknown[]) => mockCompleteUpload(...(args as Parameters<typeof mockCompleteUpload>)),
    deleteAttachment: (...args: unknown[]) => mockDeleteAttachment(...(args as Parameters<typeof mockDeleteAttachment>)),
  };
});

vi.mock('../admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../admin')>();
  return {
    ...actual,
    setCoverImage: (...args: unknown[]) => mockSetCoverImage(...(args as Parameters<typeof mockSetCoverImage>)),
    clearCoverImage: (...args: unknown[]) => mockClearCoverImage(...(args as Parameters<typeof mockClearCoverImage>)),
    listMyAttachments: (...args: unknown[]) => mockListMyAttachments(...(args as Parameters<typeof mockListMyAttachments>)),
    listOrphans: (...args: unknown[]) => mockListOrphans(...(args as Parameters<typeof mockListOrphans>)),
    purgeOrphans: (...args: unknown[]) => mockPurgeOrphans(...(args as Parameters<typeof mockPurgeOrphans>)),
    cascadeRebuild: (...args: unknown[]) => mockCascadeRebuild(...(args as Parameters<typeof mockCascadeRebuild>)),
  };
});

// router.ts 의 admin.purgeOrphans 가 직접 호출하는 싱글턴 팩토리만 mock
// (attachment.ts / admin.ts 는 ../storage/factory 를 import 하지 않으므로 부작용 없음)
vi.mock('../storage/factory', () => ({
  getStorage: (...args: unknown[]) => mockGetStorage(...(args as Parameters<typeof mockGetStorage>)),
}));

// ---------------------------------------------------------------------------
// 테스트 전용 tRPC 빌더 — 실제 initTRPC 인스턴스로 createFileRouter 구성
// ---------------------------------------------------------------------------

interface Session {
  user: { id: number; isAdmin: boolean };
}

interface TestCtx {
  prisma: unknown;
  storage: unknown;
  scanner: unknown;
  tokenSecret: string;
  session: Session | null;
}

const t = initTRPC.context<TestCtx>().create();

// apps/web 의 requireAuth 를 최소 재현 — 세션 없으면 UNAUTHORIZED
const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// apps/web 의 requireAdmin 을 최소 재현 — 비관리자면 FORBIDDEN
const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

const fileRouter = createFileRouter({
  router: t.router,
  // 제네릭 제약(TProcedure extends AnyProcedure)이 빌더 타입과 어긋나는 경우에 대비한
  // 런타임 무해 캐스트 — 실제 체이닝(.input/.query/.mutation)은 실제 프로시저에서 수행
  publicProcedure: t.procedure as unknown as AnyProcedure,
  protectedProcedure: t.procedure.use(requireAuth) as unknown as AnyProcedure,
  adminProcedure: t.procedure.use(requireAdmin) as unknown as AnyProcedure,
});

const createCaller = t.createCallerFactory(fileRouter);

// ---------------------------------------------------------------------------
// 테스트 픽스처
// ---------------------------------------------------------------------------

const TEST_SECRET = 'test-secret-32-bytes-minimum-ok';

function makeAttachmentRow() {
  return {
    id: 100,
    storageKey: 'attachments/2024/01/uuid.png',
    memberId: '42',
    uploadedFilename: 'uuid.png',
    documentId: 1,
    commentId: null,
    uploadTargetType: 'DOCUMENT' as const,
    sourceFilename: 'test.png',
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
  };
}

describe('fileRouter (createFileRouter) — SPEC-FILE-001 REQ-FILE-091', () => {
  let fakeStorage: { __fake: 'storage' };
  let fakeScanner: { __fake: 'scanner' };
  let fakePrisma: { fileAttachment: { findUnique: ReturnType<typeof vi.fn> } };
  let memberCaller: ReturnType<typeof createCaller>;
  let adminCaller: ReturnType<typeof createCaller>;
  let guestCaller: ReturnType<typeof createCaller>;

  const baseCtx = (session: Session | null) => ({
    prisma: fakePrisma,
    storage: fakeStorage,
    scanner: fakeScanner,
    tokenSecret: TEST_SECRET,
    session,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fakeStorage = { __fake: 'storage' };
    fakeScanner = { __fake: 'scanner' };
    fakePrisma = {
      fileAttachment: {
        findUnique: vi.fn().mockResolvedValue(makeAttachmentRow()),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberCaller = createCaller(baseCtx({ user: { id: 42, isAdmin: false } }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminCaller = createCaller(baseCtx({ user: { id: 1, isAdmin: true } }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guestCaller = createCaller(baseCtx(null) as any);
  });

  // -------------------------------------------------------------------------
  // getDownloadUrl — 공개 (현재 구현은 항상 FORBIDDEN, TODO 주석 참조)
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-2: getDownloadUrl → 현재 구현상 항상 FORBIDDEN', async () => {
    await expect(
      memberCaller.getDownloadUrl({ attachmentId: 1 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // -------------------------------------------------------------------------
  // getMetadata — 공개
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-1: getMetadata → 내부 필드(storageKey/memberId/uploadedFilename) 제외하고 반환', async () => {
    const result = await memberCaller.getMetadata({ attachmentId: 100 });

    expect(fakePrisma.fileAttachment.findUnique).toHaveBeenCalledWith({
      where: { id: 100 },
    });
    expect(result).not.toHaveProperty('storageKey');
    expect(result).not.toHaveProperty('memberId');
    expect(result).not.toHaveProperty('uploadedFilename');
    expect(result).toMatchObject({
      id: 100,
      sourceFilename: 'test.png',
      mimeType: 'image/png',
      documentId: 1,
    });
  });

  it('REQ-FILE-091-1b: getMetadata → 첨부 파일 없으면 NOT_FOUND', async () => {
    fakePrisma.fileAttachment.findUnique.mockResolvedValueOnce(null);

    await expect(
      memberCaller.getMetadata({ attachmentId: 999 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // -------------------------------------------------------------------------
  // requestUpload — 인증 필수
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-5: requestUpload → 세션 id 를 memberId 로 도메인 호출 + 결과 반환', async () => {
    const domainResult = {
      url: 'https://presigned/put',
      method: 'PUT' as const,
      headers: {},
      storageKey: 'attachments/2024/01/x.png',
      uploadToken: 'tok',
      expiresAt: new Date('2024-01-01T00:10:00Z'),
    };
    mockRequestUpload.mockResolvedValueOnce(domainResult);

    const result = await memberCaller.requestUpload({
      sourceFilename: 'test.png',
      mimeType: 'image/png',
      fileSize: 1024,
    });

    expect(mockRequestUpload).toHaveBeenCalledOnce();
    const [input, deps] = mockRequestUpload.mock.calls[0] as [
      { sourceFilename: string; mimeType: string; fileSize: number; memberId: string },
      { storage: unknown; tokenSecret: string },
    ];
    // 세션 user.id(42) 가 문자열 memberId 로 변환되어 전달되어야 한다
    expect(input).toEqual({
      sourceFilename: 'test.png',
      mimeType: 'image/png',
      fileSize: 1024,
      memberId: '42',
    });
    // ctx.storage / ctx.tokenSecret 가 그대로 주입되어야 한다
    expect(deps.storage).toBe(fakeStorage);
    expect(deps.tokenSecret).toBe(TEST_SECRET);
    expect(result).toEqual(domainResult);
  });

  it('REQ-FILE-091-5b: requestUpload → UnsupportedMimeTypeError 는 BAD_REQUEST 로 변환', async () => {
    mockRequestUpload.mockRejectedValueOnce(
      new UnsupportedMimeTypeError('application/x-msdownload', ['image/png']),
    );

    await expect(
      memberCaller.requestUpload({
        sourceFilename: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('REQ-FILE-091-5c: requestUpload → FileTooLargeError 는 BAD_REQUEST 로 변환', async () => {
    mockRequestUpload.mockRejectedValueOnce(new FileTooLargeError('image/png', 999));

    await expect(
      memberCaller.requestUpload({
        sourceFilename: 'huge.png',
        mimeType: 'image/png',
        fileSize: 11 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('REQ-FILE-091-5d: requestUpload → fileSize 음수는 zod 검증에서 BAD_REQUEST', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCaller.requestUpload({
        sourceFilename: 'x.png',
        mimeType: 'image/png',
        fileSize: -1,
      } as any),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockRequestUpload).not.toHaveBeenCalled();
  });

  it('REQ-FILE-091-5e: requestUpload → 미인증 세션이면 protectedProcedure 가 차단(UNAUTHORIZED)', async () => {
    await expect(
      guestCaller.requestUpload({
        sourceFilename: 'x.png',
        mimeType: 'image/png',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(mockRequestUpload).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // completeUpload — 인증 필수
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-6a: completeUpload → 선택 필드 포함 입력 그대로 도메인 호출 + deps 주입', async () => {
    mockCompleteUpload.mockResolvedValueOnce({ id: 200, storageKey: 'k' });

    const result = await memberCaller.completeUpload({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
      width: 640,
      height: 480,
      duration: 10,
      directDownload: true,
      coverImage: false,
    });

    expect(mockCompleteUpload).toHaveBeenCalledOnce();
    const [input, deps] = mockCompleteUpload.mock.calls[0] as [
      Record<string, unknown>,
      { prisma: unknown; storage: unknown; scanner: unknown; tokenSecret: string },
    ];
    expect(input).toEqual({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
      width: 640,
      height: 480,
      duration: 10,
      directDownload: true,
      coverImage: false,
    });
    expect(deps.prisma).toBe(fakePrisma);
    expect(deps.storage).toBe(fakeStorage);
    expect(deps.scanner).toBe(fakeScanner);
    expect(deps.tokenSecret).toBe(TEST_SECRET);
    expect(result).toEqual({ id: 200, storageKey: 'k' });
  });

  it('REQ-FILE-091-6b: completeUpload → InvalidUploadTokenError 는 UNAUTHORIZED 로 변환', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new InvalidUploadTokenError());

    await expect(
      memberCaller.completeUpload({
        uploadToken: 'expired',
        uploadTargetType: 'DOCUMENT',
        uploadTargetId: 1,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('REQ-FILE-091-6c: completeUpload → UploadHeadMismatchError 는 BAD_REQUEST 로 변환', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new UploadHeadMismatchError('PUT 미수행'));

    await expect(
      memberCaller.completeUpload({
        uploadToken: 'tok',
        uploadTargetType: 'DOCUMENT',
        uploadTargetId: 1,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('REQ-FILE-091-6d: completeUpload → VirusDetectedError 는 FORBIDDEN 로 변환', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new VirusDetectedError(['EICAR']));

    await expect(
      memberCaller.completeUpload({
        uploadToken: 'tok',
        uploadTargetType: 'COMMENT',
        uploadTargetId: 5,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('REQ-FILE-091-6e: completeUpload → uploadTargetType 범위 밖 값은 zod 에서 BAD_REQUEST', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberCaller.completeUpload({
        uploadToken: 'tok',
        uploadTargetType: 'BOARD',
        uploadTargetId: 1,
      } as any),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockCompleteUpload).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // delete — 인증 필수
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-3: delete → 세션에서 actor 를 만들어 도메인 호출', async () => {
    mockDeleteAttachment.mockResolvedValueOnce({ attachmentId: 100 });

    const result = await memberCaller.delete({ attachmentId: 100 });

    expect(mockDeleteAttachment).toHaveBeenCalledOnce();
    const [input, deps] = mockDeleteAttachment.mock.calls[0] as [
      { attachmentId: number; actor: { userId: number; isAdmin: boolean } },
      { prisma: unknown; storage: unknown },
    ];
    expect(input.attachmentId).toBe(100);
    // buildActor: session.user.id/isAdmin 이 그대로 actor 로 변환
    expect(input.actor).toEqual({ userId: 42, isAdmin: false });
    expect(deps.prisma).toBe(fakePrisma);
    expect(deps.storage).toBe(fakeStorage);
    expect(result).toEqual({ attachmentId: 100 });
  });

  it('REQ-FILE-091-4: delete → AttachmentOwnershipError 는 FORBIDDEN 로 변환', async () => {
    mockDeleteAttachment.mockRejectedValueOnce(new AttachmentOwnershipError());

    await expect(
      memberCaller.delete({ attachmentId: 100 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('REQ-FILE-091-4b: delete → 도메인의 알 수 없는 에러는 그대로 재throw (INTERNAL_SERVER_ERROR 로 래핑)', async () => {
    mockDeleteAttachment.mockRejectedValueOnce(new Error('storage 접근 불가'));

    await expect(
      memberCaller.delete({ attachmentId: 100 }),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });

  // -------------------------------------------------------------------------
  // setCoverImage / clearCoverImage — 인증 필수
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-7a: setCoverImage → 세션 id 를 문자열 actor.id 로 도메인 호출', async () => {
    mockSetCoverImage.mockResolvedValueOnce(makeAttachmentRow());

    await memberCaller.setCoverImage({ attachmentId: 100, documentId: 1 });

    expect(mockSetCoverImage).toHaveBeenCalledOnce();
    const [input, deps] = mockSetCoverImage.mock.calls[0] as [
      { attachmentId: number; documentId: number },
      { prisma: unknown; actor: { id: string; isAdmin: boolean } },
    ];
    expect(input).toEqual({ attachmentId: 100, documentId: 1 });
    // admin.ts 도메인은 actor.id 를 string 으로 기대 — 라우터가 변환해서 전달
    expect(deps.actor).toEqual({ id: '42', isAdmin: false });
    expect(deps.prisma).toBe(fakePrisma);
  });

  it('REQ-FILE-091-7b: clearCoverImage → 동일하게 actor 변환 후 도메인 호출', async () => {
    mockClearCoverImage.mockResolvedValueOnce(makeAttachmentRow());

    await memberCaller.clearCoverImage({ attachmentId: 100, documentId: 1 });

    expect(mockClearCoverImage).toHaveBeenCalledOnce();
    const [input, deps] = mockClearCoverImage.mock.calls[0] as [
      { attachmentId: number; documentId: number },
      { prisma: unknown; actor: { id: string; isAdmin: boolean } },
    ];
    expect(input).toEqual({ attachmentId: 100, documentId: 1 });
    expect(deps.actor).toEqual({ id: '42', isAdmin: false });
  });

  it('REQ-FILE-091-7c: setCoverImage → AttachmentOwnershipError 는 FORBIDDEN 로 변환', async () => {
    mockSetCoverImage.mockRejectedValueOnce(new AttachmentOwnershipError());

    await expect(
      memberCaller.setCoverImage({ attachmentId: 100, documentId: 1 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('REQ-FILE-091-7d: clearCoverImage → AttachmentOwnershipError 는 FORBIDDEN 로 변환', async () => {
    mockClearCoverImage.mockRejectedValueOnce(new AttachmentOwnershipError());

    await expect(
      memberCaller.clearCoverImage({ attachmentId: 100, documentId: 1 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // -------------------------------------------------------------------------
  // listMyAttachments — 인증 필수
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-8: listMyAttachments → memberId + 입력 병합해 도메인 호출', async () => {
    const listResult = { items: [makeAttachmentRow()], nextCursor: null };
    mockListMyAttachments.mockResolvedValueOnce(listResult);

    const result = await memberCaller.listMyAttachments({ limit: 10 });

    expect(mockListMyAttachments).toHaveBeenCalledOnce();
    const [input, deps] = mockListMyAttachments.mock.calls[0] as [
      { memberId: string; limit?: number },
      { prisma: unknown },
    ];
    expect(input).toEqual({ memberId: '42', limit: 10 });
    expect(deps.prisma).toBe(fakePrisma);
    expect(result).toEqual(listResult);
  });

  it('REQ-FILE-091-8b: listMyAttachments → limit > 100 은 zod 에서 BAD_REQUEST', async () => {
    await expect(
      memberCaller.listMyAttachments({ limit: 101 }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockListMyAttachments).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // admin.* — 관리자 전용
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-9: admin.listOrphans → admin 세션에서 도메인 호출', async () => {
    const orphanResult = { items: [], nextCursor: null };
    mockListOrphans.mockResolvedValueOnce(orphanResult);

    const result = await adminCaller.admin.listOrphans({ olderThanDays: 7, limit: 50 });

    expect(mockListOrphans).toHaveBeenCalledOnce();
    const [input, deps] = mockListOrphans.mock.calls[0] as [
      { olderThanDays?: number; limit?: number },
      { prisma: unknown },
    ];
    expect(input).toEqual({ olderThanDays: 7, limit: 50 });
    expect(deps.prisma).toBe(fakePrisma);
    expect(result).toEqual(orphanResult);
  });

  it('REQ-FILE-091-9b: admin.listOrphans → 일반 유저 세션이면 adminProcedure 가 차단', async () => {
    await expect(
      memberCaller.admin.listOrphans({}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockListOrphans).not.toHaveBeenCalled();
  });

  it('REQ-FILE-091-10: admin.purgeOrphans → getStorage() 싱글턴을 도메인에 주입', async () => {
    const storageFromFactory = { __fake: 'factory-storage' };
    mockGetStorage.mockReturnValueOnce(storageFromFactory);
    mockPurgeOrphans.mockResolvedValueOnce({ deletedCount: 3 });

    const result = await adminCaller.admin.purgeOrphans({ olderThanDays: 30 });

    expect(mockGetStorage).toHaveBeenCalledOnce();
    expect(mockPurgeOrphans).toHaveBeenCalledOnce();
    const [input, deps] = mockPurgeOrphans.mock.calls[0] as [
      { olderThanDays: number },
      { prisma: unknown; storage: unknown },
    ];
    expect(input).toEqual({ olderThanDays: 30 });
    expect(deps.prisma).toBe(fakePrisma);
    expect(deps.storage).toBe(storageFromFactory);
    expect(result).toEqual({ deletedCount: 3 });
  });

  it('REQ-FILE-091-11a: admin.cascadeRebuild → documentId 경로 도메인 호출', async () => {
    mockCascadeRebuild.mockResolvedValueOnce({ updatedCount: 1 });

    const result = await adminCaller.admin.cascadeRebuild({ documentId: 12 });

    expect(mockCascadeRebuild).toHaveBeenCalledOnce();
    const [input, deps] = mockCascadeRebuild.mock.calls[0] as [
      { documentId?: number; commentId?: number },
      { prisma: unknown },
    ];
    expect(input).toEqual({ documentId: 12 });
    expect(deps.prisma).toBe(fakePrisma);
    expect(result).toEqual({ updatedCount: 1 });
  });

  it('REQ-FILE-091-11b: admin.cascadeRebuild → commentId 단독 입력도 그대로 전달', async () => {
    mockCascadeRebuild.mockResolvedValueOnce({ updatedCount: 0 });

    await adminCaller.admin.cascadeRebuild({ commentId: 34 });

    const [input] = mockCascadeRebuild.mock.calls[0] as [
      { documentId?: number; commentId?: number },
    ];
    expect(input).toEqual({ commentId: 34 });
  });

  // -------------------------------------------------------------------------
  // server barrel — ./index 는 createFileRouter 를 재내보기 한다
  // -------------------------------------------------------------------------

  it('REQ-FILE-091-12: server barrel(./index) 는 createFileRouter 를 동일 함수로 재내보기', async () => {
    const barrel = await import('./index');
    // 같은 모듈 인스턴스에서 왔으므로 참조 동일성이 성립해야 한다
    expect(barrel.createFileRouter).toBe(createFileRouter);
  });
});
