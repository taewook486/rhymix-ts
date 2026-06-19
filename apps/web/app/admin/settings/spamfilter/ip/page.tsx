/**
 * 차단 IP 관리 page — SPEC-ADMIN-002 REQ-ADMIN2-120
 *
 * 차단 IP 목록 조회 및 추가/삭제.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-120
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { DeniedIpForm } from './DeniedIpForm';

export const dynamic = 'force-dynamic';

export default async function DeniedIpPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const ips = await caller.admin.spamfilter.deniedIps.list();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">차단 IP 관리</h1>
      <p className="text-muted-foreground mb-6">차단된 IP 주소 또는 CIDR 범위를 관리합니다.</p>
      <DeniedIpForm initialIps={ips} />
    </section>
  );
}
