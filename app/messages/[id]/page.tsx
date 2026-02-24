import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMessage, deleteMessage } from '@/app/actions/message'
import { MessageDetail } from '@/components/messages/MessageDetail'
import { MessageDetailHeader } from '@/components/messages/MessageDetailHeader'

// =====================================================
// Page Component
// =====================================================

interface MessagePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MessagePage({ params }: MessagePageProps) {
  const supabase = await createClient()
  const { id: messageId } = await params

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/signin?redirect=/messages/${messageId}`)
  }

  // 메시지 조회
  const result = await getMessage(messageId)

  if (!result.success || !result.data) {
    notFound()
  }

  const message = result.data

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <MessageDetailHeader message={message} currentUserId={user.id} />
      <MessageDetail message={message} currentUserId={user.id} />
    </div>
  )
}
