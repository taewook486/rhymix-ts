'use server';
/**
 * 캡차 설정 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-124.
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { z } from 'zod';

export type ActionState = {
  error?: string;
  success?: boolean;
};

const UpdateCaptchaSettingsSchema = z.object({
  provider: z.enum(['none', 'recaptcha', 'turnstile', 'simple_math']),
  triggers: z.array(z.string()).default([]),
  siteKey: z.string().optional(),
  secret: z.string().optional(),
  threshold: z.number().min(0).max(1).optional(),
});

export async function updateCaptchaSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const provider = formData.get('provider') as 'none' | 'recaptcha' | 'turnstile' | 'simple_math';
    const triggersStr = formData.get('triggers') as string;
    const siteKey = formData.get('siteKey') as string | null;
    const secret = formData.get('secret') as string | null;
    const thresholdStr = formData.get('threshold') as string | null;

    if (!provider) {
      return { error: '공급자를 선택해주세요.' };
    }

    const triggers = triggersStr ? triggersStr.split(',').filter(Boolean) : [];
    const threshold = thresholdStr ? parseFloat(thresholdStr) : 0.5;

    const parsed = UpdateCaptchaSettingsSchema.safeParse({
      provider,
      triggers,
      siteKey: siteKey || undefined,
      secret: secret || undefined,
      threshold: threshold || undefined,
    });

    if (!parsed.success) {
      return { error: '입력값이 유효하지 않습니다.' };
    }

    const caller = await getServerCaller();
    await caller.admin.spamfilter.captcha.update(parsed.data);

    revalidatePath('/admin/settings/spamfilter/captcha');

    return { success: true };
  } catch (error) {
    console.error('Update captcha settings error:', error);
    return { error: '캡차 설정 저장에 실패했습니다.' };
  }
}
