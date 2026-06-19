/**
 * 금지어 관리 page — SPEC-ADMIN-002 REQ-ADMIN2-121
 *
 * 금지어 목록 조회 및 추가/삭제.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-121
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { DeniedWordsForm } from './DeniedWordsForm';

export const dynamic = 'force-dynamic';

export default async function DeniedWordsPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const words = await caller.admin.spamfilter.deniedWords.list();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">금지어 관리</h1>
      <p className="text-muted-foreground mb-6">문서 및 댓글 제출 시 필터링할 금지어를 관리합니다.</p>
      <DeniedWordsForm initialWords={words} />
    </section>
  );
}
