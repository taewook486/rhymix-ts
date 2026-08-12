/**
 * Specification tests for admin.mailLog tRPC router — SPEC-CONTENT-PARITY-001 M7.
 *
 * REQ-CPAR-016: 메일 발송 내역 목록 조회 (수신자, 제목, 상태, 에러 메시지, 발송 시간)
 * - 상태 필터 (전체/성공/실패)
 * - cursor pagination
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Context } from '../../context';

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

const mockSiteSettingFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockUserFindUnique = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  mailLog: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
  },
};

/**
 * 라우터 호출용 최소 Context.
 *
 * 실제 `Context` 타입은 `storage` / `scanner` / `uploadTokenSecret` 도 요구하지만
 * mailLog 라우터는 `ctx.prisma` / `ctx.session` 만 사용한다(파일 업로드 계열 필드는
 * 이 라우터의 코드 경로에 등장하지 않는다). 쓰지 않는 필드를 형식만 채우면 오히려
 * "이 테스트가 storage 를 검증한다"는 오해를 낳으므로, 캐스트 사유를 명시하고
 * 한 곳에서만 좁힌다 — cache.test.ts 등 형제 admin 라우터 테스트와 동일한 관례다.
 */
const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
} as unknown as Context;

describe(
  'admin.mailLog tRPC router (SPEC-CONTENT-PARITY-001 M7)',
  { timeout: 30000 }, // WSL2 dynamic-import cold-start 여유 (12-15s+), 로직 결함 아님
  () => {
    // WSL2 환경에서 protectedAdminProcedure의 requireAdmin2FAIfEnabled 미들웨어가
    // await import('@rhymix-ts/admin/security') dynamic import를 수행할 때
    // 첫 실행 시 cold-start cost 발생. 환경적 이슈이며, 테스트 로직 결함 아님
    // (team lead 진단: file.test.ts에서도 동일한 15초 턱걸이 관찰).
    // 후속 인프라 개선 과제: vitest 워커预热 또는 dynamic import 최적화.

  beforeEach(() => {
    vi.clearAllMocks();
    // 2FA 정책 비활성 (IP control + sitelock + 2FA 모두 비활성)
    mockSiteSettingFindFirst.mockResolvedValue(null);
  });

  it('list: 상태 필터 없이 전체 목록 반환 (REQ-CPAR-016)', async () => {
    const mockLogs = [
      {
        id: 1,
        siteId: null,
        recipient: 'user1@example.com',
        subject: 'Test Subject 1',
        status: 'SENT',
        error: null,
        createdAt: new Date('2024-08-10T12:00:00Z'),
      },
      {
        id: 2,
        siteId: null,
        recipient: 'user2@example.com',
        subject: 'Test Subject 2',
        status: 'FAILED',
        error: 'Connection refused',
        createdAt: new Date('2024-08-10T12:05:00Z'),
      },
    ];

    (mockPrisma.mailLog.count as any).mockResolvedValueOnce(2);
    (mockPrisma.mailLog.findMany as any).mockResolvedValueOnce(mockLogs);

    const { adminMailLogRouter } = await import('./mail-log');
    const caller = adminMailLogRouter.createCaller(adminCtx);

    const result = await caller.list({
      limit: 20,
      status: 'ALL',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.nextCursor).toBeNull();
    expect(mockPrisma.mailLog.count).toHaveBeenCalledWith({
      where: {},
    });
    expect(mockPrisma.mailLog.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 21,
    });
  });

  it('list: 상태 필터 SENT (성공만 조회)', async () => {
    const mockLogs = [
      {
        id: 1,
        siteId: null,
        recipient: 'user1@example.com',
        subject: 'Test Subject 1',
        status: 'SENT',
        error: null,
        createdAt: new Date('2024-08-10T12:00:00Z'),
      },
    ];

    (mockPrisma.mailLog.count as any).mockResolvedValueOnce(1);
    (mockPrisma.mailLog.findMany as any).mockResolvedValueOnce(mockLogs);

    const { adminMailLogRouter } = await import('./mail-log');
    const caller = adminMailLogRouter.createCaller(adminCtx);

    const result = await caller.list({
      limit: 20,
      status: 'SENT',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.status).toBe('SENT');
    expect(mockPrisma.mailLog.count).toHaveBeenCalledWith({
      where: { status: 'SENT' },
    });
    expect(mockPrisma.mailLog.findMany).toHaveBeenCalledWith({
      where: { status: 'SENT' },
      orderBy: { createdAt: 'desc' },
      take: 21,
    });
  });

  it('list: 상태 필터 FAILED (실패만 조회)', async () => {
    const mockLogs = [
      {
        id: 2,
        siteId: null,
        recipient: 'user2@example.com',
        subject: 'Test Subject 2',
        status: 'FAILED',
        error: 'Connection refused',
        createdAt: new Date('2024-08-10T12:05:00Z'),
      },
    ];

    (mockPrisma.mailLog.count as any).mockResolvedValueOnce(1);
    (mockPrisma.mailLog.findMany as any).mockResolvedValueOnce(mockLogs);

    const { adminMailLogRouter } = await import('./mail-log');
    const caller = adminMailLogRouter.createCaller(adminCtx);

    const result = await caller.list({
      limit: 20,
      status: 'FAILED',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.status).toBe('FAILED');
    expect(result.items[0]!.error).toBe('Connection refused');
    expect(mockPrisma.mailLog.count).toHaveBeenCalledWith({
      where: { status: 'FAILED' },
    });
  });

  it('list: cursor pagination (REQ-CPAR-016)', async () => {
    // 첫 페이지: 3개 아이템 (limit=2, take=3) → 2개 반환 + nextCursor
    const firstPageLogs = [
      { id: 1, siteId: null, recipient: 'user1@example.com', subject: 'S1', status: 'SENT' as const, error: null, createdAt: new Date() },
      { id: 2, siteId: null, recipient: 'user2@example.com', subject: 'S2', status: 'FAILED' as const, error: 'E2', createdAt: new Date() },
      { id: 3, siteId: null, recipient: 'user3@example.com', subject: 'S3', status: 'SENT' as const, error: null, createdAt: new Date() },
    ];

    (mockPrisma.mailLog.count as any).mockResolvedValueOnce(3);
    (mockPrisma.mailLog.findMany as any).mockResolvedValueOnce(firstPageLogs);

    const { adminMailLogRouter } = await import('./mail-log');
    const caller = adminMailLogRouter.createCaller(adminCtx);

    const result = await caller.list({
      limit: 2,
      status: 'ALL',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeTruthy();
    expect(result.totalCount).toBe(3);

    // nextCursor로 두 번째 페이지 조회 (1개만 남음)
    const secondPageLogs = [
      { id: 3, siteId: null, recipient: 'user3@example.com', subject: 'S3', status: 'SENT' as const, error: null, createdAt: new Date() },
    ];

    (mockPrisma.mailLog.count as any).mockResolvedValueOnce(3);
    (mockPrisma.mailLog.findMany as any).mockResolvedValueOnce(secondPageLogs);

    const cursor = result.nextCursor!;
    const result2 = await caller.list({
      cursor,
      limit: 2,
      status: 'ALL',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result2.items).toHaveLength(1);
    expect(result2.items[0]!.id).toBe(3);
    expect(result2.nextCursor).toBeNull();
  });
});
