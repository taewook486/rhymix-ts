'use server';
/**
 * 차단 IP 관리 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-120.
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function addDeniedIpAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const ipPattern = formData.get('ipPattern') as string;

    if (!ipPattern?.trim()) {
      return { error: 'IP 패턴을 입력해주세요.' };
    }

    const caller = await getServerCaller();
    await caller.admin.spamfilter.deniedIps.add({ ipPattern });

    revalidatePath('/admin/settings/spamfilter/ip');

    return { success: true };
  } catch (error) {
    console.error('Add denied IP error:', error);
    return { error: '차단 IP 추가에 실패했습니다.' };
  }
}

export async function removeDeniedIpAction(
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
    await caller.admin.spamfilter.deniedIps.remove({ id });

    revalidatePath('/admin/settings/spamfilter/ip');

    return { success: true };
  } catch (error) {
    console.error('Remove denied IP error:', error);
    return { error: '차단 IP 삭제에 실패했습니다.' };
  }
}
