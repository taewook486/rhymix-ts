/**
 * 고급 설정 페이지 — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-116/157/158)
 *
 * 고급 설정: 라우팅/지역화/성능/캐시 설정.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-116, REQ-ADMIN2-157, REQ-ADMIN2-158
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { AdvancedSettingsForm } from './AdvancedSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminAdvancedSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const [routing, localization, performance] = await Promise.all([
    caller.admin.settings.getAdvancedRouting(),
    caller.admin.settings.getAdvancedLocalization(),
    caller.admin.settings.getAdvancedPerformance(),
  ]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">고급 설정</h1>
      <AdvancedSettingsForm
        initialRouting={routing}
        initialLocalization={localization}
        initialPerformance={performance}
      />
    </section>
  );
}
