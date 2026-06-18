'use client'
/**
 * 신고 문서 테이블 컴포넌트 — SPEC-ADMIN-002 REQ-ADMIN2-072.
 *
 * 신고된 문서 목록을 표시하고 해제/삭제 액션 제공.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-072
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
import { dismissReportAction, deleteReportedDocumentAction } from './actions'

interface Report {
  id: number
  documentId: number | null
  commentId: number | null
  reporterId: string
  reason: string
  regdate: Date
  document?: {
    id: number
    title: string
    boardId: number
  }
}

interface ReportedDocumentsTableProps {
  reports: Report[]
}

export function ReportedDocumentsTable({ reports }: ReportedDocumentsTableProps) {
  const router = useRouter()

  // 문서별로 신고 그룹화
  const groupedByDocument = reports.reduce((acc, report) => {
    if (!report.documentId) return acc
    const entry = acc[report.documentId] ?? { document: report.document, reports: [] }
    entry.reports.push(report)
    acc[report.documentId] = entry
    return acc
  }, {} as Record<number, { document: Report['document']; reports: Report[] }>)

  if (Object.keys(groupedByDocument).length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        신고된 문서가 없습니다
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>문서 제목</TableHead>
          <TableHead>신고 수</TableHead>
          <TableHead>마지막 신고자</TableHead>
          <TableHead>신고 사유</TableHead>
          <TableHead>신고일</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(groupedByDocument).map(([docId, { document, reports }]) => {
          const latestReport = reports[reports.length - 1]
          if (!latestReport) return null
          return (
            <TableRow key={docId}>
              <TableCell className="font-medium">
                {document ? (
                  <Link
                    href={`/board/${document.boardId}/${document.id}`}
                    className="hover:underline text-blue-600"
                    target="_blank"
                  >
                    {document.title}
                  </Link>
                ) : (
                  <span className="text-zinc-400">삭제된 문서</span>
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
                    if (!document) return
                    await deleteReportedDocumentAction(document.id)
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
