/**
 * 회원 설정 페이지 — SPEC-ADMIN-002 Slice 1D + Slice 2C.
 *
 * Server Component. admin.settings.getSignup/getLogin/getAgreement/getFeature 로 설정 조회.
 * 탭 UI: 가입 / 로그인 / 약관 / 기능 / 디자인.
 *
 * @MX:NOTE: [AUTO] Server Actions 사용 (actions.ts).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-046~048, REQ-ADMIN2-050, REQ-ADMIN2-051, REQ-ADMIN2-052, REQ-ADMIN2-054
 */
import Link from 'next/link';
import { getServerCaller } from '@/lib/trpc/server';
import { SignupSettingsForm, LoginSettingsForm, AgreementSettingsForm, FeatureSettingsForm, DesignSettingsForm } from './forms';

export const dynamic = 'force-dynamic';

export default async function AdminMemberSettingsPage() {
  const caller = await getServerCaller();

  const [signupSettings, loginSettings, agreementSettings, featureSettings, designSettings] = await Promise.all([
    caller.admin.settings.getSignup(),
    caller.admin.settings.getLogin(),
    caller.admin.settings.getAgreement(),
    caller.admin.settings.getFeature(),
    caller.admin.settings.getDesign(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">회원 설정</h1>
        <div className="flex gap-4">
          <Link href="/admin/members/nickname-log" className="text-sm text-blue-600 hover:underline">
            닉네임 변경 기록 →
          </Link>
          <Link href="/admin/members/joinform" className="text-sm text-blue-600 hover:underline">
            가입 양식 편집 →
          </Link>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-zinc-200 mb-6">
        <nav className="-mb-px flex gap-4">
          <a
            href="#signup"
            className="px-4 py-2 text-sm font-medium border-b-2 border-zinc-800 text-zinc-900"
          >
            가입 설정
          </a>
          <a
            href="#login"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-600 hover:text-zinc-900"
          >
            로그인 설정
          </a>
          <a
            href="#agreement"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-600 hover:text-zinc-900"
          >
            약관 설정
          </a>
          <a
            href="#feature"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-600 hover:text-zinc-900"
          >
            기능 설정
          </a>
          <a
            href="#design"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-600 hover:text-zinc-900"
          >
            디자인 설정
          </a>
        </nav>
      </div>

      {/* 가입 설정 탭 */}
      <section id="signup" className="mb-8">
        <h2 className="text-lg font-medium mb-4">가입 설정</h2>

        <SignupSettingsForm initial={signupSettings} />
      </section>

      {/* 로그인 설정 탭 */}
      <section id="login" className="mb-8">
        <h2 className="text-lg font-medium mb-4">로그인 설정</h2>

        <LoginSettingsForm initial={loginSettings} />
      </section>

      {/* 약관 설정 탭 */}
      <section id="agreement" className="mb-8">
        <h2 className="text-lg font-medium mb-4">약관 설정</h2>

        <AgreementSettingsForm
          initial={{
            terms: agreementSettings.terms ?? '',
            privacy: agreementSettings.privacy ?? '',
            termsRequired: agreementSettings.termsRequired,
            privacyRequired: agreementSettings.privacyRequired,
            termsVersion: agreementSettings.termsVersion ?? null,
            privacyVersion: agreementSettings.privacyVersion ?? null,
          }}
        />
      </section>

      {/* 기능 설정 탭 */}
      <section id="feature" className="mb-8">
        <h2 className="text-lg font-medium mb-4">기능 설정</h2>

        <FeatureSettingsForm initial={featureSettings} />
      </section>

      {/* 디자인 설정 탭 */}
      <section id="design" className="mb-8">
        <h2 className="text-lg font-medium mb-4">디자인 설정</h2>

        <DesignSettingsForm
          initial={{
            memberSkinId: designSettings.memberSkinId ?? '',
            memberTemplateId: designSettings.memberTemplateId ?? '',
          }}
        />
      </section>
    </div>
  );
}
