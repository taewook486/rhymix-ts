'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema, passwordResetSchema, passwordUpdateSchema } from '@/lib/validations/auth'
import type { AuthResponse, AuthErrorCode } from '@/types/auth'

function getErrorMessage(errorCode: AuthErrorCode): string {
  const errorMessages: Record<AuthErrorCode, string> = {
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
    EMAIL_NOT_CONFIRMED: '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.',
    USER_ALREADY_EXISTS: '이미 등록된 이메일입니다.',
    WEAK_PASSWORD: '비밀번호가 보안 요구사항을 충족하지 않습니다.',
    INVALID_EMAIL: '올바른 이메일 형식이 아닙니다.',
    NETWORK_ERROR: '네트워크 연결에 실패했습니다. 다시 시도해주세요.',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
    UNAUTHORIZED: '인증되지 않은 사용자입니다.',
    UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  }
  return errorMessages[errorCode]
}

function mapSupabaseError(error: { message: string; code?: string }): AuthErrorCode {
  const errorMessage = error.message.toLowerCase()
  const errorCode = error.code

  if (errorCode === 'invalid_credentials' || errorMessage.includes('invalid login credentials')) {
    return 'INVALID_CREDENTIALS'
  }
  if (errorCode === 'email_not_confirmed' || errorMessage.includes('email not confirmed')) {
    return 'EMAIL_NOT_CONFIRMED'
  }
  if (errorCode === 'user_already_exists' || errorMessage.includes('already registered')) {
    return 'USER_ALREADY_EXISTS'
  }
  if (errorCode === 'weak_password' || errorMessage.includes('password')) {
    return 'WEAK_PASSWORD'
  }
  if (errorMessage.includes('invalid email')) {
    return 'INVALID_EMAIL'
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'NETWORK_ERROR'
  }
  if (errorMessage.includes('session') || errorMessage.includes('jwt')) {
    return 'SESSION_EXPIRED'
  }

  return 'UNKNOWN_ERROR'
}

export async function signIn(formData: FormData): Promise<AuthResponse> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validationResult = signInSchema.safeParse(rawData)
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.errors[0]?.message || '입력 정보를 확인해주세요.',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validationResult.data.email,
    password: validationResult.data.password,
  })

  if (error) {
    const errorCode = mapSupabaseError(error)
    return {
      success: false,
      error: getErrorMessage(errorCode),
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(formData: FormData): Promise<AuthResponse> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    displayName: formData.get('displayName') as string | undefined,
  }

  const validationResult = signUpSchema.safeParse(rawData)
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.errors[0]?.message || '입력 정보를 확인해주세요.',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: validationResult.data.email,
    password: validationResult.data.password,
    options: {
      data: {
        display_name: validationResult.data.displayName || null,
      },
    },
  })

  if (error) {
    const errorCode = mapSupabaseError(error)
    return {
      success: false,
      error: getErrorMessage(errorCode),
    }
  }

  return {
    success: true,
    message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
  }
}

export async function signOut(): Promise<AuthResponse> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      success: false,
      error: getErrorMessage('UNKNOWN_ERROR'),
    }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function resetPassword(email: string): Promise<AuthResponse> {
  const validationResult = passwordResetSchema.safeParse({ email })

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.errors[0]?.message || '이메일을 확인해주세요.',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password/confirm`,
  })

  if (error) {
    const errorCode = mapSupabaseError(error)
    return {
      success: false,
      error: getErrorMessage(errorCode),
    }
  }

  return {
    success: true,
    message: '비밀번호 재설정 이메일이 발송되었습니다.',
  }
}

export async function updatePassword(password: string, confirmPassword: string): Promise<AuthResponse> {
  const validationResult = passwordUpdateSchema.safeParse({ password, confirmPassword })

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.errors[0]?.message || '비밀번호를 확인해주세요.',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: validationResult.data.password,
  })

  if (error) {
    const errorCode = mapSupabaseError(error)
    return {
      success: false,
      error: getErrorMessage(errorCode),
    }
  }

  revalidatePath('/', 'layout')

  return {
    success: true,
    message: '비밀번호가 성공적으로 변경되었습니다.',
  }
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    return null
  }

  return session
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.display_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  }
}
