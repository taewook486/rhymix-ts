'use client'
/**
 * 모듈 인스턴스 삭제 버튼 + confirm 다이얼로그 — SPEC-ADMIN-001 Slice C.
 *
 * 인덱스 모듈 삭제 시도 시 IndexModuleProtectedError → toast.error 표시.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-006
 */
import { useState, useTransition } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { deleteModuleAction } from '@/app/admin/modules/actions'

interface DeleteModuleButtonProps {
  instanceId: number
  mid: string
}

export function DeleteModuleButton({ instanceId, mid }: DeleteModuleButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteModuleAction(instanceId)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('삭제되었습니다.')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          삭제
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>모듈 인스턴스 삭제</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600">
          <strong>{mid}</strong> 를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? '삭제 중…' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
