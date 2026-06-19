/**
 * SEO 설정 페이지 — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-118/119)
 *
 * SEO 설정: 메타 태그, Open Graph, canonical URL, sitemap.xml 생성.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-118, REQ-ADMIN2-119
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { SeoSettingsForm } from './SeoSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSeoSettingsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const settings = await caller.admin.settings.getSeo();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">SEO 설정</h1>
      <SeoSettingsForm initial={settings} />
    </section>
  );
}
