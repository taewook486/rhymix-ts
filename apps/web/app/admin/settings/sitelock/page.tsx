/**
 * 사이트 잠금 설정 페이지 — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-155)
 *
 * 사이트 잠금 런타임 설정: 유지보수 모드 토글, 허용 IP 목록 관리.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-155
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { headers } from 'next/headers';
import { SitelockSettingsForm } from './SitelockSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSitelockSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const settings = await caller.admin.settings.getSitelock();

  // Get current admin IP from headers (same method as in the action)
  const headersList = await headers();
  const currentIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    headersList.get('x-real-ip') ||
                    null;

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">사이트 잠금</h1>
      <SitelockSettingsForm initial={settings} currentIp={currentIp} />
    </section>
  );
}
