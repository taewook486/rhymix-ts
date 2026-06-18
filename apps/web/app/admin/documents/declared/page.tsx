/**
 * 신고 문서 관리 페이지 — SPEC-ADMIN-002 REQ-ADMIN2-072.
 *
 * 신고된 문서 목록 조회, 해제(dismiss), 삭제 기능 제공.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-072
 */
import { getServerCaller } from '@/lib/trpc/server'
import { ReportedDocumentsTable } from './ReportedDocumentsTable'

export const dynamic = 'force-dynamic'

export default async function ReportedDocumentsPage() {
  const caller = await getServerCaller()
  // 미해결 신고만 조회
  const reports = await caller.admin.moderation.reports({
    resolved: false,
    targetType: 'document',
    page: 1,
    limit: 50,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">신고 문서 관리</h1>
        <p className="text-sm text-zinc-500 mt-1">
          총 {reports.total}건의 신고된 문서가 있습니다
        </p>
      </div>
      <ReportedDocumentsTable reports={reports.items} />
    </div>
  )
}
