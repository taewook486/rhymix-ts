/**
 * AdminLog CSV 내보내기 Route Handler 테스트 — SPEC-ADMIN-001 Slice E-3.
 *
 * E-3-1: 관리자 세션 → 200 + Content-Type text/csv + Content-Disposition attachment.
 * E-3-2: 비관리자 → 403.
 * E-3-3: actorId query param → 해당 actor 만 포함된 CSV.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// auth mock
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

// DB mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// @rhymix-ts/db mock
vi.mock('@rhymix-ts/db', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockUserFindUnique = vi.fn();
const mockAdminLogFindMany = vi.fn();

const mockPrismaForRoute = {
  user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  adminLog: { findMany: (...args: unknown[]) => mockAdminLogFindMany(...args) },
};

vi.mock('@rhymix-ts/db', () => ({
  prisma: mockPrismaForRoute,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth/config';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

const makeAdminLog = (id: number, actorId: number) => ({
  id: BigInt(id),
  actorId,
  action: 'admin.module.create',
  target: '',
  ip: '127.0.0.1',
  userAgent: 'Test/1.0',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  diff: {},
  updatedAt: new Date('2024-01-01T00:00:00Z'),
});

describe('GET /api/admin/logs/export (Slice E-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('E-3-1: 관리자 세션 → 200 + text/csv + Content-Disposition attachment', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });
    mockAdminLogFindMany.mockResolvedValue([makeAdminLog(1, 1), makeAdminLog(2, 2)]);

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/admin/logs/export');
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('admin-logs-');
    expect(disposition).toContain('.csv');
  });

  it('E-3-2: 비관리자 → 403', async () => {
    mockAuth.mockResolvedValue({ user: { id: 2 } });
    mockUserFindUnique.mockResolvedValue({ id: 2, isAdmin: false });

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/admin/logs/export');
    const res = await GET(req as never);

    expect(res.status).toBe(403);
  });

  it('E-3-3: actorId query param → 해당 actor 만 포함된 CSV', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });
    mockAdminLogFindMany.mockResolvedValue([makeAdminLog(5, 42)]);

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/admin/logs/export?actorId=42');
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    // findMany 가 actorId=42 로 호출됐는지 확인
    expect(mockAdminLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actorId: 42 }),
      }),
    );
    // CSV body 에 actorId 42 가 포함됨
    const body = await res.text();
    expect(body).toContain('42');
  });
});
