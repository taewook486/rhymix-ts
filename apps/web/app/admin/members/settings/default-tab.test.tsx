// @vitest-environment jsdom
/**
 * 회원 설정 페이지 — "기본 설정" 탭 — SPEC-MEMBER-ADMIN-001 Slice D.
 *
 * AC-D1: "기본 설정" 탭이 첫 번째 탭으로 표시된다.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-015, REQ-MADM-016
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const mockGetDefault = vi.fn();
const mockGetSignup = vi.fn();
const mockGetLogin = vi.fn();
const mockGetAgreement = vi.fn();
const mockGetFeature = vi.fn();
const mockGetDesign = vi.fn();

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      settings: {
        getDefault: (...args: unknown[]) => mockGetDefault(...args),
        getSignup: (...args: unknown[]) => mockGetSignup(...args),
        getLogin: (...args: unknown[]) => mockGetLogin(...args),
        getAgreement: (...args: unknown[]) => mockGetAgreement(...args),
        getFeature: (...args: unknown[]) => mockGetFeature(...args),
        getDesign: (...args: unknown[]) => mockGetDesign(...args),
      },
    },
  }),
}));

describe('AdminMemberSettingsPage — 기본 설정 탭 (Slice D)', () => {
  it('AC-D1: "기본 설정" 탭이 첫 번째(다른 탭들보다 앞) 탭으로 표시된다', async () => {
    mockGetDefault.mockResolvedValue({
      signupAccessMode: 'ALLOW',
      signupKey: '',
      emailAuthTtlHours: 24,
      showProfilePhotoInList: true,
      nicknameChangeAllowed: true,
      nicknameSaveChangeLog: true,
      nicknameAllowSpecialChars: false,
      nicknameAllowedSpecialChars: '',
      nicknameAllowSpacing: false,
      allowDuplicateNickname: false,
      passwordPolicyLevel: 'NORMAL',
      argon2TimeCost: 3,
      autoRehashEnabled: true,
    });
    mockGetSignup.mockResolvedValue({
      enabled: true,
      requireEmailVerification: true,
      requireAdminApproval: false,
      allowDuplicateNickname: false,
    });
    mockGetLogin.mockResolvedValue({
      allowAutoLogin: true,
      autoLoginDuration: 30,
      maxFailedAttempts: 5,
      redirectAfterLogin: 'last_page',
    });
    mockGetAgreement.mockResolvedValue({
      terms: '',
      privacy: '',
      termsRequired: true,
      privacyRequired: true,
      termsVersion: null,
      privacyVersion: null,
    });
    mockGetFeature.mockResolvedValue({
      allowProfileImage: true,
      allowSignature: true,
      exposeInMemberSearch: true,
    });
    mockGetDesign.mockResolvedValue({ memberSkinId: '', memberTemplateId: '' });

    const { default: AdminMemberSettingsPage } = await import('./page');
    const result = await AdminMemberSettingsPage();

    const { container } = render(result as React.ReactElement);

    const tabLabels = Array.from(container.querySelectorAll('nav a')).map((a) => a.textContent);
    expect(tabLabels[0]).toBe('기본 설정');
    expect(tabLabels).toEqual([
      '기본 설정',
      '가입 설정',
      '로그인 설정',
      '약관 설정',
      '기능 설정',
      '디자인 설정',
    ]);

    // 기본 설정 탭이 실제로 렌더된 필드 몇 개 확인 (장식용 탭이 아님).
    expect(container.querySelector('select[name="signupAccessMode"]')).not.toBeNull();
    expect(container.querySelector('input[name="argon2TimeCost"]')).not.toBeNull();
  }, 30000);
});
