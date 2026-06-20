/**
 * Admin access-control enforcement tests — SPEC-ADMIN-002 REQ-ADMIN2-115/155.
 *
 * Verifies the requireAdmin middleware in ../../trpc actually ENFORCES:
 * - IP allow/deny list (REQ-ADMIN2-115)
 * - Site lock (REQ-ADMIN2-155)
 *
 * Critical: when IP control / sitelock are disabled (the default), existing admin
 * flows MUST be unaffected.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// next/cache is imported by adminUtilsRouter; stub it.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

/**
 * Build a prisma mock whose siteSetting.findFirst answers per-key, so we can
 * drive ipControl / sitelock state precisely. getOrCreateSiteSetting (used by the
 * real checkIpAccess) needs site.findFirst + siteSetting.findUnique + create too.
 */
function makePrisma(settings: {
  ipControl?: { enabled: boolean; allowList?: string[]; denyList?: string[] };
  sitelock?: { locked: boolean; allowedIpList?: string[] };
}) {
  const rowFor = (key: string): { value: unknown } | null => {
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
        value: {
          locked: settings.sitelock.locked,
          allowedIpList: settings.sitelock.allowedIpList ?? [],
        },
      };
    }
    return null; // includes requireAdminTwoFactor → 2FA disabled
  };

  return {
    site: { findFirst: vi.fn(async () => ({ id: 1 })) },
    siteSetting: {
      findFirst: vi.fn(async ({ where }: any) => rowFor(where.key)),
      findUnique: vi.fn(async ({ where }: any) => rowFor(where.siteId_key.key)),
      create: vi.fn(async ({ data }: any) => ({ key: data.key, value: data.value })),
    },
    adminLog: { create: vi.fn(async () => ({ id: BigInt(1) })) },
  };
}

const adminSession = { user: { id: 1, isAdmin: true, groups: [] } };

async function callInvalidate(ctx: unknown) {
  const { adminUtilsRouter } = await import('./admin-utils');
  const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
  clearAdminSecurityCache();
  const createCaller = createCallerFactory(adminUtilsRouter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caller = createCaller(ctx as any);
  return caller.invalidateMenuCache();
}

describe('admin access control enforcement — REQ-ADMIN2-115/155', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(c) unaffected when IP control and sitelock are disabled (default)', async () => {
    const prisma = makePrisma({});
    const result = await callInvalidate({
      session: adminSession,
      prisma,
      ip: '203.0.113.9',
      siteId: 1,
    });
    expect(result).toEqual({ invalidated: true, path: '/admin' });
  });

  it('(a) admin from a denied IP gets FORBIDDEN when IP control is enabled', async () => {
    const prisma = makePrisma({
      ipControl: { enabled: true, allowList: [], denyList: ['203.0.113.0/24'] },
    });
    await expect(
      callInvalidate({
        session: adminSession,
        prisma,
        ip: '203.0.113.9', // inside denied range
        siteId: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('(a2) admin NOT in allow list gets FORBIDDEN when IP control restricts', async () => {
    const prisma = makePrisma({
      ipControl: { enabled: true, allowList: ['10.0.0.0/8'], denyList: [] },
    });
    await expect(
      callInvalidate({
        session: adminSession,
        prisma,
        ip: '203.0.113.9', // not in allow list
        siteId: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('(b) admin gets FORBIDDEN when site is locked and IP not in allow list', async () => {
    const prisma = makePrisma({
      sitelock: { locked: true, allowedIpList: ['198.51.100.1'] },
    });
    await expect(
      callInvalidate({
        session: adminSession,
        prisma,
        ip: '203.0.113.9', // not allowed during lock
        siteId: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('(b2) admin in the sitelock allow list passes through when site is locked', async () => {
    const prisma = makePrisma({
      sitelock: { locked: true, allowedIpList: ['203.0.113.9'] },
    });
    const result = await callInvalidate({
      session: adminSession,
      prisma,
      ip: '203.0.113.9',
      siteId: 1,
    });
    expect(result).toEqual({ invalidated: true, path: '/admin' });
  });

  it('admin in the IP allow list passes through when IP control is enabled', async () => {
    const prisma = makePrisma({
      ipControl: { enabled: true, allowList: ['203.0.113.0/24'], denyList: [] },
    });
    const result = await callInvalidate({
      session: adminSession,
      prisma,
      ip: '203.0.113.9',
      siteId: 1,
    });
    expect(result).toEqual({ invalidated: true, path: '/admin' });
  });
});
