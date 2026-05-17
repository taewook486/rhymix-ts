'use client'
/**
 * 모듈 인스턴스 목록 테이블 — SPEC-ADMIN-001 Slice C + Slice I.
 *
 * Slice C: 기본 목록 렌더링 + DeleteModuleButton
 * Slice I (REQ-ADMIN-090): 체크박스 + 일괄 삭제 액션바
 */
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@rhymix-ts/ui/components'

// 간단한 Checkbox 래퍼 — @rhymix-ts/ui 에 Checkbox 가 없는 동안 로컬 구현
function Checkbox({
  checked,
  onCheckedChange,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked'>) {
  return (
    <input
      type="checkbox"
      checked={checked ?? false}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
}
import { DeleteModuleButton } from './DeleteModuleButton'
import { bulkDeleteModulesAction } from '@/lib/admin/module-actions'

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  if (instances.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        등록된 모듈 인스턴스가 없습니다
      </div>
    )
  }

  const allSelected = selectedIds.size === instances.length && instances.length > 0
  const someSelected = selectedIds.size > 0

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(instances.map((i) => i.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  async function handleBulkDelete() {
    if (!window.confirm(`선택된 ${selectedIds.size}개의 모듈을 삭제하시겠습니까?`)) return
    await bulkDeleteModulesAction(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  return (
    <div>
      {someSelected && (
        <div
          data-testid="bulk-action-bar"
          className="mb-3 flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm"
        >
          <span>{selectedIds.size}개 선택됨</span>
          <Button
            data-testid="bulk-delete-btn"
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            선택 삭제
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                data-testid="header-checkbox"
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
            </TableHead>
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
              <TableCell>
                <Checkbox
                  data-testid={`row-checkbox-${inst.id}`}
                  checked={selectedIds.has(inst.id)}
                  onCheckedChange={(checked) => toggleRow(inst.id, checked)}
                />
              </TableCell>
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
    </div>
  )
}
