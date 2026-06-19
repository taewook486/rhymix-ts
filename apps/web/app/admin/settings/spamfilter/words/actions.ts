'use server';
/**
 * 금지어 관리 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-121.
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function addDeniedWordAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const word = formData.get('word') as string;

    if (!word?.trim()) {
      return { error: '금지어를 입력해주세요.' };
    }

    const caller = await getServerCaller();
    await caller.admin.spamfilter.deniedWords.add({ word });

    revalidatePath('/admin/settings/spamfilter/words');

    return { success: true };
  } catch (error) {
    console.error('Add denied word error:', error);
    return { error: '금지어 추가에 실패했습니다.' };
  }
}

export async function removeDeniedWordAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const id = parseInt(formData.get('id') as string, 10);

    if (!id || isNaN(id)) {
      return { error: '잘못된 ID입니다.' };
    }

    const caller = await getServerCaller();
    await caller.admin.spamfilter.deniedWords.remove({ id });

    revalidatePath('/admin/settings/spamfilter/words');

    return { success: true };
  } catch (error) {
    console.error('Remove denied word error:', error);
    return { error: '금지어 삭제에 실패했습니다.' };
  }
}
