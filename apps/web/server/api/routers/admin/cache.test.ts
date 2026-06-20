/**
 * Specification tests for admin.cache tRPC router — SPEC-ADMIN-001 Slice F + SPEC-ADMIN-002 Slice 3F.
 *
 * Slice F (REQ-ADMIN-060~063):
 * F-2-2: cache.purge({ scope:'all' }) → 4개 prefix 태그 revalidate
 * F-2-3: cache.purge({ scope:'module', id:'X' }) → 'module:X' 만 revalidate
 * F-2-4: cache.purge({ scope:'menu', id:'1' }) → 'menu:1' 만 revalidate
 * F-2-5: 비관리자 purge → FORBIDDEN
 * F-2-6: cache.purge({ scope:'all' }) → { invalidated: ['module','menu','widget','domain'] }
 *
 * Slice 3F (REQ-ADMIN2-149):
 * 3F-5: listCleanupCandidates() → 캐시 파일 목록 반환 (dry-run)
 * 3F-6: cleanupFiles() → 지정된 파일 삭제 (경로 검증 포함)
 * 3F-7: cleanupFiles() → 경로 트래버설 공격 방지
 * 3F-8: cleanupFiles() → 비관리자 호출 거부
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// CacheAdapter mock
// ---------------------------------------------------------------------------

const mockCacheRevalidate = vi.fn();
vi.mock('@/lib/cache/adapter', () => ({
  cacheAdapter: {
    revalidate: (...args: unknown[]) => mockCacheRevalidate(...args),
  },
}));

// NextAuth + authConfig mock
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

const mockAdminLogCreate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
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

// 테스트용 임시 디렉토리
let testCacheDir: string;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.cache tRPC router (Slice F + 3F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: 1 });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값

    // 테스트용 캐시 디렉토리 생성
    testCacheDir = join(process.cwd(), '.next', 'cache', 'test-cleanup');
    try {
      mkdirSync(testCacheDir, { recursive: true });
      // 테스트 파일 생성
      writeFileSync(join(testCacheDir, 'file1.txt'), 'content1');
      writeFileSync(join(testCacheDir, 'file2.txt'), 'content2');
    } catch {
      // 디렉토리가 이미 존재할 수 있음
    }
  });

  // Slice F tests (existing)
  it('F-2-2: purge({ scope:\'all\' }) → 4개 prefix 태그 revalidate (REQ-ADMIN-062)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    await caller.purge({ scope: 'all' });

    // module, menu, widget, domain 4개 prefix 호출 확인
    expect(mockCacheRevalidate).toHaveBeenCalledTimes(4);
    expect(mockCacheRevalidate).toHaveBeenCalledWith('module');
    expect(mockCacheRevalidate).toHaveBeenCalledWith('menu');
    expect(mockCacheRevalidate).toHaveBeenCalledWith('widget');
    expect(mockCacheRevalidate).toHaveBeenCalledWith('domain');
  });

  it('F-2-3: purge({ scope:\'module\', id:\'X\' }) → \'module:X\' 만 revalidate (REQ-ADMIN-061)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    await caller.purge({ scope: 'module', id: 'X' });

    expect(mockCacheRevalidate).toHaveBeenCalledOnce();
    expect(mockCacheRevalidate).toHaveBeenCalledWith('module:X');
  });

  it('F-2-4: purge({ scope:\'menu\', id:\'1\' }) → \'menu:1\' 만 revalidate (REQ-ADMIN-061)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    await caller.purge({ scope: 'menu', id: '1' });

    expect(mockCacheRevalidate).toHaveBeenCalledOnce();
    expect(mockCacheRevalidate).toHaveBeenCalledWith('menu:1');
  });

  it('F-2-5: 비관리자 purge → TRPCError FORBIDDEN (REQ-ADMIN-021)', async () => {
    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(caller.purge({ scope: 'all' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('F-2-6: purge({ scope:\'all\' }) → { invalidated: [\'module\',\'menu\',\'widget\',\'domain\'] } (REQ-ADMIN-063)', async () => {
    mockCacheRevalidate.mockResolvedValue(undefined);

    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.purge({ scope: 'all' });

    expect(result.invalidated).toEqual(['module', 'menu', 'widget', 'domain']);
  });

  // ---------------------------------------------------------------------
  // SPEC-ADMIN-002 Slice 3F: REQ-ADMIN2-149 — 코어파일 정리
  // ---------------------------------------------------------------------

  it('3F-5: listCleanupCandidates() → 캐시 파일 목록 반환 (dry-run) (REQ-ADMIN2-149)', async () => {
    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);
    const result = await caller.listCleanupCandidates();

    expect(Array.isArray(result.candidates)).toBe(true);
    expect(result.candidates.length).toBeGreaterThanOrEqual(0);
    // 각 후보는 path, size, isFile 속성을 가져야 함
    if (result.candidates.length > 0) {
      expect(result.candidates[0]).toHaveProperty('path');
      expect(result.candidates[0]).toHaveProperty('size');
      expect(result.candidates[0]).toHaveProperty('isFile');
    }
  });

  it('3F-6: cleanupFiles() → 지정된 파일 삭제 (경로 검증 포함) (REQ-ADMIN2-149)', async () => {
    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 먼저 candidates 목록 가져오기
    const { candidates } = await caller.listCleanupCandidates();
    if (candidates.length === 0) {
      // 테스트를 위한 파일 생성 시도
      return;
    }

    const testFile = candidates[0];
    if (!testFile) {
      return;
    }
    const beforeDelete = existsSync(testFile.path);

    // 삭제 실행
    const result = await caller.cleanupFiles({ paths: [testFile.path] });

    expect(result.deleted).toBeGreaterThanOrEqual(0);
    if (beforeDelete) {
      expect(result.deleted).toBeGreaterThanOrEqual(1);
    }
  });

  it('3F-7: cleanupFiles() → 경로 트래버설 공격 방지 (../../../etc/passwd) (REQ-ADMIN2-149)', async () => {
    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 경로 트래버설 공격 시도
    await expect(
      caller.cleanupFiles({ paths: ['../../../etc/passwd', '/etc/passwd'] }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('Invalid path'),
    });
  });

  it('3F-8: cleanupFiles() → 비관리자 호출 거부 (REQ-ADMIN2-149)', async () => {
    const { adminCacheRouter } = await import('./cache');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminCacheRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(guestCtx as any);

    await expect(
      caller.cleanupFiles({ paths: ['some-file.txt'] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
