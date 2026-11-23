/**
 * assertAdminServerAction / adminServerActionDenied — D-7.
 *
 * tRPC 를 거치지 않는 관리자 Server Action 이 protectedAdminProcedure 와 같은 판정
 * (관리자 세션 + IP 제어/사이트 잠금 + 2FA)을 받는지 검증한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createContextMock, checkAdmin2FAMock } = vi.hoisted(() => ({
  createContextMock: vi.fn(),
  checkAdmin2FAMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'localhost:3000', 'x-forwarded-for': '203.0.113.9' }),
}));
vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] }, auth: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/server/api/context', () => ({ createContext: createContextMock }));
vi.mock('@rhymix-ts/admin/security', () => ({ checkAdmin2FA: checkAdmin2FAMock }));

function makePrisma(settings: {
  ipControl?: { enabled: boolean; allowList?: string[]; denyList?: string[] };
  sitelock?: { locked: boolean; allowedIpList?: string[] };
}) {
  const rowFor = (key: string) => {
    if (key === 'ipControl' && settings.ipControl) {
      return {
        value: {
          enabled: settings.ipControl.enabled,
          allowList: settings.ipControl.allowList ?? [],
          denyList: settings.ipControl.denyList ?? [],
        },
      };
    }
    if (key === 'sitelock' && settings.sitelock) {
      return {
        value: { locked: settings.sitelock.locked, allowedIpList: settings.sitelock.allowedIpList ?? [] },
      };
    }
    return null;
  };
  return {
    site: { findFirst: vi.fn(async () => ({ id: 1 })) },
    siteSetting: {
      findFirst: vi.fn(async ({ where }: any) => rowFor(where.key)),
      findUnique: vi.fn(async ({ where }: any) => rowFor(where.siteId_key.key)),
      create: vi.fn(async ({ data }: any) => ({ key: data.key, value: data.value })),
    },
  };
}

const admin = { user: { id: 1, isAdmin: true, groups: [] } };
const groupAdmin = { user: { id: 2, isAdmin: false, groups: [{ isAdmin: true }] } };
const member = { user: { id: 3, isAdmin: false, groups: [] } };

async function setup(ctx: Record<string, unknown>) {
  createContextMock.mockResolvedValue({ ip: '203.0.113.9', siteId: 1, ...ctx });
  const { clearAdminSecurityCache } = await import('@/server/api/admin-guard');
  clearAdminSecurityCache();
  return import('./admin-guard');
}

describe('assertAdminServerAction (D-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAdmin2FAMock.mockResolvedValue('pass');
  });

  it('관리자 세션 + 설정 없음 → 통과하고 세션을 돌려준다', async () => {
    const { assertAdminServerAction } = await setup({ session: admin, prisma: makePrisma({}) });
    await expect(assertAdminServerAction()).resolves.toMatchObject({ user: { id: 1 } });
  });

  it('관리자 그룹 소속(user.isAdmin=false, group.isAdmin=true)도 통과 — session.user.isAdmin 만 보던 곳이 막던 사용자', async () => {
    const { assertAdminServerAction } = await setup({ session: groupAdmin, prisma: makePrisma({}) });
    await expect(assertAdminServerAction()).resolves.toMatchObject({ user: { id: 2 } });
  });

  it('비로그인 → FORBIDDEN', async () => {
    const { assertAdminServerAction } = await setup({ session: null, prisma: makePrisma({}) });
    await expect(assertAdminServerAction()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('일반 회원 → FORBIDDEN', async () => {
    const { assertAdminServerAction } = await setup({ session: member, prisma: makePrisma({}) });
    await expect(assertAdminServerAction()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('IP 차단 목록에 걸린 관리자 → FORBIDDEN', async () => {
    const prisma = makePrisma({ ipControl: { enabled: true, denyList: ['203.0.113.0/24'] } });
    const { assertAdminServerAction } = await setup({ session: admin, prisma });
    await expect(assertAdminServerAction()).rejects.toMatchObject({ code: 'FORBIDDEN', message: '허용되지 않은 IP입니다.' });
  });

  it('허용 목록에 없는 IP → FORBIDDEN', async () => {
    const prisma = makePrisma({ ipControl: { enabled: true, allowList: ['10.0.0.0/8'] } });
    const { assertAdminServerAction } = await setup({ session: admin, prisma });
    await expect(assertAdminServerAction()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('사이트 잠금 중 허용 목록 밖 IP → FORBIDDEN', async () => {
    const prisma = makePrisma({ sitelock: { locked: true, allowedIpList: ['198.51.100.1'] } });
    const { assertAdminServerAction } = await setup({ session: admin, prisma });
    await expect(assertAdminServerAction()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('사이트 잠금 중이라도 허용 목록 IP 는 통과', async () => {
    const prisma = makePrisma({ sitelock: { locked: true, allowedIpList: ['203.0.113.9'] } });
    const { assertAdminServerAction } = await setup({ session: admin, prisma });
    await expect(assertAdminServerAction()).resolves.toBeDefined();
  });

  it.each([
    ['need-enroll', '2FA 등록이 필요합니다.'],
    ['need-verify', '2FA 인증이 필요합니다.'],
  ])('2FA %s → FORBIDDEN', async (result, message) => {
    checkAdmin2FAMock.mockResolvedValue(result);
    const { assertAdminServerAction } = await setup({ session: admin, prisma: makePrisma({}) });
    await expect(assertAdminServerAction()).rejects.toMatchObject({ code: 'FORBIDDEN', message });
  });

  it('설정 조회가 실패하면 tRPC 와 같이 fail-open', async () => {
    const prisma = makePrisma({});
    prisma.siteSetting.findFirst = vi.fn(async () => {
      throw new Error('db down');
    });
    const { assertAdminServerAction } = await setup({ session: admin, prisma });
    await expect(assertAdminServerAction()).resolves.toBeDefined();
  });
});

describe('adminServerActionDenied (D-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAdmin2FAMock.mockResolvedValue('pass');
  });

  it('통과하면 null', async () => {
    const { adminServerActionDenied } = await setup({ session: admin, prisma: makePrisma({}) });
    await expect(adminServerActionDenied()).resolves.toBeNull();
  });

  it('거부되면 사유 문자열 (throw 하지 않음)', async () => {
    const { adminServerActionDenied } = await setup({ session: member, prisma: makePrisma({}) });
    await expect(adminServerActionDenied()).resolves.toBe('관리자 권한이 필요합니다.');
  });

  it('IP 거부 사유도 문자열로', async () => {
    const prisma = makePrisma({ ipControl: { enabled: true, denyList: ['203.0.113.0/24'] } });
    const { adminServerActionDenied } = await setup({ session: admin, prisma });
    await expect(adminServerActionDenied()).resolves.toBe('허용되지 않은 IP입니다.');
  });
});

describe('adminServerActionCheck (D-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAdmin2FAMock.mockResolvedValue('pass');
  });

  it('통과하면 세션을 함께 돌려준다', async () => {
    const { adminServerActionCheck } = await setup({ session: admin, prisma: makePrisma({}) });
    await expect(adminServerActionCheck()).resolves.toMatchObject({ ok: true, session: { user: { id: 1 } } });
  });

  it('거부되면 { ok:false, message }', async () => {
    const { adminServerActionCheck } = await setup({ session: member, prisma: makePrisma({}) });
    await expect(adminServerActionCheck()).resolves.toEqual({ ok: false, message: '관리자 권한이 필요합니다.' });
  });
});
