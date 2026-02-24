import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageForm } from '@/components/messages/MessageForm'
import { getMessage } from '@/app/actions/message'

// =====================================================
// Page Component
// =====================================================

interface NewMessagePageProps {
  searchParams: Promise<{
    reply_to?: string
    to?: string
  }>
}

export default async function NewMessagePage({ searchParams }: NewMessagePageProps) {
  const supabase = await createClient()
  const { reply_to, to } = await searchParams

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin?redirect=/messages/new')
  }

  // 답장할 메시지가 있는 경우
  let replyMessage = null
  if (reply_to) {
    const result = await getMessage(reply_to)
    if (result.success && result.data) {
      replyMessage = result.data
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">메시지 작성</h1>
        <p className="text-muted-foreground">
          다른 사용자에게 개인 메시지를 보낼 수 있습니다.
        </p>
      </div>

      <MessageForm
        currentUserId={user.id}
        replyMessage={replyMessage}
        defaultReceiverId={to}
      />
    </div>
  )
}
