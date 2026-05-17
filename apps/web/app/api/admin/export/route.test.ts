/**
 * 사이트 설정 내보내기 Route Handler 테스트 — SPEC-ADMIN-001 Slice H-1.
 *
 * H-1-1: 관리자 세션 → 200 + Content-Type application/json + Content-Disposition attachment.
 * H-1-2: 비관리자 → 403.
 * H-1-3: 번들 JSON 에 version:1, exportedAt, site, domains, menus, moduleInstances 포함.
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
const mockSiteFindFirst = vi.fn();
const mockDomainFindMany = vi.fn();
const mockMenuFindMany = vi.fn();
const mockModuleInstanceFindMany = vi.fn();

const mockPrismaForRoute = {
  user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  site: { findFirst: (...args: unknown[]) => mockSiteFindFirst(...args) },
  domain: { findMany: (...args: unknown[]) => mockDomainFindMany(...args) },
  menu: { findMany: (...args: unknown[]) => mockMenuFindMany(...args) },
  moduleInstance: { findMany: (...args: unknown[]) => mockModuleInstanceFindMany(...args) },
};

vi.mock('@rhymix-ts/db', () => ({
  prisma: mockPrismaForRoute,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth/config';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

const makeSite = () => ({
  id: 1,
  defaultLanguage: 'ko',
  timeZone: 'Asia/Seoul',
});

const makeDomain = (id: number, hostname: string) => ({
  id,
  hostname,
  isDefault: id === 1,
  forceHttps: false,
});

const makeMenu = (id: number) => ({
  id,
  title: `메뉴${id}`,
  isAdminMenu: false,
  items: [
    { id: 10 * id, parentId: null, title: `항목${id}`, url: `/path${id}`, listOrder: 0 },
  ],
});

const makeModuleInstance = (id: number) => ({
  id,
  mid: `module${id}`,
  moduleCode: 'board',
  name: `모듈${id}`,
});

describe('GET /api/admin/export (Slice H-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('H-1-1: 관리자 세션 → 200 + Content-Type application/json + Content-Disposition attachment', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });
    mockSiteFindFirst.mockResolvedValue(makeSite());
    mockDomainFindMany.mockResolvedValue([makeDomain(1, 'example.com')]);
    mockMenuFindMany.mockResolvedValue([makeMenu(1)]);
    mockModuleInstanceFindMany.mockResolvedValue([makeModuleInstance(1)]);

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/admin/export');
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('rhymix-export-');
  });

  it('H-1-2: 비관리자 → 403', async () => {
    mockAuth.mockResolvedValue({ user: { id: 2 } });
    mockUserFindUnique.mockResolvedValue({ id: 2, isAdmin: false });

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/admin/export');
    const res = await GET(req as never);

    expect(res.status).toBe(403);
  });

  it('H-1-3: 번들 JSON 에 version:1, exportedAt, site, domains, menus, moduleInstances 포함', async () => {
    mockAuth.mockResolvedValue({ user: { id: 1 } });
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true });
    mockSiteFindFirst.mockResolvedValue(makeSite());
    mockDomainFindMany.mockResolvedValue([makeDomain(1, 'example.com')]);
    mockMenuFindMany.mockResolvedValue([makeMenu(1)]);
    mockModuleInstanceFindMany.mockResolvedValue([makeModuleInstance(1)]);

    const { GET } = await import('./route');
    const req = new Request('http://localhost/api/admin/export');
    const res = await GET(req as never);

    const body = JSON.parse(await res.text());
    expect(body.version).toBe(1);
    expect(body.exportedAt).toBeDefined();
    expect(body.site).toBeDefined();
    expect(Array.isArray(body.domains)).toBe(true);
    expect(Array.isArray(body.menus)).toBe(true);
    expect(Array.isArray(body.moduleInstances)).toBe(true);
  });
});
