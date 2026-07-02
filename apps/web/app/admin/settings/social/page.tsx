/**
 * 소셜 로그인 설정 페이지 — SPEC-SOCIAL-LOGIN-001 (REQ-SOCIAL-005)
 *
 * 카카오/구글 OAuth Client ID/Secret 및 활성화/비활성화 설정.
 * @MX:SPEC: SPEC-SOCIAL-LOGIN-001 REQ-SOCIAL-005
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { SocialSettingsForm } from './SocialSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSocialSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const socialSettings = await caller.admin.settings.getSocial();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">소셜 로그인 설정</h1>
      <SocialSettingsForm initial={socialSettings} />
    </section>
  );
}
