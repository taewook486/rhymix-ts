/**
 * 캡차 설정 page — SPEC-ADMIN-002 REQ-ADMIN2-124
 *
 * 캡차 공급자 및 트리거 조건 설정.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-124
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { CaptchaForm } from './CaptchaForm';

export const dynamic = 'force-dynamic';

export default async function CaptchaSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const settings = await caller.admin.spamfilter.captcha.get();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">캡차 설정</h1>
      <p className="text-muted-foreground mb-6">
        스팸 방지를 위해 캡차 공급자 및 트리거 조건을 설정합니다.
      </p>
      <CaptchaForm initialSettings={settings} />
    </section>
  );
}
