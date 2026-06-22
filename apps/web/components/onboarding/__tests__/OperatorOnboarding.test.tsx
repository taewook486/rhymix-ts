/**
 * OperatorOnboarding 게이팅 로직 테스트 — SPEC-INSTALL-003 REQ-INSTALL3-002, 003.
 *
 * OperatorOnboarding 자체는 async Server Component라 RTL로 직접 렌더링할
 * 수 없다(React: "async/await is not yet supported in Client Components").
 * 대신 분기를 결정하는 getOnboardingDismissed()만 분리해 검증한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { siteSettingFindFirstMock } = vi.hoisted(() => ({
  siteSettingFindFirstMock: vi.fn(),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    siteSetting: { findFirst: siteSettingFindFirstMock },
  },
}));

// OperatorOnboarding은 모듈 최상단에서 DismissButton -> app/actions/onboarding ->
// @/lib/auth/config -> 실제 next-auth를 import 체인으로 끌고 온다. 실제 next-auth는
// 이 환경에서 "next/server" 모듈 해석에 실패하는 사전 존재 이슈가 있다
// (SPEC-TEST-DEBT-001 참조) — 이 테스트는 getOnboardingDismissed()만 검증하므로
// auth 관련 모듈을 mock해 그 체인을 차단한다.
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}));

import { getOnboardingDismissed } from '../OperatorOnboarding';

describe('getOnboardingDismissed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REQ-INSTALL3-003: SiteSetting이 없으면(미해제) false를 반환한다', async () => {
    siteSettingFindFirstMock.mockResolvedValueOnce(null);

    const dismissed = await getOnboardingDismissed(1);

    expect(dismissed).toBe(false);
    expect(siteSettingFindFirstMock).toHaveBeenCalledWith({
      where: { siteId: 1, key: 'operator_onboarding_dismissed' },
      select: { value: true },
    });
  });

  it('REQ-INSTALL3-002: SiteSetting.value가 true이면 true를 반환한다(해제됨)', async () => {
    siteSettingFindFirstMock.mockResolvedValueOnce({ value: true });

    const dismissed = await getOnboardingDismissed(1);

    expect(dismissed).toBe(true);
  });

  it('SiteSetting.value가 false이면 false를 반환한다', async () => {
    siteSettingFindFirstMock.mockResolvedValueOnce({ value: false });

    const dismissed = await getOnboardingDismissed(1);

    expect(dismissed).toBe(false);
  });

  it('DB 오류 시 안전하게 false(미해제)로 폴백한다', async () => {
    siteSettingFindFirstMock.mockRejectedValueOnce(new Error('connection refused'));

    const dismissed = await getOnboardingDismissed(1);

    expect(dismissed).toBe(false);
  });
});
