'use server';
/**
 * 속도 제한 설정 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-123.
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateRateLimitAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const actionType = formData.get('actionType') as string;
    const maxSubmissions = parseInt(formData.get('maxSubmissions') as string, 10);
    const windowSeconds = parseInt(formData.get('windowSeconds') as string, 10);
    const enabled = formData.get('enabled') === 'true';

    if (!actionType || isNaN(maxSubmissions) || isNaN(windowSeconds)) {
      return { error: '잘못된 입력값입니다.' };
    }

    const caller = await getServerCaller();
    await caller.admin.spamfilter.rateLimit.update({
      actionType,
      maxSubmissions,
      windowSeconds,
      enabled,
    });

    revalidatePath('/admin/settings/spamfilter/block');

    return { success: true };
  } catch (error) {
    console.error('Update rate limit error:', error);
    return { error: '속도 제한 설정 저장에 실패했습니다.' };
  }
}
