'use server';
/**
 * 쪽지 설정 Server Actions — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-143).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-143
 */
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

const CommunicationSettingsSchema = z.object({
  enabled: z.boolean(),
  inboxLimit: z.number().int().min(1).max(10000),
});

export async function updateCommunicationSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  const parsed = CommunicationSettingsSchema.safeParse({
    enabled: formData.get('enabled') === 'on' || formData.get('enabled') === 'true',
    inboxLimit: Number(formData.get('inboxLimit')),
  });

  if (!parsed.success) {
    return { error: '입력값이 올바르지 않습니다.' };
  }

  try {
    const caller = await getServerCaller();

    await caller.admin.settings.updateCommunication(parsed.data);

    revalidatePath('/admin/settings/communication');

    return { success: true };
  } catch (error) {
    console.error('Communication settings update error:', error);
    return { error: '설정 저장에 실패했습니다.' };
  }
}
