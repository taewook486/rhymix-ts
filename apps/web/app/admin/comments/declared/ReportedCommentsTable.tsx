'use client'
/**
 * 신고 댓글 테이블 컴포넌트 — SPEC-ADMIN-002 REQ-ADMIN2-077.
 *
 * 신고된 댓글 목록을 표시하고 해제/삭제 액션 제공.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-077
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rhymix-ts/ui/components'
import { Button } from '@rhymix-ts/ui/components'
import { dismissReportAction, deleteReportedCommentAction } from './actions'

interface Report {
  id: number
  documentId: number | null
  commentId: number | null
  reporterId: string
  reason: string
  regdate: Date
}

interface ReportedCommentsTableProps {
  reports: Report[]
}

export function ReportedCommentsTable({ reports }: ReportedCommentsTableProps) {
  const router = useRouter()

  // 댓글별로 신고 그룹화
  const groupedByComment = reports.reduce((acc, report) => {
    if (!report.commentId) return acc
    const entry = acc[report.commentId] ?? {
      commentId: report.commentId,
      documentId: report.documentId,
      reports: [],
    }
    entry.reports.push(report)
    acc[report.commentId] = entry
    return acc
  }, {} as Record<number, { commentId: number; documentId: number | null; reports: Report[] }>)

  if (Object.keys(groupedByComment).length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        신고된 댓글이 없습니다
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>댓글 ID</TableHead>
          <TableHead>신고 수</TableHead>
          <TableHead>마지막 신고자</TableHead>
          <TableHead>신고 사유</TableHead>
          <TableHead>신고일</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(groupedByComment).map(([commentId, { documentId, reports }]) => {
          const latestReport = reports[reports.length - 1]
          if (!latestReport) return null
          return (
            <TableRow key={commentId}>
              <TableCell className="font-medium">
                <span className="text-zinc-600">#{commentId}</span>
                {documentId && (
                  <span className="text-zinc-400 ml-2">
                    (
                    <Link
                      href={`/board/${documentId}`}
                      className="hover:underline text-blue-600"
                      target="_blank"
                    >
                      문서 #{documentId}
                    </Link>
                    )
                  </span>
                )}
              </TableCell>
              <TableCell>{reports.length}건</TableCell>
              <TableCell>{latestReport.reporterId}</TableCell>
              <TableCell className="max-w-md truncate">{latestReport.reason}</TableCell>
              <TableCell>
                {new Date(latestReport.regdate).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // 모든 신고 해제
                    await Promise.all(reports.map((r) => dismissReportAction(r.id)))
                    router.refresh()
                  }}
                >
                  해제
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await deleteReportedCommentAction(Number(commentId))
                    router.refresh()
                  }}
                >
                  삭제
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
