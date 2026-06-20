/**
 * 디버그 설정 페이지 — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-117/159/160).
 *
 * 디버그 설정: 느린 작업 임계값, 표시 방법/내용, 로그 파일 경로, 허용 IP, 쿼리 진단 옵션, 에러 로그 수준.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-117, REQ-ADMIN2-159, REQ-ADMIN2-160
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { DebugSettingsForm } from './DebugSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminDebugSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const debugSettings = await caller.admin.settings.getDebug();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">디버그 설정</h1>
      <DebugSettingsForm initialSettings={debugSettings} />
    </section>
  );
}
