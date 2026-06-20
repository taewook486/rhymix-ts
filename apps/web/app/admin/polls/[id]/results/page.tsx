/**
 * 설문 결과 page — SPEC-ADMIN-002 REQ-ADMIN2-085
 *
 * 옵션별 투표수와 백분율을 표시한다.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-085
 */
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

export default async function PollResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const { id } = await params;
  const pollId = parseInt(id, 10);
  if (Number.isNaN(pollId)) {
    notFound();
  }

  const caller = await getServerCaller();
  const poll = await caller.admin.poll.get({ id: pollId });
  const results = await caller.admin.poll.results({ id: pollId });

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">{poll.title} — 설문 결과</h1>
      <p className="text-muted-foreground mb-6">총 투표수: {results.totalVotes}</p>

      <div className="space-y-4 max-w-xl">
        {results.options.map((option) => (
          <div key={option.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{option.label}</span>
              <span className="text-muted-foreground">
                {option.voteCount}표 ({option.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
        {results.options.length === 0 && (
          <p className="text-muted-foreground">옵션이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
