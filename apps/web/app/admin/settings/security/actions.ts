'use server';
/**
 * Admin 보안 설정 Server Action — SPEC-ADMIN-002 Slice 1F (REQ-ADMIN2-113, REQ-ADMIN2-114).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-113, REQ-ADMIN2-114
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getServerCaller } from '@/lib/trpc/server';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// REQ-ADMIN2-114: 인증을 무력화할 수 있는 값(과도하게 짧은 비밀번호, 비정상적으로 긴 세션 등)은
// 여기서부터 거부한다. 서버 측 updateSecurity 프로시저(zod min/max)가 최종 방어선이다.
const UpdateSecuritySchema = z.object({
  passwordMinLength: z.coerce.number().int().min(4).max(50),
  passwordRequireComplex: z.boolean().default(false),
  sessionLifetime: z.coerce.number().int().min(60).max(31536000),
  loginMaxAttempts: z.coerce.number().int().min(1).max(10),
  loginLockoutTime: z.coerce.number().int().min(60).max(86400),
});

export async function updateSecuritySettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateSecuritySchema.safeParse({
    passwordMinLength: formData.get('passwordMinLength'),
    passwordRequireComplex: formData.get('passwordRequireComplex') === 'on',
    sessionLifetime: formData.get('sessionLifetime'),
    loginMaxAttempts: formData.get('loginMaxAttempts'),
    loginLockoutTime: formData.get('loginLockoutTime'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.settings.updateSecurity(parsed.data);
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '보안 설정 저장 중 오류가 발생했습니다.' };
  }
  revalidatePath('/admin/settings/security');
  return {};
}

/**
 * IP 접근 제어 설정 Server Action — SPEC-ADMIN-002 Slice 2G (REQ-ADMIN2-115)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-115
 */
const UpdateIpControlSchema = z.object({
  ipControlEnabled: z.boolean().default(false),
  ipControlAllowList: z.string().default(''),
  ipControlDenyList: z.string().default(''),
});

export async function updateIpControlSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateIpControlSchema.safeParse({
    ipControlEnabled: formData.get('ipControlEnabled') === 'on',
    ipControlAllowList: formData.get('ipControlAllowList'),
    ipControlDenyList: formData.get('ipControlDenyList'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();

    // Parse IP lists (comma or newline separated)
    const parseIpList = (text: string): string[] => {
      if (!text) return [];
      return text
        .split(/[,\n]/)
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);
    };

    await caller.admin.settings.updateIpControl({
      enabled: parsed.data.ipControlEnabled,
      allowList: parseIpList(parsed.data.ipControlAllowList),
      denyList: parseIpList(parsed.data.ipControlDenyList),
    });
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: 'IP 제어 설정 저장 중 오류가 발생했습니다.' };
  }
  revalidatePath('/admin/settings/security');
  return {};
}

/**
 * CAPTCHA 설정 Server Action — SPEC-CAPTCHA-001 REQ-CAPTCHA-005.
 *
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-005
 */
const UpdateCaptchaSchema = z.object({
  captchaSignupEnabled: z.boolean().default(false),
  captchaLoginEnabled: z.boolean().default(false),
  captchaSiteKey: z.string().default(''),
  captchaSecretKey: z.string().default(''),
  captchaLoginThreshold: z.coerce.number().int().min(1).max(10),
});

export async function updateCaptchaSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateCaptchaSchema.safeParse({
    captchaSignupEnabled: formData.get('captchaSignupEnabled') === 'on',
    captchaLoginEnabled: formData.get('captchaLoginEnabled') === 'on',
    captchaSiteKey: formData.get('captchaSiteKey'),
    captchaSecretKey: formData.get('captchaSecretKey'),
    captchaLoginThreshold: formData.get('captchaLoginThreshold'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();

    // TODO: Replace with actual tRPC call when backend is ready
    // await caller.admin.settings.updateCaptcha(parsed.data);

    // Mock: just log for now
    console.log('[Mock] Update CAPTCHA settings:', parsed.data);
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: 'CAPTCHA 설정 저장 중 오류가 발생했습니다.' };
  }
  revalidatePath('/admin/settings/security');
  return {};
}
