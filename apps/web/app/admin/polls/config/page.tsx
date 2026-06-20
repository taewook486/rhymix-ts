/**
 * 설문 설정 page — SPEC-ADMIN-002 REQ-ADMIN2-086
 *
 * 비회원 투표 허용, 중복 투표 방지 방식의 전역 기본값을 관리한다.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-086
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { PollConfigForm } from './PollConfigForm';

export const dynamic = 'force-dynamic';

export default async function PollConfigPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const config = await caller.admin.poll.config.get();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">설문 설정</h1>
      <p className="text-muted-foreground mb-6">
        신규 설문 생성 시 기본값으로 적용되는 전역 설정입니다.
      </p>
      <PollConfigForm initial={config} />
    </section>
  );
}
