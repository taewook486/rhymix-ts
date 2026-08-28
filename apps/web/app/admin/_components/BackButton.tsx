'use client'
/**
 * 관리자 화면 공통 "취소" 버튼 — 이전 화면으로 돌아간다.
 *
 * 이벤트 핸들러는 클라이언트 컴포넌트에만 붙일 수 있다. 서버 컴포넌트에서
 * onClick 을 넘기면 React 가 "Event handlers cannot be passed to Client
 * Component props" 로 렌더를 중단해 페이지 전체가 500 이 된다.
 */
import { useRouter } from 'next/navigation'

interface BackButtonProps {
  children?: React.ReactNode
  className?: string
}

const DEFAULT_CLASS =
  'px-4 py-2 text-sm rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-300'

export function BackButton({ children = '취소', className }: BackButtonProps) {
  const router = useRouter()

  return (
    <button type="button" className={className ?? DEFAULT_CLASS} onClick={() => router.back()}>
      {children}
    </button>
  )
}
