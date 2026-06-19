'use server';
/**
 * 비동기 작업 설정 Server Actions — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-154).
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateAsyncSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();

    await caller.admin.settings.updateAsync({
      enabled: formData.get('enabled') === 'true',
      driver: formData.get('driver') as 'none' | 'db',
      webcronKey: (formData.get('webcronKey') as string) || undefined,
      webcronShowError: formData.get('webcronShowError') === 'true',
      intervalMinutes: parseInt(formData.get('intervalMinutes') as string, 10),
      processCount: parseInt(formData.get('processCount') as string, 10),
    });

    revalidatePath('/admin/settings/async');

    return { success: true };
  } catch (error) {
    console.error('Async settings update error:', error);
    return { error: '설정 저장에 실패했습니다.' };
  }
}
