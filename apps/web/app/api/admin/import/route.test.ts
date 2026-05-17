/**
 * 사이트 설정 가져오기 Route Handler 테스트 — SPEC-ADMIN-001 Slice H-2.
 *
 * H-2-1: 비관리자 → 403.
 * H-2-2: 잘못된 JSON 스키마 (version:99) → 400 + error field.
 * H-2-3: dryRun=true → { dryRun: true, preview } 반환, $transaction NOT called.
 * H-2-4: dryRun=false + 유효 번들 → $transaction 호출 + { applied: true } 반환.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// auth mock
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockUserFindUnique = vi.fn();
const mockDomainFindMany = vi.fn();
const mockModuleInstanceFindMany = vi.fn();
const mockDomainUpdate = vi.fn().mockResolvedValue({});
const mockDomainCreate = vi.fn().mockResolvedValue({});
const mockModuleInstanceCreate = vi.fn().mockResolvedValue({});
const mockSiteFindFirst = vi.fn();
const mockTransaction = vi.fn();

const mockPrismaForRoute = {
  user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  domain: {
    findMany: (...args: unknown[]) => mockDomainFindMany(...args),
    update: (...args: unknown[]) => mockDomainUpdate(...args),
    create: (...args: unknown[]) => mockDomainCreate(...args),
  },
  moduleInstance: {
    findMany: (...args: unknown[]) => mockModuleInstanceFindMany(...args),
    create: (...args: unknown[]) => mockModuleInstanceCreate(...args),
  },
  site: { findFirst: (...args: unknown[]) => mockSiteFindFirst(...args) },
  $transaction: (...args: unknown[]) => mockTransaction(...args),
};

vi.mock('@rhymix-ts/db', () => ({
  prisma: mockPrismaForRoute,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth/config';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

const validBundle = {
  version: 1 as const,
  exportedAt: new Date().toISOString(),
  site: { id: 1, defaultLanguage: 'ko', timeZone: 'Asia/Seoul' },
  domains: [{ id: 1, hostname: 'example.com', isDefault: true, forceHttps: false }],
  menus: [
    {
      id: 1,
      title: '메인메뉴',
      isAdminMenu: false,
      items: [{ id: 10, parentId: null, title: '홈', url: '/', listOrder: 0 }],
    },
  ],
  moduleInstances: [{ id: 1, mid: 'module1', moduleCode: 'board', name: '게시판' }],
};

describe('POST /api/admin/import (Slice H-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('H-2-1: 비관리자 → 403', async () => {
    mockAuth.mockResolvedValue({ user: { id: 2 } });
    mockUserFindUnique.mockResolvedValue({ id: 2, isAdmin: false });

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/admin/import?dryRun=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBundle),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(403);
  });

  it('H-2-2: 잘못된 JSON 스키마 (version:99) → 400 + error field', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/admin/import?dryRun=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 99, exportedAt: 'x', site: null, domains: [], menus: [], moduleInstances: [] }),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('H-2-3: dryRun=true → { dryRun: true, preview } 반환, $transaction NOT called', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });
    mockDomainFindMany.mockResolvedValue([]);
    mockModuleInstanceFindMany.mockResolvedValue([]);

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/admin/import?dryRun=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBundle),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dryRun).toBe(true);
    expect(body.preview).toBeDefined();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('H-2-4: dryRun=false + 유효 번들 → $transaction 호출 + { applied: true } 반환', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });
    mockDomainFindMany.mockResolvedValue([]);
    mockModuleInstanceFindMany.mockResolvedValue([]);
    // $transaction mock — callback 형태 지원
    mockTransaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') {
        const tx = {
          site: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
          domain: { update: vi.fn().mockResolvedValue({}), create: vi.fn().mockResolvedValue({}) },
          moduleInstance: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }
    });

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/admin/import?dryRun=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBundle),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dryRun).toBe(false);
    expect(body.applied).toBe(true);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});
