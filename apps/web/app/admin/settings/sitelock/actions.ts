'use server';
/**
 * 사이트 잠금 설정 Server Actions — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-155).
 */
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateSitelockSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();

    // Get current admin IP from headers
    const headersList = await headers();
    const currentIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      headersList.get('x-real-ip') ||
                      null;

    // Parse IP list from textarea (one per line)
    const ipListText = formData.get('allowedIpList') as string;
    const allowedIpList = ipListText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    await caller.admin.settings.updateSitelock({
      locked: formData.get('locked') === 'true',
      message: (formData.get('message') as string) || undefined,
      allowedIpList,
    });

    revalidatePath('/admin/settings/sitelock');

    return { success: true };
  } catch (error) {
    console.error('Sitelock settings update error:', error);
    return { error: '설정 저장에 실패했습니다.' };
  }
}
