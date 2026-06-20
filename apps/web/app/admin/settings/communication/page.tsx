/**
 * 쪽지 설정 페이지 — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-143)
 *
 * 쪽지 기능 설정: 활성화 여부, 수신함 최대 개수 제한.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-143
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { CommunicationSettingsForm } from './CommunicationSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminCommunicationSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const settings = await caller.admin.settings.getCommunication();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">쪽지 설정</h1>
      <CommunicationSettingsForm initial={settings} />
    </section>
  );
}
