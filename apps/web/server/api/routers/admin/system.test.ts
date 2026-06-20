/**
 * Specification tests for admin.system tRPC router — SPEC-ADMIN-001 Slice F + SPEC-ADMIN-002 Slice 3F.
 *
 * Slice F (REQ-ADMIN-080/081):
 * F-1-1: health() → node.version 반환
 * F-1-2: health() → db.connected=true, latencyMs >= 0
 * F-1-3: prisma 오류 → connected:false, latencyMs:-1
 * F-1-4: DB_PASSWORD 환경변수 → "***" 마스킹 (REQ-ADMIN-081)
 * F-1-5: JWT_SECRET 환경변수 → "***" 마스킹
 * F-1-6: NODE_ENV 환경변수 → 실제 값 (마스킹 없음)
 * F-1-7: 비관리자 호출 → FORBIDDEN
 *
 * Slice 3F (REQ-ADMIN2-144/145):
 * 3F-1: health() → nextVersion 필드 포함 (REQ-ADMIN2-144)
 * 3F-2: health() → dbVersion 필드 포함 (REQ-ADMIN2-144)
 * 3F-3: 민감 환경변수 마스킹 검증 (REQ-ADMIN2-145)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// NextAuth + authConfig mock (trpc.ts 가 의존)
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

// DB mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockQueryRaw = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.system tRPC router (Slice F + 3F)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
    // 환경변수 스냅샷 보관
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // 환경변수 복원
    process.env = originalEnv;
  });

  it('F-1-1: health() → node.version 반환 (REQ-ADMIN-080)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    expect(result.node.version).toBe(process.version);
    expect(result.node.platform).toBe(process.platform);
  });

  it('F-1-2: health() → db.connected=true, latencyMs >= 0 (REQ-ADMIN-080)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    expect(result.db.connected).toBe(true);
    expect(result.db.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('F-1-3: prisma.$queryRaw 오류 → connected:false, latencyMs:-1 (REQ-ADMIN-080)', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('DB 연결 실패'));

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    expect(result.db.connected).toBe(false);
    expect(result.db.latencyMs).toBe(-1);
  });

  it('F-1-4: DB_PASSWORD 키 → 값 "***" 마스킹 (REQ-ADMIN-081)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    process.env['DB_PASSWORD'] = 'supersecret';

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    const entry = result.env.find((e) => e.key === 'DB_PASSWORD');
    expect(entry).toBeDefined();
    expect(entry?.value).toBe('***');
  });

  it('F-1-5: JWT_SECRET 키 → 값 "***" 마스킹 (REQ-ADMIN-081)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    process.env['JWT_SECRET'] = 'myjwtsecret';

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    const entry = result.env.find((e) => e.key === 'JWT_SECRET');
    expect(entry).toBeDefined();
    expect(entry?.value).toBe('***');
  });

  it('F-1-6: NODE_ENV 키 → 실제 값 반환 (마스킹 없음) (REQ-ADMIN-081)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    // NODE_ENV 는 read-only 이지만 테스트 환경에서는 이미 정의되어 있음
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any)['NODE_ENV'] = 'test';

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    const entry = result.env.find((e) => e.key === 'NODE_ENV');
    expect(entry).toBeDefined();
    expect(entry?.value).not.toBe('***');
  });

  it('F-1-7: 비관리자 호출 → TRPCError FORBIDDEN (REQ-ADMIN-021)', async () => {
    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.health()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // ---------------------------------------------------------------------
  // SPEC-ADMIN-002 Slice 3F: REQ-ADMIN2-144/145 — 서버 환경 view
  // ---------------------------------------------------------------------

  it('3F-1: health() → nextVersion 필드 포함 (REQ-ADMIN2-144)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    expect(result.nextVersion).toBeDefined();
    expect(typeof result.nextVersion).toBe('string');
  });

  it('3F-2: health() → dbVersion 필드 포함 (REQ-ADMIN2-144)', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ 1: 1 }]) // latency check
      .mockResolvedValueOnce([{ version: 'PostgreSQL 15.0' }]); // db version

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    expect(result.dbVersion).toBeDefined();
    expect(result.dbVersion).toBe('PostgreSQL 15.0');
  });

  it('3F-3: 민감 환경변수 마스킹 - API_KEY, SECRET_TOKEN 포함 (REQ-ADMIN2-145)', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    process.env['MY_API_KEY'] = 'secret123';
    process.env['MY_SECRET_TOKEN'] = 'token456';

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    const apiKey = result.env.find((e) => e.key === 'MY_API_KEY');
    const secretToken = result.env.find((e) => e.key === 'MY_SECRET_TOKEN');
    expect(apiKey?.value).toBe('***');
    expect(secretToken?.value).toBe('***');
  });

  it('3F-4: DB 연결 실패 시 dbVersion은 null 반환', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('DB 연결 실패'));

    const { adminSystemRouter } = await import('./system');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSystemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.health();

    expect(result.db.connected).toBe(false);
    expect(result.dbVersion).toBeNull();
  });
});
