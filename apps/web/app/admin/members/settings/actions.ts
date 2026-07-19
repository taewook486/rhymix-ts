'use server'
/**
 * Admin 회원 설정 Server Actions — SPEC-ADMIN-002 Slice 1D + Slice 2C.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-047, REQ-ADMIN2-048, REQ-ADMIN2-050, REQ-ADMIN2-051, REQ-ADMIN2-052
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// Signup Settings Actions
// ---------------------------------------------------------------------------

const UpdateSignupSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
  requireAdminApproval: z.boolean().default(false),
  allowDuplicateNickname: z.boolean().default(false),
})

export async function updateSignupSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateSignupSettingsSchema.safeParse({
    enabled: formData.get('enabled') === 'on',
    requireEmailVerification: formData.get('requireEmailVerification') === 'on',
    requireAdminApproval: formData.get('requireAdminApproval') === 'on',
    allowDuplicateNickname: formData.get('allowDuplicateNickname') === 'on',
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.settings.updateSignup(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '가입 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/settings')
  return {}
}

// ---------------------------------------------------------------------------
// Default Settings Actions — "기본 설정" 탭 (SPEC-MEMBER-ADMIN-001 Slice D)
// ---------------------------------------------------------------------------

const UpdateDefaultSettingsSchema = z.object({
  signupAccessMode: z.enum(['ALLOW', 'DENY', 'SIGNUP_KEY']).default('ALLOW'),
  signupKey: z.string().max(200).default(''),
  emailAuthTtlHours: z.coerce.number().int().positive().max(24 * 365).default(24),
  showProfilePhotoInList: z.boolean().default(true),
  nicknameChangeAllowed: z.boolean().default(true),
  nicknameSaveChangeLog: z.boolean().default(true),
  nicknameAllowSpecialChars: z.boolean().default(false),
  nicknameAllowedSpecialChars: z.string().max(100).default(''),
  nicknameAllowSpacing: z.boolean().default(false),
  allowDuplicateNickname: z.boolean().default(false),
  passwordPolicyLevel: z.enum(['NORMAL', 'STRONG', 'VERY_STRONG']).default('NORMAL'),
  argon2TimeCost: z.coerce.number().int().min(2).max(10).default(3),
  autoRehashEnabled: z.boolean().default(true),
})

export async function updateDefaultSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateDefaultSettingsSchema.safeParse({
    signupAccessMode: formData.get('signupAccessMode') || 'ALLOW',
    signupKey: formData.get('signupKey') || '',
    emailAuthTtlHours: formData.get('emailAuthTtlHours') || 24,
    showProfilePhotoInList: formData.get('showProfilePhotoInList') === 'on',
    nicknameChangeAllowed: formData.get('nicknameChangeAllowed') === 'on',
    nicknameSaveChangeLog: formData.get('nicknameSaveChangeLog') === 'on',
    nicknameAllowSpecialChars: formData.get('nicknameAllowSpecialChars') === 'on',
    nicknameAllowedSpecialChars: formData.get('nicknameAllowedSpecialChars') || '',
    nicknameAllowSpacing: formData.get('nicknameAllowSpacing') === 'on',
    allowDuplicateNickname: formData.get('allowDuplicateNickname') === 'on',
    passwordPolicyLevel: formData.get('passwordPolicyLevel') || 'NORMAL',
    argon2TimeCost: formData.get('argon2TimeCost') || 3,
    autoRehashEnabled: formData.get('autoRehashEnabled') === 'on',
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.settings.updateDefault(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '기본 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/settings')
  return {}
}

// ---------------------------------------------------------------------------
// Login Settings Actions
// ---------------------------------------------------------------------------

const UpdateLoginSettingsSchema = z.object({
  allowAutoLogin: z.boolean().default(true),
  autoLoginDuration: z.coerce.number().int().positive().default(30),
  maxFailedAttempts: z.coerce.number().int().positive().default(5),
  redirectAfterLogin: z.enum(['homepage', 'last_page', 'dashboard']),
})

export async function updateLoginSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateLoginSettingsSchema.safeParse({
    allowAutoLogin: formData.get('allowAutoLogin') === 'on',
    autoLoginDuration: formData.get('autoLoginDuration') || 30,
    maxFailedAttempts: formData.get('maxFailedAttempts') || 5,
    redirectAfterLogin: formData.get('redirectAfterLogin') || 'last_page',
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.settings.updateLogin(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '로그인 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/settings')
  return {}
}

// ---------------------------------------------------------------------------
// Agreement Settings Actions
// ---------------------------------------------------------------------------

const UpdateAgreementSettingsSchema = z.object({
  terms: z.string().optional(),
  privacy: z.string().optional(),
  termsRequired: z.boolean().default(true),
  privacyRequired: z.boolean().default(true),
  termsVersion: z.string().nullable(),
  privacyVersion: z.string().nullable(),
})

export async function updateAgreementSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateAgreementSettingsSchema.safeParse({
    terms: formData.get('terms') || undefined,
    privacy: formData.get('privacy') || undefined,
    termsRequired: formData.get('termsRequired') === 'on',
    privacyRequired: formData.get('privacyRequired') === 'on',
    termsVersion: null, // 클라이언트에서 전송하지 않음 (서버에서 자동 계산)
    privacyVersion: null, // 클라이언트에서 전송하지 않음 (서버에서 자동 계산)
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.settings.updateAgreement(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '약관 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/settings')
  return {}
}

// ---------------------------------------------------------------------------
// Design Settings Actions
// ---------------------------------------------------------------------------

const UpdateDesignSettingsSchema = z.object({
  memberSkinId: z.string().optional(),
  memberTemplateId: z.string().optional(),
})

export async function updateDesignSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateDesignSettingsSchema.safeParse({
    memberSkinId: formData.get('memberSkinId') || undefined,
    memberTemplateId: formData.get('memberTemplateId') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.settings.updateDesign(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '디자인 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/settings')
  return {}
}

// ---------------------------------------------------------------------------
// Feature Settings Actions (REQ-ADMIN2-052)
// ---------------------------------------------------------------------------

const UpdateFeatureSettingsSchema = z.object({
  allowProfileImage: z.boolean().default(true),
  allowSignature: z.boolean().default(true),
  exposeInMemberSearch: z.boolean().default(true),
})

export async function updateFeatureSettingsAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateFeatureSettingsSchema.safeParse({
    allowProfileImage: formData.get('allowProfileImage') === 'on',
    allowSignature: formData.get('allowSignature') === 'on',
    exposeInMemberSearch: formData.get('exposeInMemberSearch') === 'on',
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.settings.updateFeature(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '기능 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/settings')
  return {}
}
