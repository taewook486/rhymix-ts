/**
 * Specification tests for 2FA gate helpers — SPEC-ADMIN-001 Slice I (REQ-ADMIN-023).
 *
 * I-1-1: SiteSetting 없음 → isAdminTwoFactorRequired → false
 * I-1-2: SiteSetting requireAdminTwoFactor=true → isAdminTwoFactorRequired → true
 * I-1-3: session.user.twoFactorVerified=true → isSessionTwoFactorVerified → true
 * I-1-4: session 없음 / 플래그 누락 → false
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

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

const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isAdminTwoFactorRequired (Slice I — REQ-ADMIN-023)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('I-1-1: SiteSetting 없음 → false (기본 비활성)', async () => {
    mockSiteSettingFindFirst.mockResolvedValueOnce(null);

    const { isAdminTwoFactorRequired } = await import('./two-factor');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isAdminTwoFactorRequired(mockPrisma as any);

    expect(result).toBe(false);
    // SPEC-ADMIN-2FA-OTP-001 M5: canonical getSiteAdminTwoFactorPolicy 위임.
    // siteId=1 기본값 + select.value 로 조회된다.
    expect(mockSiteSettingFindFirst).toHaveBeenCalledWith({
      where: { siteId: 1, key: 'requireAdminTwoFactor' },
      select: { value: true },
    });
  });

  it('I-1-2: SiteSetting requireAdminTwoFactor=true → true', async () => {
    mockSiteSettingFindFirst.mockResolvedValueOnce({ key: 'requireAdminTwoFactor', value: true });

    const { isAdminTwoFactorRequired } = await import('./two-factor');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isAdminTwoFactorRequired(mockPrisma as any);

    expect(result).toBe(true);
  });

  it('I-1-2b: SiteSetting value=false → false', async () => {
    mockSiteSettingFindFirst.mockResolvedValueOnce({ key: 'requireAdminTwoFactor', value: false });

    const { isAdminTwoFactorRequired } = await import('./two-factor');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isAdminTwoFactorRequired(mockPrisma as any);

    expect(result).toBe(false);
  });
});

describe('isSessionTwoFactorVerified (Slice I — REQ-ADMIN-023)', () => {
  it('I-1-3: session.user.twoFactorVerified=true → true', async () => {
    const { isSessionTwoFactorVerified } = await import('./two-factor');
    const session = { user: { id: 1, isAdmin: true, twoFactorVerified: true, groups: [] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isSessionTwoFactorVerified(session as any)).toBe(true);
  });

  it('I-1-4a: session null → false', async () => {
    const { isSessionTwoFactorVerified } = await import('./two-factor');
    expect(isSessionTwoFactorVerified(null)).toBe(false);
  });

  it('I-1-4b: twoFactorVerified 누락 → false', async () => {
    const { isSessionTwoFactorVerified } = await import('./two-factor');
    const session = { user: { id: 1, isAdmin: true, groups: [] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isSessionTwoFactorVerified(session as any)).toBe(false);
  });

  it('I-1-4c: twoFactorVerified=false → false', async () => {
    const { isSessionTwoFactorVerified } = await import('./two-factor');
    const session = { user: { id: 1, isAdmin: true, twoFactorVerified: false, groups: [] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isSessionTwoFactorVerified(session as any)).toBe(false);
  });
});
