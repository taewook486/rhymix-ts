'use server'
/**
 * 도메인 관리 Server Actions — 인덱스(홈) 모듈 지정.
 *
 * Server Action → tRPC 브릿지 패턴 (app/admin/modules/actions.ts 와 동일).
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'

const SetIndexModuleSchema = z.object({
  domainId: z.coerce.number().int().positive(),
  // 빈 문자열은 "인덱스 해제"를 뜻한다.
  moduleInstanceId: z
    .union([z.literal(''), z.coerce.number().int().positive()])
    .transform((v) => (v === '' ? null : v)),
})

export interface DomainActionState {
  error?: string
  success?: boolean
}

export async function setIndexModuleAction(
  _prev: DomainActionState | null,
  formData: FormData,
): Promise<DomainActionState> {
  const parsed = SetIndexModuleSchema.safeParse({
    domainId: formData.get('domainId'),
    moduleInstanceId: formData.get('moduleInstanceId'),
  })
  if (!parsed.success) {
    return { error: '입력값이 올바르지 않습니다.' }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.domain.setIndexModule(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '인덱스 모듈 지정 중 오류가 발생했습니다.' }
  }

  // 관리자 목록과 방문자 홈 양쪽을 무효화한다.
  revalidatePath('/admin/domains')
  revalidatePath('/')
  return { success: true }
}
