'use client'
/**
 * 위젯 프리셋 액션 버튼 Client Component — SPEC-ADMIN-EXTRAS-001 REQ-WIDGET-PRESET-003~004.
 *
 * "적용" → /admin/widgets/generator?preset={id} navigate.
 * "삭제" → admin.widget.deletePreset mutation → router.refresh().
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-WIDGET-PRESET-003, REQ-WIDGET-PRESET-004
 */
import { useRouter } from 'next/navigation'
import { trpc } from '@/providers/TRPCProvider'
import { toast } from 'sonner'

interface WidgetPresetActionsProps {
  presetId: number
}

export function WidgetPresetActions({ presetId }: WidgetPresetActionsProps) {
  const router = useRouter()

  const deleteMutation = trpc.admin.widget.deletePreset.useMutation({
    onSuccess: () => {
      toast.success('프리셋이 삭제되었습니다.')
      router.refresh()
    },
    onError: (error) => {
      toast.error('프리셋 삭제 실패', { description: error.message })
    },
  })

  const handleApply = () => {
    router.push(`/admin/widgets/generator?preset=${presetId}`)
  }

  const handleDelete = () => {
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return
    deleteMutation.mutate({ id: presetId })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleApply}
        className="text-blue-600 hover:underline text-xs mr-3"
      >
        적용
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        className="text-red-600 hover:underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleteMutation.isPending ? '삭제 중...' : '삭제'}
      </button>
    </>
  )
}
