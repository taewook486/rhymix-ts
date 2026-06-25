/**
 * checkAdmin2FA 상태 매트릭스 테스트 — SPEC-ADMIN-2FA-OTP-001 M5
 *   (REQ-2OTP-060~062, 082, AC-7).
 *
 * (policy on/off) × (등록/미등록) × (verified/unverified) 전이를 검증한다.
 * b220fd1 회귀(siteId 하드코딩, canonical 필드) 방어도 포함.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import {
  checkAdmin2FA,
  getSiteAdminTwoFactorPolicy,
} from './two-factor-gate';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

const mockSiteSettingFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  user: {
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
  },
} as unknown as PrismaClient;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** policy on/off 만 toggle 하는 헬퍼. */
function setPolicy(required: boolean): void {
  mockSiteSettingFindFirst.mockReset();
  if (required) {
    mockSiteSettingFindFirst.mockResolvedValue({
      key: 'requireAdminTwoFactor',
      value: true,
    });
  } else {
    mockSiteSettingFindFirst.mockResolvedValue(null);
  }
}

function setEnrollment(opts: {
  enabled: boolean;
  secret: string | null;
}): void {
  mockUserFindUnique.mockReset();
  mockUserFindUnique.mockResolvedValue({
    twoFactorEnabled: opts.enabled,
    twoFactorSecret: opts.secret,
  });
}

function sessionWith({
  verified,
  userId = 42,
}: {
  verified: boolean;
  userId?: number;
}): unknown {
  return { user: { id: userId, twoFactorVerified: verified } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getSiteAdminTwoFactorPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('M5-P1: SiteSetting 미존재 → false', async () => {
    mockSiteSettingFindFirst.mockResolvedValue(null);
    const result = await getSiteAdminTwoFactorPolicy(mockPrisma, 1);
    expect(result).toBe(false);
  });

  it('M5-P2: value=true → true', async () => {
    mockSiteSettingFindFirst.mockResolvedValue({ value: true });
    const result = await getSiteAdminTwoFactorPolicy(mockPrisma, 1);
    expect(result).toBe(true);
  });

  it('M5-P3: siteId 인자가 쿼리에 전달된다 (b220fd1 no-hardcoded-siteId 회귀 방어)', async () => {
    mockSiteSettingFindFirst.mockResolvedValue(null);
    await getSiteAdminTwoFactorPolicy(mockPrisma, 99);
    expect(mockSiteSettingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ siteId: 99 }),
      }),
    );
  });
});

describe('checkAdmin2FA — 상태 매트릭스 (REQ-2OTP-060, AC-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('M5-G1: policy off → 등록/검증 무관 pass', async () => {
    setPolicy(false);
    setEnrollment({ enabled: false, secret: null });
    // user DB 조회조차 일어나지 않아야 한다.
    const result = await checkAdmin2FA(
      sessionWith({ verified: false }),
      mockPrisma,
      1,
    );
    expect(result).toBe('pass');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('M5-G2: policy on + 미등록 → need-enroll (REQ-2OTP-060, "assume enrolled" stub 제거)', async () => {
    setPolicy(true);
    setEnrollment({ enabled: false, secret: null });
    const result = await checkAdmin2FA(
      sessionWith({ verified: false }),
      mockPrisma,
      1,
    );
    expect(result).toBe('need-enroll');
  });

  it('M5-G3: policy on + enabled=true 인데 secret 누락(데이터 불일치) → need-enroll', async () => {
    setPolicy(true);
    setEnrollment({ enabled: true, secret: null });
    const result = await checkAdmin2FA(
      sessionWith({ verified: true }),
      mockPrisma,
      1,
    );
    expect(result).toBe('need-enroll');
  });

  it('M5-G4: policy on + 등록 + 미verified → need-verify', async () => {
    setPolicy(true);
    setEnrollment({ enabled: true, secret: 'enc-blob' });
    const result = await checkAdmin2FA(
      sessionWith({ verified: false }),
      mockPrisma,
      1,
    );
    expect(result).toBe('need-verify');
  });

  it('M5-G5: policy on + 등록 + verified → pass', async () => {
    setPolicy(true);
    setEnrollment({ enabled: true, secret: 'enc-blob' });
    const result = await checkAdmin2FA(
      sessionWith({ verified: true }),
      mockPrisma,
      1,
    );
    expect(result).toBe('pass');
  });

  it('M5-G6: 세션/user 없음 → need-enroll', async () => {
    setPolicy(true);
    const result = await checkAdmin2FA(null, mockPrisma, 1);
    expect(result).toBe('need-enroll');
  });

  it('M5-G7: user.id 누락 → need-enroll (방어)', async () => {
    setPolicy(true);
    const result = await checkAdmin2FA(
      { user: { twoFactorVerified: true } },
      mockPrisma,
      1,
    );
    expect(result).toBe('need-enroll');
  });

  it('M5-G8: user.id 문자열(string from jwt) 도 허용 → number 변환 후 동일 판정', async () => {
    setPolicy(true);
    setEnrollment({ enabled: true, secret: 'enc-blob' });
    const result = await checkAdmin2FA(
      { user: { id: '42', twoFactorVerified: true } },
      mockPrisma,
      1,
    );
    expect(result).toBe('pass');
    // number 변환 값으로 DB 조회.
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 42 } }),
    );
  });

  it('M5-G9: siteId 인자가 user lookup 시에도 하드코딩되지 않는다 (b220fd1 회귀 방어)', async () => {
    setPolicy(true);
    setEnrollment({ enabled: true, secret: 'enc-blob' });
    await checkAdmin2FA(sessionWith({ verified: true }), mockPrisma, 777);
    expect(mockSiteSettingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ siteId: 777 }),
      }),
    );
  });

  it('M5-G10: User 미존재(findUnique null) → need-enroll (fail-safe)', async () => {
    setPolicy(true);
    mockUserFindUnique.mockResolvedValue(null);
    const result = await checkAdmin2FA(
      sessionWith({ verified: true }),
      mockPrisma,
      1,
    );
    expect(result).toBe('need-enroll');
  });
});
