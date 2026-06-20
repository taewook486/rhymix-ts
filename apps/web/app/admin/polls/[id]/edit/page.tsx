/**
 * 설문 수정 page — SPEC-ADMIN-002 REQ-ADMIN2-084
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-084
 */
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { PollForm } from '../../PollForm';
import { DeletePollButton } from './DeletePollButton';

export const dynamic = 'force-dynamic';

export default async function EditPollPage({
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

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">설문 수정</h1>
        <DeletePollButton id={poll.id} />
      </div>
      <PollForm
        initial={{
          id: poll.id,
          title: poll.title,
          description: poll.description,
          allowGuestVote: poll.allowGuestVote,
          allowMultipleChoice: poll.allowMultipleChoice,
          duplicateVotePolicy: poll.duplicateVotePolicy as 'by-member' | 'by-ip' | 'by-cookie',
          startAt: poll.startAt,
          endAt: poll.endAt,
          options: poll.options.map((option: { label: string }) => ({ label: option.label })),
        }}
      />
    </section>
  );
}
