/**
 * 비동기 작업 설정 페이지 — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-154)
 *
 * 비동기 작업 설정: 사용 여부, 드라이버, 웹크론 설정, 호출 간격, 프로세스 갯수.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-154
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { AsyncSettingsForm } from './AsyncSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminAsyncSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const settings = await caller.admin.settings.getAsync();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">비동기 작업 설정</h1>
      <AsyncSettingsForm initial={settings} />
    </section>
  );
}
