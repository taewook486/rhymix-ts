import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageList } from '@/components/messages/MessageList'

// =====================================================
// Page Component
// =====================================================

export default async function MessagesPage() {
  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin?redirect=/messages')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">메시지</h1>
        <p className="text-muted-foreground">
          개인 메시지를 주고받을 수 있습니다.
        </p>
      </div>

      <MessageList userId={user.id} />
    </div>
  )
}
