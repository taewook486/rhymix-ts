'use client'
/**
 * AdminLog 목록 테이블 — SPEC-ADMIN-001 Slice D.
 *
 * AdminLog.id 는 BigInt → String(log.id) 로 렌더.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rhymix-ts/ui/components'

interface AdminLogItem {
  id: bigint
  actorId: number
  action: string
  target: string
  ip: string | null
  createdAt: Date
}

interface AdminLogTableProps {
  items: AdminLogItem[]
  total: number
  page: number
  pageSize: number
}

export function AdminLogTable({ items, total, page, pageSize }: AdminLogTableProps) {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        총 {total.toLocaleString()}건 (페이지 {page}/{totalPages || 1})
      </p>

      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
          감사 로그가 없습니다
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead className="w-20">actorId</TableHead>
              <TableHead>action</TableHead>
              <TableHead>target</TableHead>
              <TableHead className="w-28">IP</TableHead>
              <TableHead className="w-40">시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((log) => (
              <TableRow key={String(log.id)}>
                {/* BigInt → String 변환 (Q5) */}
                <TableCell className="font-mono text-xs">{String(log.id)}</TableCell>
                <TableCell>{log.actorId}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="text-xs">{log.target || '—'}</TableCell>
                <TableCell className="text-xs">{log.ip ?? '—'}</TableCell>
                <TableCell className="text-xs">
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
