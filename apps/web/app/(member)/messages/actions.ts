/**
 * 쪽지함 Server Actions — SPEC-MESSAGE-001 REQ-MSG-002.
 *
 * (member)/messages 페이지가 사용하는 삭제 액션.
 *
 * @MX:SPEC: SPEC-MESSAGE-001 REQ-MSG-002, REQ-MSG-004
 */
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { getServerCaller } from '@/lib/trpc/server';

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/messages');
  }
  return session;
}

export async function deleteMessageAction(messageId: number): Promise<void> {
  await requireSession();
  const caller = await getServerCaller();
  await caller.content.message.delete({ id: messageId });
  revalidatePath('/messages');
}

export async function deleteMessagesAction(formData: FormData): Promise<void> {
  await requireSession();

  const ids = formData
    .getAll('messageIds')
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (ids.length === 0) {
    return;
  }

  const caller = await getServerCaller();
  await Promise.all(ids.map((id) => caller.content.message.delete({ id })));
  revalidatePath('/messages');
}
