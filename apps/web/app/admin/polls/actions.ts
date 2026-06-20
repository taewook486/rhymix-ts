'use server';
/**
 * 설문 생성/수정/삭제 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-084.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

function parseOptions(formData: FormData): { label: string }[] {
  const labels = formData.getAll('optionLabel').map((v) => String(v).trim());
  return labels.filter((label) => label.length > 0).map((label) => ({ label }));
}

export async function createPollAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const startAt = String(formData.get('startAt') ?? '');
    const endAt = String(formData.get('endAt') ?? '');
    const allowGuestVote = formData.get('allowGuestVote') === 'on';
    const allowMultipleChoice = formData.get('allowMultipleChoice') === 'on';
    const duplicateVotePolicy = String(formData.get('duplicateVotePolicy') ?? 'by-member');
    const options = parseOptions(formData);

    if (!title) {
      return { error: '제목을 입력해주세요.' };
    }
    if (options.length < 2) {
      return { error: '설문 옵션은 최소 2개 이상이어야 합니다.' };
    }
    if (!startAt || !endAt) {
      return { error: '투표 기간을 입력해주세요.' };
    }

    const caller = await getServerCaller();
    const poll = await caller.admin.poll.create({
      title,
      description: description || undefined,
      allowGuestVote,
      allowMultipleChoice,
      duplicateVotePolicy: duplicateVotePolicy as 'by-member' | 'by-ip' | 'by-cookie',
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      options,
    });

    revalidatePath('/admin/polls');
    redirect(`/admin/polls/${poll.id}/edit`);
  } catch (error) {
    console.error('Create poll error:', error);
    return { error: error instanceof Error ? error.message : '설문 생성에 실패했습니다.' };
  }
}

export async function updatePollAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const id = parseInt(String(formData.get('id') ?? ''), 10);
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const startAt = String(formData.get('startAt') ?? '');
    const endAt = String(formData.get('endAt') ?? '');
    const allowGuestVote = formData.get('allowGuestVote') === 'on';
    const allowMultipleChoice = formData.get('allowMultipleChoice') === 'on';
    const duplicateVotePolicy = String(formData.get('duplicateVotePolicy') ?? 'by-member');

    if (!id || Number.isNaN(id)) {
      return { error: '잘못된 설문 ID입니다.' };
    }
    if (!title) {
      return { error: '제목을 입력해주세요.' };
    }

    const caller = await getServerCaller();
    await caller.admin.poll.update({
      id,
      title,
      description: description || undefined,
      allowGuestVote,
      allowMultipleChoice,
      duplicateVotePolicy: duplicateVotePolicy as 'by-member' | 'by-ip' | 'by-cookie',
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    });

    revalidatePath('/admin/polls');
    revalidatePath(`/admin/polls/${id}/edit`);

    return { success: true };
  } catch (error) {
    console.error('Update poll error:', error);
    return { error: error instanceof Error ? error.message : '설문 수정에 실패했습니다.' };
  }
}

export async function deletePollAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const id = parseInt(String(formData.get('id') ?? ''), 10);
    if (!id || Number.isNaN(id)) {
      return { error: '잘못된 설문 ID입니다.' };
    }

    const caller = await getServerCaller();
    await caller.admin.poll.delete({ id });

    revalidatePath('/admin/polls');
    redirect('/admin/polls');
  } catch (error) {
    console.error('Delete poll error:', error);
    return { error: error instanceof Error ? error.message : '설문 삭제에 실패했습니다.' };
  }
}
