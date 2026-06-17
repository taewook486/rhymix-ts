'use server';
/**
 * Admin 알림 설정 Server Action — SPEC-ADMIN-002 Slice 1F (REQ-ADMIN2-110).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-110
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getServerCaller } from '@/lib/trpc/server';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const UpdateNotificationSchema = z.object({
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().default(false),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFrom: z.string().email().optional().or(z.literal('')),
});

export async function updateNotificationSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateNotificationSchema.safeParse({
    senderName: formData.get('senderName'),
    senderEmail: formData.get('senderEmail'),
    smtpHost: formData.get('smtpHost') || undefined,
    smtpPort: formData.get('smtpPort') || undefined,
    smtpSecure: formData.get('smtpSecure') === 'on',
    smtpUser: formData.get('smtpUser') || undefined,
    smtpPassword: formData.get('smtpPassword') || undefined,
    smtpFrom: formData.get('smtpFrom') || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.settings.updateNotification({
      ...parsed.data,
      smtpFrom: parsed.data.smtpFrom || undefined,
    });
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '알림 설정 저장 중 오류가 발생했습니다.' };
  }
  revalidatePath('/admin/settings/notification');
  return {};
}
