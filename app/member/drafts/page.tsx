import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DraftsList } from './DraftsList'

// =====================================================
// Page Component
// =====================================================

export default async function DraftsPage() {
  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin?redirect=/member/drafts')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">드래프트 관리</h1>
        <p className="text-muted-foreground">
          자동 저장된 게시글 초안을 관리할 수 있습니다. 드래프트는 7일간
          보관됩니다.
        </p>
      </div>

      <DraftsList userId={user.id} />
    </div>
  )
}
