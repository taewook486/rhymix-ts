/**
 * actions.test.ts — SPEC-FILE-001 (REQ-FILE-080~083) Server Actions 실측 테스트.
 *
 * 이 파일은 ./actions 를 값으로 import 하여 4개 Server Action 을 실제 실행한다.
 *
 * 테스트 전략:
 * - 세션(@/lib/auth/config.auth)과 Prisma(@/lib/db/prisma)는 동적 import 협력자이므로 mock.
 * - 도메인 함수(../attachment)는 mock 하되 에러 클래스는 importOriginal spread 로
 *   실제 클래스를 사용해 mapErrorToActionResult 의 instanceof 분기가 실제로 동작하게 한다.
 * - Storage/Scanner 는 실제 @rhymix-ts/file 패키지(바벨 경유)의 getStorage/getScanner 를
 *   사용한다 — STORAGE_BACKEND=memory 로 실제 InMemoryStorage 인스턴스가 주입됨을 검증.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  requestUploadAction,
  completeUploadAction,
  deleteAttachmentAction,
  setCoverImageAction,
} from './actions';
import {
  AttachmentOwnershipError,
  UploadHeadMismatchError,
  VirusDetectedError,
  InvalidUploadTokenError,
  UnsupportedMimeTypeError,
  FileTooLargeError,
} from '../attachment';
import { InMemoryStorage } from '../storage/memory';
import { NoopScanner } from '../storage/scanner';
import { _resetStorageInstances } from '../storage/factory';

// ---------------------------------------------------------------------------
// 협력자 mock — vi.hoisted 로 팩토리 실행 시점에도 참조 가능하게 한다
// ---------------------------------------------------------------------------

const { mockAuth, mockRequestUpload, mockCompleteUpload, mockDeleteAttachment } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequestUpload: vi.fn(),
  mockCompleteUpload: vi.fn(),
  mockDeleteAttachment: vi.fn(),
}));

// actions.ts 의 getSession 이 동적 import 하는 모듈 — 세션 주입 통로
vi.mock('@/lib/auth/config', () => ({
  auth: () => mockAuth(),
}));

// actions.ts 의 getPrisma 가 동적 import 하는 모듈 — 가짜 prisma 주입 통로
vi.mock('@/lib/db/prisma', () => ({
  prisma: { __fake: 'prisma' },
}));

// 도메인 함수만 mock — 에러 클래스 등 나머지 export 는 실제 모듈 사용
vi.mock('../attachment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../attachment')>();
  return {
    ...actual,
    requestUpload: (...args: unknown[]) => mockRequestUpload(...(args as Parameters<typeof mockRequestUpload>)),
    completeUpload: (...args: unknown[]) => mockCompleteUpload(...(args as Parameters<typeof mockCompleteUpload>)),
    deleteAttachment: (...args: unknown[]) => mockDeleteAttachment(...(args as Parameters<typeof mockDeleteAttachment>)),
  };
});

// ---------------------------------------------------------------------------
// 픽스처
// ---------------------------------------------------------------------------

const TEST_SECRET = 'actions-test-secret-32-bytes-ok';
const memberSession = { user: { id: 42, isAdmin: false } };

const validUploadInput = {
  sourceFilename: 'photo.png',
  mimeType: 'image/png',
  fileSize: 1024,
};

describe('file Server Actions — SPEC-FILE-001 REQ-FILE-080~083', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset().mockResolvedValue(memberSession);
    // 실제 getStorage/getScanner 가 memory/noop 백엔드를 쓰도록 강제
    process.env.STORAGE_BACKEND = 'memory';
    process.env.VIRUS_SCAN_BACKEND = 'noop';
    process.env.UPLOAD_TOKEN_SECRET = TEST_SECRET;
    // storage 싱글턴 캐시를 초기화해 이전 테스트의 백엔드 설정이 남지 않게 한다
    _resetStorageInstances();
  });

  afterEach(() => {
    _resetStorageInstances();
    delete process.env.STORAGE_BACKEND;
    delete process.env.VIRUS_SCAN_BACKEND;
    delete process.env.UPLOAD_TOKEN_SECRET;
  });

  // -----------------------------------------------------------------------
  // requestUploadAction (REQ-FILE-080)
  // -----------------------------------------------------------------------

  it('A-080a: 세션 없으면 { ok:false, UNAUTHORIZED } + 도메인 미호출', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await requestUploadAction(validUploadInput);

    expect(result).toEqual({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
    expect(mockRequestUpload).not.toHaveBeenCalled();
  });

  it('A-080b: auth() 자체가 실패하면 getSession catch → 세션 없음 취급(UNAUTHORIZED)', async () => {
    mockAuth.mockRejectedValueOnce(new Error('auth backend down'));

    const result = await requestUploadAction(validUploadInput);

    expect(result).toEqual({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
    expect(mockRequestUpload).not.toHaveBeenCalled();
  });

  it('A-080c: 정상 업로드 요청 → 실제 InMemoryStorage + env 토큰 시크릿으로 도메인 호출', async () => {
    const expiresAt = new Date('2024-01-01T00:10:00Z');
    mockRequestUpload.mockResolvedValueOnce({
      url: 'https://presigned/put',
      method: 'PUT' as const,
      headers: {},
      storageKey: 'attachments/2024/01/x.png',
      uploadToken: 'tok-1',
      expiresAt,
    });

    const result = await requestUploadAction(validUploadInput);

    expect(mockRequestUpload).toHaveBeenCalledOnce();
    const [input, deps] = mockRequestUpload.mock.calls[0] as [
      { sourceFilename: string; mimeType: string; fileSize: number; memberId: string },
      { storage: unknown; tokenSecret: string },
    ];
    // 세션 user.id(42) → memberId 문자열 변환
    expect(input).toEqual({ ...validUploadInput, memberId: '42' });
    // getStorage() 가 실제 패키지 바벨을 통해 InMemoryStorage 를 반환했는지 검증
    expect(deps.storage).toBeInstanceOf(InMemoryStorage);
    // getTokenSecret() 이 UPLOAD_TOKEN_SECRET env 값을 사용
    expect(deps.tokenSecret).toBe(TEST_SECRET);
    // 반환 데이터는 url/uploadToken/expiresAt 만 노출 (method/storageKey 제외)
    expect(result).toEqual({
      ok: true,
      data: { url: 'https://presigned/put', uploadToken: 'tok-1', expiresAt },
    });
  });

  it('A-080d: UnsupportedMimeTypeError → BAD_REQUEST 코드로 매핑', async () => {
    mockRequestUpload.mockRejectedValueOnce(
      new UnsupportedMimeTypeError('application/x-msdownload', ['image/png']),
    );

    const result = await requestUploadAction({
      ...validUploadInput,
      mimeType: 'application/x-msdownload',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('BAD_REQUEST');
      expect(result.error).toContain('지원하지 않는 MIME');
    }
  });

  it('A-080e: FileTooLargeError → BAD_REQUEST 코드로 매핑', async () => {
    mockRequestUpload.mockRejectedValueOnce(new FileTooLargeError('image/png', 11 * 1024 * 1024));

    const result = await requestUploadAction({ ...validUploadInput, fileSize: 11 * 1024 * 1024 });

    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
  });

  it('A-080f: 도메인의 알 수 없는 에러 → INTERNAL_ERROR (내부 메시지 노출 안 함)', async () => {
    mockRequestUpload.mockRejectedValueOnce(new Error('db connection lost'));

    const result = await requestUploadAction(validUploadInput);

    expect(result).toEqual({ ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  it('A-080g: UPLOAD_TOKEN_SECRET 미설정 → 기본 시크릿 폴백 사용', async () => {
    delete process.env.UPLOAD_TOKEN_SECRET;
    mockRequestUpload.mockResolvedValueOnce({
      url: 'https://presigned/put',
      method: 'PUT' as const,
      headers: {},
      storageKey: 'k',
      uploadToken: 'tok',
      expiresAt: new Date(),
    });

    await requestUploadAction(validUploadInput);

    const [, deps] = mockRequestUpload.mock.calls[0] as [
      unknown,
      { tokenSecret: string },
    ];
    // getTokenSecret() 의 ?? 기본값 분기
    expect(deps.tokenSecret).toBe('default-secret-change-in-production');
  });

  // -----------------------------------------------------------------------
  // completeUploadAction (REQ-FILE-081)
  // -----------------------------------------------------------------------

  it('A-081a: 세션 없으면 UNAUTHORIZED + 도메인 미호출', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await completeUploadAction({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result).toEqual({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
    expect(mockCompleteUpload).not.toHaveBeenCalled();
  });

  it('A-081b: 정상 완료 → 선택 필드 전달 + 실제 storage/scanner 주입 + attachmentId 반환', async () => {
    mockCompleteUpload.mockResolvedValueOnce({ id: 200, storageKey: 'k' });

    const result = await completeUploadAction({
      uploadToken: 'tok-2',
      uploadTargetType: 'COMMENT',
      uploadTargetId: 5,
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
      uploadToken: 'tok-2',
      uploadTargetType: 'COMMENT',
      uploadTargetId: 5,
      width: 640,
      height: 480,
      duration: 10,
      directDownload: true,
      coverImage: false,
    });
    expect(deps.prisma).toEqual({ __fake: 'prisma' });
    // getStorage/getScanner 가 실제 패키지 싱글턴(memory/noop)을 반환했는지 검증
    expect(deps.storage).toBeInstanceOf(InMemoryStorage);
    expect(deps.scanner).toBeInstanceOf(NoopScanner);
    expect(deps.tokenSecret).toBe(TEST_SECRET);
    // 반환 데이터는 attachmentId 로 축약
    expect(result).toEqual({ ok: true, data: { attachmentId: 200 } });
  });

  it('A-081c: InvalidUploadTokenError → UNAUTHORIZED 코드로 매핑', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new InvalidUploadTokenError());

    const result = await completeUploadAction({
      uploadToken: 'expired',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('A-081d: UploadHeadMismatchError → BAD_REQUEST 코드로 매핑', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new UploadHeadMismatchError('PUT 미수행'));

    const result = await completeUploadAction({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
  });

  it('A-081e: VirusDetectedError → FORBIDDEN 코드로 매핑', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new VirusDetectedError(['EICAR']));

    const result = await completeUploadAction({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(result.ok === false && result.error).toContain('바이러스');
  });

  it('A-081f: ZodError → "Invalid input:" 접두사 + BAD_REQUEST', async () => {
    mockCompleteUpload.mockRejectedValueOnce(new z.ZodError([]));

    const result = await completeUploadAction({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('BAD_REQUEST');
      expect(result.error.startsWith('Invalid input: ')).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // deleteAttachmentAction (REQ-FILE-082)
  // -----------------------------------------------------------------------

  it('A-082a: 세션 없으면 UNAUTHORIZED + 도메인 미호출', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await deleteAttachmentAction({ attachmentId: 100 });

    expect(result).toEqual({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
    expect(mockDeleteAttachment).not.toHaveBeenCalled();
  });

  it('A-082b: 정상 삭제 → actor 주입 + attachmentId 반환', async () => {
    mockDeleteAttachment.mockResolvedValueOnce({ attachmentId: 77 });

    const result = await deleteAttachmentAction({ attachmentId: 77 });

    expect(mockDeleteAttachment).toHaveBeenCalledOnce();
    const [input, deps] = mockDeleteAttachment.mock.calls[0] as [
      { attachmentId: number; actor: { userId: number; isAdmin: boolean } },
      { prisma: unknown; storage: unknown },
    ];
    expect(input.attachmentId).toBe(77);
    // buildActor: 세션 → { userId, isAdmin }
    expect(input.actor).toEqual({ userId: 42, isAdmin: false });
    expect(deps.prisma).toEqual({ __fake: 'prisma' });
    expect(deps.storage).toBeInstanceOf(InMemoryStorage);
    expect(result).toEqual({ ok: true, data: { attachmentId: 77 } });
  });

  it('A-082c: AttachmentOwnershipError → FORBIDDEN 코드로 매핑', async () => {
    mockDeleteAttachment.mockRejectedValueOnce(new AttachmentOwnershipError());

    const result = await deleteAttachmentAction({ attachmentId: 100 });

    expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });

  // -----------------------------------------------------------------------
  // setCoverImageAction (REQ-FILE-083)
  // -----------------------------------------------------------------------

  it('A-083: 현재 구현은 NOT_IMPLEMENTED 스텁 반환 (Slice C 예정)', async () => {
    const result = await setCoverImageAction({ attachmentId: 100, documentId: 1 });

    expect(result).toEqual({
      ok: false,
      error: 'setCoverImage not implemented yet - Slice C',
      code: 'NOT_IMPLEMENTED',
    });
  });

  // -----------------------------------------------------------------------
  // 컨텍스트 헬퍼 실패 경로 — getStorage/getScanner/getPrisma 폴백
  // -----------------------------------------------------------------------

  it('A-CTX-1: STORAGE_BACKEND 불량 → "Storage not available" → INTERNAL_ERROR', async () => {
    process.env.STORAGE_BACKEND = 'bogus-backend';
    // 싱글턴 캐시를 비워야 불량 백엔드 분기가 실행된다
    _resetStorageInstances();

    const result = await requestUploadAction(validUploadInput);

    expect(result).toEqual({ ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    expect(mockRequestUpload).not.toHaveBeenCalled();
  });

  it('A-CTX-2: VIRUS_SCAN_BACKEND 불량 → "Scanner not available" → INTERNAL_ERROR', async () => {
    // storage 는 정상(memory), scanner 만 불량 — completeUpload 경로에서만 scanner 사용
    process.env.VIRUS_SCAN_BACKEND = 'bogus-scanner';
    _resetStorageInstances();

    const result = await completeUploadAction({
      uploadToken: 'tok',
      uploadTargetType: 'DOCUMENT',
      uploadTargetId: 1,
    });

    expect(result).toEqual({ ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    expect(mockCompleteUpload).not.toHaveBeenCalled();
  });

  it('A-CTX-3: Prisma 모듈 로드 실패 → "Prisma client not available" → INTERNAL_ERROR', async () => {
    // 이 테스트는 파일의 마지막에 위치해야 한다 — vi.resetModules() 이후 모듈 정체성이
    // 갱신되므로, 상단 static import 들과 이후 테스트가 다른 모듈 인스턴스를 보게 된다.
    vi.resetModules();
    vi.doMock('@/lib/db/prisma', () => {
      throw new Error('prisma module unavailable');
    });
    const { requestUploadAction: freshAction } = await import('./actions');

    const result = await freshAction(validUploadInput);

    expect(result).toEqual({ ok: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    expect(mockRequestUpload).not.toHaveBeenCalled();
    vi.doUnmock('@/lib/db/prisma');
  });
});
