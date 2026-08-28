'use server'
/**
 * 관리자 태그 Server Actions — SPEC-TAG-001 REQ-TAG-006.
 *
 * 이름 변경 / 병합 / 삭제. 도메인 구현은 @rhymix-ts/tag 에 이미 있었고
 * 관리자 화면만 `alert('구현 예정')` 스텁으로 남아 있었다.
 *
 * Server Action 은 페이지와 별개로 호출 가능한 진입점이므로 페이지의 관리자
 * 게이트와 무관하게 여기서 다시 권한을 확인한다.
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-006
 */
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import {
  renameTag,
  mergeTags,
  deleteTag,
  TagNotFoundError,
  TagAlreadyExistsError,
} from '@rhymix-ts/tag'

export interface TagActionState {
  error?: string
  success?: string
}

const ADMIN_ONLY: TagActionState = { error: '관리자만 수행할 수 있습니다.' }

async function isAdmin(): Promise<boolean> {
  const session = await auth()
  return Boolean((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin)
}

function toId(raw: FormDataEntryValue | null): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function describe(err: unknown, fallback: string): string {
  if (err instanceof TagAlreadyExistsError || err instanceof TagNotFoundError) {
    return err.message
  }
  return fallback
}

export async function renameTagAction(
  _prev: TagActionState | null,
  formData: FormData,
): Promise<TagActionState> {
  if (!(await isAdmin())) return ADMIN_ONLY

  const tagId = toId(formData.get('tagId'))
  const newName = String(formData.get('newName') ?? '').trim()

  if (tagId === null) return { error: '잘못된 태그 ID 입니다.' }
  if (newName.length === 0) return { error: '새 태그 이름을 입력하세요.' }
  if (newName.length > 50) return { error: '태그 이름은 50자를 넘을 수 없습니다.' }

  try {
    await renameTag({ tagId, newName }, { prisma })
  } catch (err) {
    return { error: describe(err, '태그 이름 변경 중 오류가 발생했습니다.') }
  }

  revalidatePath('/admin/tags')
  return { success: `"${newName}" 으로 변경했습니다.` }
}

export async function mergeTagsAction(
  _prev: TagActionState | null,
  formData: FormData,
): Promise<TagActionState> {
  if (!(await isAdmin())) return ADMIN_ONLY

  const sourceTagId = toId(formData.get('sourceTagId'))
  const targetTagId = toId(formData.get('targetTagId'))

  if (sourceTagId === null) return { error: '잘못된 태그 ID 입니다.' }
  if (targetTagId === null) return { error: '병합할 대상 태그를 선택하세요.' }
  if (sourceTagId === targetTagId) return { error: '같은 태그끼리는 병합할 수 없습니다.' }

  try {
    await mergeTags({ sourceTagId, targetTagId }, { prisma })
  } catch (err) {
    return { error: describe(err, '태그 병합 중 오류가 발생했습니다.') }
  }

  revalidatePath('/admin/tags')
  return { success: '병합했습니다.' }
}

export async function deleteTagAction(
  _prev: TagActionState | null,
  formData: FormData,
): Promise<TagActionState> {
  if (!(await isAdmin())) return ADMIN_ONLY

  const tagId = toId(formData.get('tagId'))
  if (tagId === null) return { error: '잘못된 태그 ID 입니다.' }

  try {
    await deleteTag({ tagId }, { prisma })
  } catch (err) {
    return { error: describe(err, '태그 삭제 중 오류가 발생했습니다.') }
  }

  revalidatePath('/admin/tags')
  return { success: '삭제했습니다.' }
}
