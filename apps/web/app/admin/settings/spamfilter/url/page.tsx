/**
 * URL 블랙리스트 관리 page — SPEC-SPAM-001 REQ-SPAM-002, REQ-SPAM-006
 *
 * URL 블랙리스트 목록 조회 및 추가/삭제.
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-006
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { UrlBlacklistForm } from './UrlBlacklistForm';

export const dynamic = 'force-dynamic';

export default async function UrlBlacklistPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  // Assume siteId=1 for now - this would be dynamic in production
  const urlBlacklists = await caller.admin.spamfilter.urlBlacklist.list();

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">URL 블랙리스트 관리</h1>
      <p className="text-muted-foreground mb-6">
        문서 및 댓글 제출 시 필터링할 URL 도메인을 관리합니다.
      </p>
      <UrlBlacklistForm initialBlacklists={urlBlacklists} />
    </section>
  );
}
