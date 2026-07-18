'use server'
/**
 * Admin 아이디/닉네임 차단 관리 Server Actions — SPEC-MEMBER-ADMIN-001 Slice B.
 *
 * `admin.user.deniedList.add`/`remove` 를 그대로 사용한다 (신규 백엔드 프로시저 없음).
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-005, REQ-MADM-006, REQ-MADM-007, REQ-MADM-008
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

const AddDeniedSchema = z.object({
  type: z.enum(['USER_ID', 'NICK_NAME']),
  pattern: z.string().min(1, '패턴을 입력하세요.'),
})

export async function addDeniedAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = AddDeniedSchema.safeParse({
    type: formData.get('type'),
    pattern: formData.get('pattern'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.user.deniedList.add(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '차단 등록 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/denied-list')
  return {}
}

export async function removeDeniedAction(
  id: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.user.deniedList.remove({ id })
    revalidatePath('/admin/members/denied-list')
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '차단 항목 삭제 중 오류가 발생했습니다.' }
  }
}

/**
 * `<form action={...}>` 바인딩 전용 void 래퍼.
 *
 * `removeDeniedAction`의 반환값({ ok } | { error })은 plain form action 타입
 * `(formData: FormData) => void | Promise<void>` 과 맞지 않아 별도 래퍼로 분리한다.
 */
export async function removeDeniedFormAction(id: number): Promise<void> {
  await removeDeniedAction(id)
}
