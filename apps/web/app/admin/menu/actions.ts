'use server'
/**
 * Admin 메뉴 + MenuItem Server Actions — SPEC-ADMIN-001 Slice D.
 *
 * Slice C 의 actions.ts 패턴 (getServerCaller + zod safeParse) 동일.
 * 버튼 이미지 업로드/제거 — SPEC-LEGACY-PARITY-001 M3 (AC-SITE-002/003).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030, REQ-ADMIN-031, REQ-ADMIN-032
 */
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import {
  getStorage,
  getScanner,
  assertMimeAllowed,
  assertSizeAllowed,
  isImageMimeType,
} from '@rhymix-ts/file'
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
// 버튼 이미지 업로드 — SPEC-LEGACY-PARITY-001 M3 (AC-SITE-002, design.md D2)
// ---------------------------------------------------------------------------

/**
 * 버튼 이미지 파일 1개를 검증·저장하고 이미지 참조형 값을 반환한다.
 * /api/files/upload 라우트와 동일한 packages/file 파이프라인을 액션 안에서
 * 재사용한다 (신규 엔드포인트 금지 — design.md D2).
 * 반환: 성공 시 {"image": <storageKey>}, 실패 시 {error}.
 */
async function uploadButtonImage(
  file: File,
): Promise<{ image: string } | { error: string }> {
  const mimeType = file.type || 'application/octet-stream'

  try {
    assertMimeAllowed(mimeType)
    assertSizeAllowed(mimeType, file.size)
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : '허용되지 않는 파일입니다.',
    }
  }

  // 버튼 이미지는 이미지 파일만 허용 (HTML·스크립트 등 거부)
  if (!isImageMimeType(mimeType)) {
    return { error: '버튼 이미지는 이미지 파일만 업로드할 수 있습니다.' }
  }

  const storage = getStorage()
  if (!storage.write) {
    return { error: '현재 스토리지 백엔드에서는 업로드할 수 없습니다.' }
  }

  // 저장 키 규약은 업로드 라우트와 동일: YYYY/MM/<uuid>
  const date = new Date()
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
  const storageKey = `${dateStr}/${randomUUID()}`

  const buffer = Buffer.from(await file.arrayBuffer())
  await storage.write({ key: storageKey, body: buffer, contentType: mimeType })

  // 악성코드 검사 — 판정 시 저장소에서 제거하고 실패 처리
  const scanResult = await getScanner().scan({
    storageKey,
    storage,
    knownContentType: mimeType,
    knownSize: file.size,
  })
  if (!scanResult.clean) {
    await storage.delete(storageKey).catch(() => {})
    return { error: '악성코드로 판단된 파일은 업로드할 수 없습니다.' }
  }

  return { image: storageKey }
}

/**
 * 버튼 이미지 필드 3종의 patch 값 (design.md D1 닫힌 집합).
 * `unknown` 으로 두면 tRPC 입력 스키마와의 형태 불일치를 컴파일러가 못 잡는다.
 */
type ButtonImageValue = { image: string; alt?: string } | null

interface ButtonImageFields {
  normalBtn?: ButtonImageValue
  hoverBtn?: ButtonImageValue
  activeBtn?: ButtonImageValue
}

/**
 * FormData의 버튼 이미지 3종(normal/hover/active)을 해석한다 (AC-SITE-002/003).
 *  - 파일 업로드 → 이미지 참조형 {"image": <storageKey>}
 *  - 제거 체크박스 → null (해당 상태만 제거)
 *  - 둘 다 없음   → undefined (변경 없음)
 */
async function parseButtonImageFields(formData: FormData): Promise<
  | {
      error: string
      fields?: undefined
    }
  | {
      error?: undefined
      fields: ButtonImageFields
    }
> {
  const states = [
    { field: 'normalBtn', file: 'normalBtnFile', remove: 'removeNormalBtn', label: '일반' },
    { field: 'hoverBtn', file: 'hoverBtnFile', remove: 'removeHoverBtn', label: '호버' },
    { field: 'activeBtn', file: 'activeBtnFile', remove: 'removeActiveBtn', label: '활성' },
  ] as const

  const fields: ButtonImageFields = {}

  for (const state of states) {
    const file = formData.get(state.file)
    if (file instanceof File && file.size > 0) {
      const result = await uploadButtonImage(file)
      if ('error' in result) {
        return { error: `버튼 이미지(${state.label}): ${result.error}` }
      }
      fields[state.field] = result
      continue
    }
    // 브라우저 체크박스 기본값 'on' + 명시적 '1' 모두 수용
    const remove = formData.get(state.remove)
    if (remove === 'on' || remove === '1') {
      fields[state.field] = null
    }
  }

  return { fields }
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

  // 버튼 이미지 3종 해석 (AC-SITE-002/003): 파일 업로드 → 참조형, 제거 플래그 → null
  const buttons = await parseButtonImageFields(formData)
  if (buttons.error) {
    return { error: buttons.error }
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
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.update({
      id,
      ...parsed.data,
      ...buttons.fields,
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

/**
 * MenuItem 복제 — admin.menuItem.duplicate tRPC 프로시저에 위임한다
 * (SPEC-LEGACY-PARITY-001 M4, AC-SITE-001).
 *
 * @MX:NOTE: [AUTO] 서브트리 재귀 복사·listOrder 무충돌 계약은 라우터의 단일
 *           $transaction 이 담당하며, 액션은 위임 + revalidate 만 한다
 *           (Prisma 직접 호출 금지 — 위임 구조 요건).
 * @MX:SPEC: SPEC-LEGACY-PARITY-001 AC-SITE-001
 */
export async function duplicateMenuItemAction(
  id: number,
  menuId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.menuItem.duplicate({ id })
    revalidatePath(`/admin/menu/${menuId}`)
    return { ok: true }
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: 'MenuItem 복제 중 오류가 발생했습니다.' }
  }
}
