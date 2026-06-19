/**
 * 보안 설정 페이지 — SPEC-ADMIN-002 Slice 1F (REQ-ADMIN2-113, REQ-ADMIN2-114)
 *
 * Password policy, session lifetime, login lockout settings.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-113, REQ-ADMIN2-114
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { SecuritySettingsForm } from './SecuritySettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSecuritySettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const [securitySettings, ipControlSettings] = await Promise.all([
    caller.admin.settings.getSecurity(),
    caller.admin.settings.getIpControl(),
  ]);

  const initial = {
    ...securitySettings,
    ipControlEnabled: ipControlSettings.enabled,
    ipControlAllowList: ipControlSettings.allowList.join('\n'),
    ipControlDenyList: ipControlSettings.denyList.join('\n'),
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">보안 설정</h1>
      <SecuritySettingsForm initial={initial} />
    </section>
  );
}
