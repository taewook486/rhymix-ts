'use client'
/**
 * AddToFavoritesButton 컴포넌트 — SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * 현재 페이지를 즐겨찾기에 추가하는 버튼.
 * document.title과 window.location.pathname을 사용하여 즐겨찾기를 추가합니다.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-FAV-001~002
 */
import { useState } from 'react'
import { trpc } from '@/providers/TRPCProvider'
import { Button } from '@rhymix-ts/ui/components'
import { Star, StarOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function AddToFavoritesButton() {
  const [isAdded, setIsAdded] = useState(false)

  // 현재 페이지 정보
  const label = typeof document !== 'undefined' ? document.title : '페이지'
  const href = typeof window !== 'undefined' ? window.location.pathname : ''

  // add mutation
  const addMutation = trpc.admin.favorite.add.useMutation({
    onSuccess: () => {
      setIsAdded(true)
      toast.success('즐겨찾기 추가 완료')
    },
    onError: (error) => {
      toast.error('즐겨찾기 추가 실패', { description: error.message })
    },
  })

  // /admin으로 시작하지 않는 경로는 비활성화
  if (!href.startsWith('/admin') || href === '/admin') {
    return null
  }

  const handleClick = () => {
    if (isAdded) {
      toast.info('이미 추가된 즐겨찾기입니다')
      return
    }

    addMutation.mutate({
      label,
      href,
      // icon은 선택사항 (현재는 미지정)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={addMutation.isPending || isAdded}
      className="gap-2"
    >
      {addMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAdded ? (
        <StarOff className="h-4 w-4" />
      ) : (
        <Star className="h-4 w-4" />
      )}
      {isAdded ? '추가됨' : '즐겨찾기 추가'}
    </Button>
  )
}
