/**
 * 설문 생성 page — SPEC-ADMIN-002 REQ-ADMIN2-084
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-084
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { PollForm } from '../PollForm';

export const dynamic = 'force-dynamic';

export default async function NewPollPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">설문 생성</h1>
      <PollForm />
    </section>
  );
}
