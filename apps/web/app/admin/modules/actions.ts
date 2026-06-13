'use server'
/**
 * Admin 모듈 인스턴스 Server Actions — SPEC-ADMIN-001 Slice C.
 *
 * @MX:NOTE: [AUTO] Server Action → tRPC 브릿지 패턴.
 *           후속 슬라이스의 actions.ts 들이 동일 패턴(getServerCaller + zod safeParse)을 따라야 한다.
 * @MX:WARN: [AUTO] createModuleAction 의 zod CreateSchema 와 admin.module.create 의
 *           input zod 가 별도로 정의되어 두 스키마가 drift 할 위험이 있음.
 * @MX:REASON: Slice D 이후 packages/core/src/modules/schemas.ts 로 추출 검토 필요.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { runAdminAction } from '@rhymix-ts/core/addons'
import { prisma } from '@/lib/db/prisma'

const CreateSchema = z.object({
  moduleCode: z.string().min(1, '모듈 코드를 입력하세요'),
  mid: z.string().min(1, 'mid 를 입력하세요').max(80),
  name: z.string().min(1, '이름을 입력하세요'),
})

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createModuleAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateSchema.safeParse({
    moduleCode: formData.get('moduleCode'),
    mid: formData.get('mid'),
    name: formData.get('name'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // siteId 는 server-side 에서 결정 (클라이언트 스푸핑 방지)
  const siteId = Number(formData.get('siteId')) || (await getCurrentSiteId())

  try {
    const caller = await getServerCaller()
    await caller.admin.module.create({ siteId, ...parsed.data })

    // SPEC-ADDON-001 REQ-ADDON-064: 모듈 생성 후 admin action hook 실행
    await runAdminAction('module.create', { siteId, ...parsed.data }, {
      prisma,
      request: { mid: parsed.data.mid },
      domain: null
    })
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '모듈 생성 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/modules')
  redirect('/admin/modules')
}

export async function deleteModuleAction(
  instanceId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.module.delete({ instanceId })

    // SPEC-ADDON-001 REQ-ADDON-064: 모듈 삭제 후 admin action hook 실행
    await runAdminAction('module.delete', { instanceId }, {
      prisma,
      request: {},
      domain: null
    })

    revalidatePath('/admin/modules')
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}
