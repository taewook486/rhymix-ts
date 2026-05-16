'use server'
/**
 * Admin 메뉴 + MenuItem Server Actions — SPEC-ADMIN-001 Slice D.
 *
 * Slice C 의 actions.ts 패턴 (getServerCaller + zod safeParse) 동일.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030, REQ-ADMIN-031, REQ-ADMIN-032
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// Menu Actions
// ---------------------------------------------------------------------------

const CreateMenuSchema = z.object({
  title: z.string().min(1, '메뉴 이름을 입력하세요').max(80),
  isAdminMenu: z.boolean().default(false),
})

export async function createMenuAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateMenuSchema.safeParse({
    title: formData.get('title'),
    isAdminMenu: formData.get('isAdminMenu') === 'on',
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const siteId = Number(formData.get('siteId')) || (await getCurrentSiteId())

  try {
    const caller = await getServerCaller()
    await caller.admin.menu.create({ siteId, ...parsed.data })
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '메뉴 생성 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/menu')
  redirect('/admin/menu')
}

export async function deleteMenuAction(
  id: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.menu.delete({ id })
    revalidatePath('/admin/menu')
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '메뉴 삭제 중 오류가 발생했습니다.' }
  }
}

// ---------------------------------------------------------------------------
// MenuItem Actions
// ---------------------------------------------------------------------------

const CreateMenuItemSchema = z.object({
  title: z.string().min(1, '메뉴 항목 이름을 입력하세요').max(200),
  url: z.string().optional(),
  icon: z.string().optional(),
  listOrder: z.coerce.number().int().default(0),
})

export async function createMenuItemAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateMenuItemSchema.safeParse({
    title: formData.get('title'),
    url: formData.get('url') || undefined,
    icon: formData.get('icon') || undefined,
    listOrder: formData.get('listOrder') || 0,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const menuId = Number(formData.get('menuId'))
  const parentId = formData.get('parentId') ? Number(formData.get('parentId')) : null

  if (!menuId) return { error: 'menuId 가 필요합니다.' }

  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.create({ menuId, parentId, ...parsed.data })
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: 'MenuItem 생성 중 오류가 발생했습니다.' }
  }
  revalidatePath(`/admin/menu/${menuId}`)
  return {}
}

const UpdateMenuItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().optional(),
  listOrder: z.coerce.number().int().optional(),
})

export async function updateMenuItemAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get('id'))
  const menuId = Number(formData.get('menuId'))
  if (!id) return { error: 'id 가 필요합니다.' }

  const parsed = UpdateMenuItemSchema.safeParse({
    title: formData.get('title') || undefined,
    url: formData.get('url') || undefined,
    listOrder: formData.get('listOrder') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.update({ id, ...parsed.data })
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: 'MenuItem 수정 중 오류가 발생했습니다.' }
  }
  if (menuId) revalidatePath(`/admin/menu/${menuId}`)
  return {}
}

export async function deleteMenuItemAction(
  id: number,
  menuId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.delete({ id })
    revalidatePath(`/admin/menu/${menuId}`)
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: 'MenuItem 삭제 중 오류가 발생했습니다.' }
  }
}
