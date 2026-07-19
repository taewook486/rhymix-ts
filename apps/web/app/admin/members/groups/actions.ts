'use server'
/**
 * Admin 회원 그룹 Server Actions — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-041~042).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-041, REQ-ADMIN2-042
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
// Group Actions
// ---------------------------------------------------------------------------

const CreateGroupSchema = z.object({
  title: z.string().min(1, '그룹명을 입력하세요').max(80),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().default(false),
  isAdmin: z.boolean().default(false),
  // REQ-MADM-009: 이미지 마크(썸네일 URL 또는 업로드 경로)
  imageMark: z.string().max(2000).optional(),
  listOrder: z.coerce.number().int().default(0),
})

export async function createGroupAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateGroupSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    isDefault: formData.get('isDefault') === 'on',
    isAdmin: formData.get('isAdmin') === 'on',
    imageMark: formData.get('imageMark') || undefined,
    listOrder: formData.get('listOrder') || 0,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.group.create(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '그룹 생성 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/groups')
  redirect('/admin/members/groups')
}

const UpdateGroupSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  // REQ-MADM-009: 이미지 마크(썸네일 URL 또는 업로드 경로)
  imageMark: z.string().max(2000).optional(),
  listOrder: z.coerce.number().int().optional(),
})

export async function updateGroupAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get('id'))
  if (!id) return { error: 'id 가 필요합니다.' }

  const parsed = UpdateGroupSchema.safeParse({
    id,
    title: formData.get('title') || undefined,
    description: formData.get('description') || undefined,
    isDefault: formData.get('isDefault') === 'on' ? true : formData.get('isDefault') === 'off' ? false : undefined,
    isAdmin: formData.get('isAdmin') === 'on' ? true : formData.get('isAdmin') === 'off' ? false : undefined,
    imageMark: formData.get('imageMark') || undefined,
    listOrder: formData.get('listOrder') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.group.update(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '그룹 수정 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/members/groups')
  revalidatePath(`/admin/members/groups/${id}/edit`)
  redirect('/admin/members/groups')
}

export async function deleteGroupAction(
  id: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.group.delete({ id })
    revalidatePath('/admin/members/groups')
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '그룹 삭제 중 오류가 발생했습니다.' }
  }
}
