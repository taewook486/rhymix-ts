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
  cssClass: z.string().optional(),
  description: z.string().optional(),
  listOrder: z.coerce.number().int().default(0),
  openInNewWindow: z.boolean().default(false),
  expand: z.boolean().default(false),
  normalBtn: z.string().optional(),
  hoverBtn: z.string().optional(),
  activeBtn: z.string().optional(),
})

export async function createMenuItemAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateMenuItemSchema.safeParse({
    title: formData.get('title'),
    url: formData.get('url') || undefined,
    icon: formData.get('icon') || undefined,
    cssClass: formData.get('cssClass') || undefined,
    description: formData.get('description') || undefined,
    listOrder: formData.get('listOrder') || 0,
    openInNewWindow: formData.get('openInNewWindow') === 'on',
    expand: formData.get('expand') === 'on',
    normalBtn: formData.get('normalBtn') || undefined,
    hoverBtn: formData.get('hoverBtn') || undefined,
    activeBtn: formData.get('activeBtn') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const menuId = Number(formData.get('menuId'))
  const parentId = formData.get('parentId') ? Number(formData.get('parentId')) : null

  if (!menuId) return { error: 'menuId 가 필요합니다.' }

  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.create({
      menuId,
      parentId,
      ...parsed.data,
      groupIds: [], // Default empty for create, can be edited later
    })
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
  icon: z.string().optional(),
  cssClass: z.string().optional(),
  description: z.string().optional(),
  groupIds: z.string().optional(), // Comma-separated string for multi-select
  openInNewWindow: z.boolean().optional(),
  expand: z.boolean().optional(),
  listOrder: z.coerce.number().int().optional(),
  normalBtn: z.string().optional(), // JSON string
  hoverBtn: z.string().optional(),
  activeBtn: z.string().optional(),
})

export async function updateMenuItemAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get('id'))
  const menuId = Number(formData.get('menuId'))
  if (!id) return { error: 'id 가 필요합니다.' }

  // Parse groupIds from comma-separated string to array
  const groupIdsStr = formData.get('groupIds') as string | null
  let groupIds: number[] = []
  if (groupIdsStr && groupIdsStr.trim()) {
    const parsedIds = groupIdsStr.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
    if (parsedIds.length > 0) {
      // Validate that all groupIds exist (AC-A4: atomic rejection for invalid groups)
      try {
        const caller = await getServerCaller()
        const groups = await caller.admin.group.list()
        const validGroupIds = new Set(groups.map((g) => g.id))
        const invalidIds = parsedIds.filter((gid) => !validGroupIds.has(gid))
        if (invalidIds.length > 0) {
          return {
            fieldErrors: {
              groupIds: [`존재하지 않는 그룹 ID: ${invalidIds.join(', ')}`],
            },
          }
        }
        groupIds = parsedIds
      } catch (err) {
        return { error: '그룹 목록 조회 중 오류가 발생했습니다.' }
      }
    }
  }

  // Parse JSON fields for button states
  const normalBtnStr = formData.get('normalBtn') as string | null
  const hoverBtnStr = formData.get('hoverBtn') as string | null
  const activeBtnStr = formData.get('activeBtn') as string | null

  let normalBtn: unknown = undefined
  let hoverBtn: unknown = undefined
  let activeBtn: unknown = undefined

  try {
    if (normalBtnStr?.trim()) normalBtn = JSON.parse(normalBtnStr)
    if (hoverBtnStr?.trim()) hoverBtn = JSON.parse(hoverBtnStr)
    if (activeBtnStr?.trim()) activeBtn = JSON.parse(activeBtnStr)
  } catch (err) {
    return { error: '버튼 상태 JSON 형식이 올바르지 않습니다.' }
  }

  const parsed = UpdateMenuItemSchema.safeParse({
    title: formData.get('title') || undefined,
    url: formData.get('url') || undefined,
    icon: formData.get('icon') || undefined,
    cssClass: formData.get('cssClass') || undefined,
    description: formData.get('description') || undefined,
    listOrder: formData.get('listOrder') || undefined,
    openInNewWindow: formData.get('openInNewWindow') === 'on',
    expand: formData.get('expand') === 'on',
    normalBtn: normalBtnStr ? JSON.stringify(normalBtn) : undefined,
    hoverBtn: hoverBtnStr ? JSON.stringify(hoverBtn) : undefined,
    activeBtn: activeBtnStr ? JSON.stringify(activeBtn) : undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.update({
      id,
      ...parsed.data,
      groupIds,
    })
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
