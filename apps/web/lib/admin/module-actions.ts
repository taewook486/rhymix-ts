'use server'
/**
 * 모듈 인스턴스 Server Actions — SPEC-ADMIN-001 Slice I (REQ-ADMIN-090).
 *
 * bulkDeleteModulesAction: 다수 모듈 인스턴스 일괄 삭제.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-090
 */
import { prisma } from '@rhymix-ts/db'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/admin-middleware'

/**
 * 모듈 인스턴스 일괄 삭제 (REQ-ADMIN-090).
 *
 * @param ids 삭제할 모듈 인스턴스 ID 배열
 * @returns { deleted: number, failed: number[] }
 */
export async function bulkDeleteModulesAction(
  ids: number[],
): Promise<{ deleted: number; failed: number[] }> {
  const session = await auth()
  if (!isAdminSession(session)) {
    throw new Error('관리자 권한이 필요합니다.')
  }

  if (ids.length === 0) {
    return { deleted: 0, failed: [] }
  }

  const failed: number[] = []
  let deleted = 0

  for (const id of ids) {
    try {
      await prisma.moduleInstance.delete({ where: { id } })
      deleted++
    } catch {
      failed.push(id)
    }
  }

  return { deleted, failed }
}
