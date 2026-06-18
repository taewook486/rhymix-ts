/**
 * 신고 댓글 관리 페이지 — SPEC-ADMIN-002 REQ-ADMIN2-077.
 *
 * 신고된 댓글 목록 조회, 해제(dismiss), 삭제 기능 제공.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-077
 */
import { getServerCaller } from '@/lib/trpc/server'
import { ReportedCommentsTable } from './ReportedCommentsTable'

export const dynamic = 'force-dynamic'

export default async function ReportedCommentsPage() {
  const caller = await getServerCaller()
  // 미해결 신고만 조회
  const reports = await caller.admin.moderation.reports({
    resolved: false,
    targetType: 'comment',
    page: 1,
    limit: 50,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">신고 댓글 관리</h1>
        <p className="text-sm text-zinc-500 mt-1">
          총 {reports.total}건의 신고된 댓글이 있습니다
        </p>
      </div>
      <ReportedCommentsTable reports={reports.items} />
    </div>
  )
}
