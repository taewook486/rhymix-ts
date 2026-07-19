'use server'
/**
 * Admin 이메일 호스트 관리 Server Actions — SPEC-MEMBER-ADMIN-001 Slice E.
 *
 * `admin.user.emailHost.add`/`remove` 를 그대로 사용한다 (신규 백엔드 프로시저 없음).
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-029, REQ-MADM-030, REQ-MADM-031
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

const AddEmailHostSchema = z.object({
  host: z.string().min(1, '호스트를 입력하세요.'),
  policy: z.enum(['ALLOW', 'DENY']),
  reason: z.string().optional(),
})

export async function addEmailHostAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = AddEmailHostSchema.safeParse({
    host: formData.get('host'),
    policy: formData.get('policy'),
    reason: formData.get('reason') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.user.emailHost.add(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '이메일 호스트 등록 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/email-hosts')
  return {}
}

export async function removeEmailHostAction(
  id: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.user.emailHost.remove({ id })
    revalidatePath('/admin/members/email-hosts')
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '이메일 호스트 삭제 중 오류가 발생했습니다.' }
  }
}

/**
 * `<form action={...}>` 바인딩 전용 void 래퍼.
 *
 * `removeEmailHostAction`의 반환값({ ok } | { error })은 plain form action 타입
 * `(formData: FormData) => void | Promise<void>` 과 맞지 않아 별도 래퍼로 분리한다.
 */
export async function removeEmailHostFormAction(id: number): Promise<void> {
  await removeEmailHostAction(id)
}
