/**
 * 알림 설정 페이지 — SPEC-ADMIN-002 Slice 1F (REQ-ADMIN2-110)
 *
 * Email sender + SMTP settings.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-110
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { NotificationSettingsForm } from './NotificationSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const settings = await caller.admin.settings.getNotification();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">알림 설정</h1>
      <NotificationSettingsForm initial={settings} />
    </section>
  );
}
