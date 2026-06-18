'use server'
/**
 * 신고 문서 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-072.
 *
 * 신고 해제(dismiss), 신고된 문서 삭제 기능.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-072
 */
import { revalidatePath } from 'next/cache'
import { getServerCaller } from '@/lib/trpc/server'

/**
 * 신고 해제 (dismiss).
 * 해당 신고를 resolved=true 로 처리.
 */
export async function dismissReportAction(
  reportId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    await caller.admin.moderation.resolveReport({ reportId })
    revalidatePath('/admin/documents/declared')
    return { ok: true }
  } catch (err) {
    return { error: '신고 해제 중 오류가 발생했습니다.' }
  }
}

/**
 * 신고된 문서 삭제.
 * admin.document.bulkUpdate 의 delete 액션 호출.
 */
export async function deleteReportedDocumentAction(
  documentId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    // 일괄 삭제 API 호출 (단일 문서 삭제)
    await caller.admin.document.bulkUpdate({
      documentIds: [documentId],
      action: 'delete',
    })
    revalidatePath('/admin/documents/declared')
    return { ok: true }
  } catch (err) {
    return { error: '문서 삭제 중 오류가 발생했습니다.' }
  }
}
