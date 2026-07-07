/**
 * 스팸 검토 큐 page — SPEC-SPAM-001 REQ-SPAM-005
 *
 * 스팸 의심 콘텐츠 목록 조회 및 승인/삭제/차단 처리.
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-005
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { SpamReviewQueue } from './SpamReviewQueue';

export const dynamic = 'force-dynamic';

export default async function SpamReviewPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  // Assume siteId=1 for now - this would be dynamic in production
  const result = await caller.admin.spamfilter.reviewQueue.list({});

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">스팸 검토 큐</h1>
      <p className="text-muted-foreground mb-6">
        스팸 필터에 의해 차단된 콘텐츠를 검토하고 승인/삭제/차단 처리를 수행합니다.
      </p>
      <SpamReviewQueue initialData={result as any} />
    </section>
  );
}
