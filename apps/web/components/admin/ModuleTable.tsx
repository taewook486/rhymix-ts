'use client'
/**
 * 모듈 인스턴스 목록 테이블 — SPEC-ADMIN-001 Slice C.
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rhymix-ts/ui/components'
import { DeleteModuleButton } from './DeleteModuleButton'

interface ModuleInstance {
  id: number
  mid: string
  moduleCode: string
  name: string
  createdAt: Date
}

interface ModuleTableProps {
  instances: ModuleInstance[]
  siteId: number
}

export function ModuleTable({ instances }: ModuleTableProps) {
  if (instances.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        등록된 모듈 인스턴스가 없습니다
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>mid</TableHead>
          <TableHead>모듈 코드</TableHead>
          <TableHead>이름</TableHead>
          <TableHead>등록일</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {instances.map((inst) => (
          <TableRow key={inst.id}>
            <TableCell className="font-medium">{inst.mid}</TableCell>
            <TableCell>{inst.moduleCode}</TableCell>
            <TableCell>{inst.name}</TableCell>
            <TableCell>{new Date(inst.createdAt).toLocaleDateString('ko-KR')}</TableCell>
            <TableCell className="text-right">
              <DeleteModuleButton instanceId={inst.id} mid={inst.mid} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
