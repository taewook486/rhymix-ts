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
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/admin-middleware'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// 인가 게이트 — SPEC-LEGACY-PARITY-001 감사 결함 D1 (다층 방어)
// ---------------------------------------------------------------------------

/**
 * 액션 진입 시점의 관리자 인가 검사. 거부 시 각 액션의 오류 형태와 호환되는
 * `{ error }` 를, 통과 시 null 을 반환한다.
 *
 * proxy.ts 의 `/admin/*` 경로 게이트와 말단 tRPC `protectedAdminProcedure` 만으로는
 * 부족하다 — Server Action 은 전역 주소 지정이 가능해 비보호 경로로 POST 하면
 * proxy 를 통과한 채 액션 본문이 비인증 상태로 진입한다. 특히
 * `updateMenuItemAction` 은 말단 게이트 이전에 storage.write(디스크 쓰기)를 수행하므로
 * 진입 시점 차단이 없으면 비인증 쓰기가 성립한다.
 *
 * @MX:ANCHOR: [AUTO] 메뉴 Server Action 6종의 공통 인가 진입점.
 * @MX:REASON: 6개 액션이 모두 호출하며(fan_in=6), 이 검사가 빠지면 부작용(디스크
 *             쓰기·DB 변경)이 인가 이전에 실행된다. layout/proxy + 액션 + tRPC 의
 *             3중 게이트 중 액션 계층을 담당한다.
 * @MX:SPEC: SPEC-LEGACY-PARITY-001 감사 결함 D1
 */
async function denyIfNotAdmin(): Promise<{ error: string } | null> {
  const session = await auth()
  if (!isAdminSession(session)) {
    return { error: '관리자 권한이 필요합니다.' }
  }
  return null
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
  const denied = await denyIfNotAdmin()
  if (denied) return denied

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
  const denied = await denyIfNotAdmin()
  if (denied) return denied

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
 * 이번 요청이 업로드한 저장 키를 실패 경로에서 회수한다 — 감사 결함 D2.
 * 업로드 이후 실패(뒤 필드 거부·zod·tRPC 예외)가 키를 방치하면 고아 파일이
 * 저장소에 영구 남는다. scanner 판정 경로(uploadButtonImage)와 동일한
 * fire-and-forget 삭제 관용구를 따른다.
 * @MX:SPEC: SPEC-LEGACY-PARITY-001 감사 결함 D2
 */
async function reclaimUploadedKeys(keys: readonly string[]): Promise<void> {
  const storage = getStorage()
  for (const key of keys) {
    await storage.delete(key).catch(() => {})
  }
}

/**
 * FormData의 버튼 이미지 3종(normal/hover/active)을 해석한다 (AC-SITE-002/003).
 *  - 파일 업로드 → 이미지 참조형 {"image": <storageKey>}
 *  - 제거 체크박스 → null (해당 상태만 제거)
 *  - 둘 다 없음   → undefined (변경 없음)
 *
 * writtenKeys 는 이번 요청에서 실제로 저장소에 기록한 키 전체다. 실패
 * 반환 시에도 실패 직전까지 기록한 키를 담아 호출자(D2 회수)에 넘긴다.
 */
async function parseButtonImageFields(formData: FormData): Promise<
  | {
      error: string
      fields?: undefined
      writtenKeys: string[]
    }
  | {
      error?: undefined
      fields: ButtonImageFields
      writtenKeys: string[]
    }
> {
  const states = [
    { field: 'normalBtn', file: 'normalBtnFile', remove: 'removeNormalBtn', label: '일반' },
    { field: 'hoverBtn', file: 'hoverBtnFile', remove: 'removeHoverBtn', label: '호버' },
    { field: 'activeBtn', file: 'activeBtnFile', remove: 'removeActiveBtn', label: '활성' },
  ] as const

  const fields: ButtonImageFields = {}
  const writtenKeys: string[] = []

  for (const state of states) {
    const file = formData.get(state.file)
    if (file instanceof File && file.size > 0) {
      const result = await uploadButtonImage(file)
      if ('error' in result) {
        return { error: `버튼 이미지(${state.label}): ${result.error}`, writtenKeys }
      }
      fields[state.field] = result
      writtenKeys.push(result.image)
      continue
    }
    // 브라우저 체크박스 기본값 'on' + 명시적 '1' 모두 수용
    const remove = formData.get(state.remove)
    if (remove === 'on' || remove === '1') {
      fields[state.field] = null
    }
  }

  return { fields, writtenKeys }
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
  const denied = await denyIfNotAdmin()
  if (denied) return denied

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
  const denied = await denyIfNotAdmin()
  if (denied) return denied

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
    // 업로드 이후 실패 — 이번 요청이 기록한 키를 회수한다 (감사 결함 D2)
    await reclaimUploadedKeys(buttons.writtenKeys)
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
    // 업로드 이후 실패 — 이번 요청이 기록한 키를 회수한다 (감사 결함 D2)
    await reclaimUploadedKeys(buttons.writtenKeys)
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
    // 업로드 이후 실패 — 이번 요청이 기록한 키를 회수한다 (감사 결함 D2)
    await reclaimUploadedKeys(buttons.writtenKeys)
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
  const denied = await denyIfNotAdmin()
  if (denied) return denied

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
  const denied = await denyIfNotAdmin()
  if (denied) return denied

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
