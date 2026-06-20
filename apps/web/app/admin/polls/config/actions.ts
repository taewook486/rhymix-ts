'use server';
/**
 * 설문 전역 설정 Server Action — SPEC-ADMIN-002 REQ-ADMIN2-086.
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updatePollConfigAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const allowGuestVote = formData.get('allowGuestVote') === 'on';
    const duplicateVotePolicy = String(formData.get('duplicateVotePolicy') ?? 'by-member');

    const caller = await getServerCaller();
    await caller.admin.poll.config.set({
      allowGuestVote,
      duplicateVotePolicy: duplicateVotePolicy as 'by-member' | 'by-ip' | 'by-cookie',
    });

    revalidatePath('/admin/polls/config');

    return { success: true };
  } catch (error) {
    console.error('Update poll config error:', error);
    return { error: '설문 설정 저장에 실패했습니다.' };
  }
}
