/**
 * 속도 제한 설정 page — SPEC-ADMIN-002 REQ-ADMIN2-123
 *
 * 도배 방지를 위한 제출 속도 제한 설정 관리.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-123
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { RateLimitForm } from './RateLimitForm';

export const dynamic = 'force-dynamic';

export default async function RateLimitPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const rules = await caller.admin.spamfilter.rateLimit.list();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">속도 제한 설정</h1>
      <p className="text-muted-foreground mb-6">도배 방지를 위한 제출 속도 제한을 설정합니다.</p>
      <RateLimitForm initialRules={rules} />
    </section>
  );
}
