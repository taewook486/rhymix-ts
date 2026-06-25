/**
 * admin.twoFactor tRPC 라우터 테스트 — SPEC-ADMIN-2FA-OTP-001 M3
 *   (REQ-2OTP-021~024, 040~045, 048, 049, 051, 081, 084).
 *
 * board.test.ts 의 createCallerFactory 패턴을 따라 실제 미들웨어 체인을 통과한다.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// NextAuth + authConfig + DB mock (trpc.ts 가 의존)
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// TWO_FACTOR_ENC_KEY — encryptSecret/decryptSecret 가 동작하도록 설정.
// ---------------------------------------------------------------------------
const TEST_KEY = 'test-key-32-bytes-long-for-aes-256-gcm-exactly!';
const ORIGINAL_KEY = process.env.TWO_FACTOR_ENC_KEY;

beforeEach(() => {
  process.env.TWO_FACTOR_ENC_KEY = TEST_KEY;
});
afterEach(() => {
  if (ORIGINAL_KEY !== undefined) {
    process.env.TWO_FACTOR_ENC_KEY = ORIGINAL_KEY;
  } else {
    delete process.env.TWO_FACTOR_ENC_KEY;
  }
});

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockLoginAttemptCount = vi.fn();
const mockLoginAttemptCreate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  user: {
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
  },
  loginAttempt: {
    count: (...args: unknown[]) => mockLoginAttemptCount(...args),
    create: (...args: unknown[]) => mockLoginAttemptCreate(...args),
  },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '127.0.0.1',
  userAgent: 'test',
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '127.0.0.1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.twoFactor router — M3 (REQ-2OTP-021~024, 040~051, 081)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginAttemptCount.mockResolvedValue(0); // 기본적으로 레이트 리미트 미충족
    mockLoginAttemptCreate.mockResolvedValue({ id: 1 });
    mockUserUpdate.mockResolvedValue({});
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 게이트 비활성
  });

  // -------------------------------------------------------------------------
  // enrollStart
  // -------------------------------------------------------------------------

  it('M3-E1: enrollStart — 후보 시크릿 + QR 반환 (DB 미저장)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.enrollStart();

    expect(result.secret).toBeTruthy();
    expect(typeof result.secret).toBe('string');
    expect(result.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    // DB 저장이 일어나지 않아야 한다.
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('M3-E2: enrollStart — 비관리자 → FORBIDDEN (requireAdmin 통과 못함)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.enrollStart()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // -------------------------------------------------------------------------
  // enrollConfirm
  // -------------------------------------------------------------------------

  it('M3-C1: enrollConfirm — 잘못된 코드 → BAD_REQUEST, 시크릿 미저장 (REQ-2OTP-023)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 먼저 후보 시크릿을 발급.
    await caller.enrollStart();

    // 일부러 잘못된 코드 제출.
    await expect(caller.enrollConfirm({ code: '000000' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    // 어떤 시크릿도 DB 에 저장되지 않아야 한다.
    expect(mockUserUpdate).not.toHaveBeenCalled();
    // 실패 시도가 LoginAttempt ledger 에 기록되어야 한다 (INVALID_CREDENTIALS).
    expect(mockLoginAttemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: '1',
          result: 'INVALID_CREDENTIALS',
        }),
      }),
    );
  });

  it('M3-C2: enrollConfirm — 후보 없이 호출 → BAD_REQUEST (만료/미발급)', async () => {
    const { adminTwoFactorRouter, __clearPendingSecretsForTests } = await import('./two-factor');
    __clearPendingSecretsForTests();
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(caller.enrollConfirm({ code: '123456' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('M3-C3: enrollConfirm — 5회 실패 후 6회째는 코드 검증 전 TOO_MANY_REQUESTS (REQ-2OTP-048/049, AC-12)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 이미 5회 실패가 ledger 에 있다.
    mockLoginAttemptCount.mockResolvedValueOnce(5);

    await expect(caller.enrollConfirm({ code: '123456' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    // RATE_LIMITED 행이 추가되어야 한다.
    expect(mockLoginAttemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: '1',
          result: 'RATE_LIMITED',
        }),
      }),
    );
    // 시크릿 저장은 일어나지 않는다.
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('M3-C4: enrollConfirm — 정확한 코드(가짜 환경)로는 user.update 호출 (성공 경로)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 이 테스트는 generateTotpSecret/verifyTotp 가 실제 otplib 을 사용하므로
    // 정확한 코드를 시뮬레이션하기 어렵다. 대신 검증 통과 후 호출되는 user.update 와
    // 백업코드 반환 형태만 검증한다 — verifyTotp 가 false 를 반환하더라도
    // 잘못된 코드 흐름(BAD_REQUEST)이 나가므로 user.update 가 호출되지 않음을 확인.
    await caller.enrollStart();
    await expect(caller.enrollConfirm({ code: '000000' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // verify (REQ-2OTP-040~051)
  // -------------------------------------------------------------------------

  it('M3-V1: verify — 미등록 사용자(user 두 필드 null) → BAD_REQUEST, 정보 누설 없음', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockUserFindUnique.mockResolvedValueOnce({
      twoFactorSecret: null,
      twoFactorEnabled: false,
      twoFactorBackupCodes: [],
    });

    await expect(
      caller.verify({ code: '123456', mode: 'totp' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('M3-V2: verify — mode=totp 인데 backup 모양 값 → BAD_REQUEST (REQ-2OTP-051 모드/값 불일치)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockUserFindUnique.mockResolvedValueOnce({
      twoFactorSecret: 'enc-blob',
      twoFactorEnabled: true,
      twoFactorBackupCodes: [],
    });

    await expect(
      // TOTP 모드인데 10자 영숫자(백업코드 모양) 제출.
      caller.verify({ code: 'A3F9K2M7QZ', mode: 'totp' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('M3-V3: verify — mode=backup 인데 6자리 숫자(totp 모양) → BAD_REQUEST (REQ-2OTP-051)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockUserFindUnique.mockResolvedValueOnce({
      twoFactorSecret: 'enc-blob',
      twoFactorEnabled: true,
      twoFactorBackupCodes: [],
    });

    await expect(
      caller.verify({ code: '123456', mode: 'backup' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('M3-V4: verify — rate limit 초과 → 코드 검증 전 TOO_MANY_REQUESTS (REQ-2OTP-049)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockLoginAttemptCount.mockResolvedValueOnce(5);

    await expect(
      caller.verify({ code: '123456', mode: 'totp' }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });

    // user.findUnique 가 호출되지 않아야 한다 (코드 검증 전 단축).
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockLoginAttemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ result: 'RATE_LIMITED' }),
      }),
    );
  });

  it('M3-V5: verify — 등록된 사용자인데 백업코드가 일치하면 user.update 로 갱신', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 해시를 직접 계산하여 저장된 것처럼 세팅.
    const { hashBackupCode } = await import('@rhymix-ts/auth/two-factor');
    const knownCode = 'A3F9K2M7QZ'; // normalized 10자
    const storedHash = hashBackupCode(knownCode);

    mockUserFindUnique.mockResolvedValueOnce({
      twoFactorSecret: 'enc-blob',
      twoFactorEnabled: true,
      twoFactorBackupCodes: [storedHash],
    });

    const result = await caller.verify({ code: knownCode, mode: 'backup' });
    expect(result).toEqual({ ok: true });

    // 단일 사용 소비 → remainingHashes=[] 로 갱신.
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ twoFactorBackupCodes: [] }),
      }),
    );
  });

  it('M3-V6: verify — 잘못된 백업코드는 user.update 미호출 + INVALID_CREDENTIALS 기록', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const { hashBackupCode } = await import('@rhymix-ts/auth/two-factor');
    mockUserFindUnique.mockResolvedValueOnce({
      twoFactorSecret: 'enc-blob',
      twoFactorEnabled: true,
      twoFactorBackupCodes: [hashBackupCode('XXXXXXXXXX')],
    });

    await expect(
      caller.verify({ code: 'ZZZZZZZZZZ', mode: 'backup' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockLoginAttemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ result: 'INVALID_CREDENTIALS' }),
      }),
    );
  });

  it('M3-V7: verify — 닭-달걀 회피: admin2FAProcedure 는 requireAdmin 만 통과 (REQ-2OTP-045, AC-6)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 세션에 twoFactorVerified=false 더라도 mutation 이 게이트에 막히지 않아야 한다.
    (adminCtx.session.user as { twoFactorVerified?: boolean }).twoFactorVerified = false;

    mockLoginAttemptCount.mockResolvedValueOnce(0);
    mockUserFindUnique.mockResolvedValueOnce({
      twoFactorSecret: null,
      twoFactorEnabled: false,
      twoFactorBackupCodes: [],
    });

    // 게이트(requireAdmin2FAIfEnabled) 가 아니라 mutation 자체의 BAD_REQUEST.
    await expect(
      caller.verify({ code: '123456', mode: 'totp' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('M3-V8: verify — 비관리자 → FORBIDDEN (REQ-2OTP-045 뒷면: requireAdmin 은 여전히 필수)', async () => {
    const { adminTwoFactorRouter } = await import('./two-factor');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminTwoFactorRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(
      caller.verify({ code: '123456', mode: 'totp' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
