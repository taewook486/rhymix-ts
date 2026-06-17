'use server'
/**
 * Admin 회원 직접 등록 Server Actions — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-044, REQ-ADMIN2-045).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-044, REQ-ADMIN2-045
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
// Member Registration Actions
// ---------------------------------------------------------------------------

const CreateUserSchema = z.object({
  userId: z.string().min(1).max(80).regex(/^[a-z][a-z0-9_-]*$/, '사용자 ID는 영문 소문자로 시작하고 영문 소문자, 숫자, 언더스코어, 하이픈만 사용 가능'),
  emailAddress: z.string().email('올바른 이메일 주소를 입력하세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다').max(100),
  nickName: z.string().min(1).max(40),
  groupId: z.coerce.number().int().positive().optional(),
})

export async function createUserAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateUserSchema.safeParse({
    userId: formData.get('userId'),
    emailAddress: formData.get('emailAddress'),
    password: formData.get('password'),
    nickName: formData.get('nickName'),
    groupId: formData.get('groupId') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.user.create(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '회원 등록 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members')
  redirect('/admin/members')
}
