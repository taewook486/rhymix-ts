'use server'
/**
 * 신고 댓글 Server Actions — SPEC-ADMIN-002 REQ-ADMIN2-077.
 *
 * 신고 해제(dismiss), 신고된 댓글 삭제 기능.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-077
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
    revalidatePath('/admin/comments/declared')
    return { ok: true }
  } catch (err) {
    return { error: '신고 해제 중 오류가 발생했습니다.' }
  }
}

/**
 * 신고된 댓글 삭제.
 * admin.comment.bulkDelete 호출.
 */
export async function deleteReportedCommentAction(
  commentId: number,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller()
    // 일괄 삭제 API 호출 (단일 댓글 삭제)
    await caller.admin.comment.bulkDelete({
      commentIds: [commentId],
    })
    revalidatePath('/admin/comments/declared')
    return { ok: true }
  } catch (err) {
    return { error: '댓글 삭제 중 오류가 발생했습니다.' }
  }
}
