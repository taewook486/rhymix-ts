'use client'

import Link from 'next/link'
import { ArrowLeft, Reply, Trash2, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteMessage, blockUser } from '@/app/actions/message'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { MessageWithRelations, UUID } from '@/lib/supabase/database.types'

/**
 * Props for MessageDetailHeader component
 */
export interface MessageDetailHeaderProps {
  /** Message with relations */
  message: MessageWithRelations
  /** Current user ID */
  currentUserId: UUID
}

/**
 * Message detail header component
 *
 * Displays message header with navigation and actions.
 */
export function MessageDetailHeader({ message, currentUserId }: MessageDetailHeaderProps) {
  const router = useRouter()

  const handleDelete = async () => {
    const result = await deleteMessage(message.id)

    if (result.success) {
      toast({
        title: '메시지 삭제',
        description: '메시지를 삭제했습니다.',
      })
      router.push('/messages')
    } else {
      toast({
        title: '삭제 실패',
        description: result.error || '메시지 삭제에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleBlock = async () => {
    // Block the sender if current user is receiver, or vice versa
    const targetUserId =
      message.receiver_id === currentUserId ? message.sender_id : message.receiver_id

    const result = await blockUser(targetUserId)

    if (result.success) {
      toast({
        title: '사용자 차단',
        description: '사용자를 차단했습니다.',
      })
    } else {
      toast({
        title: '차단 실패',
        description: result.error || '사용자 차단에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  const isReceiver = message.receiver_id === currentUserId

  return (
    <div className="flex items-center justify-between mb-6">
      <Link href="/messages">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록으로
        </Button>
      </Link>

      <div className="flex items-center gap-2">
        {isReceiver && (
          <Link href={`/messages/new?reply_to=${message.id}`}>
            <Button variant="outline" size="sm">
              <Reply className="h-4 w-4 mr-1" />
              답장
            </Button>
          </Link>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserX className="h-4 w-4 mr-1" />
              차단
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>사용자 차단</AlertDialogTitle>
              <AlertDialogDescription>
                이 사용자를 차단하시겠습니까? 차단된 사용자에게서 더 이상 메시지를 받지
                않습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleBlock}>차단</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>메시지 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 메시지를 삭제하시겠습니까? 삭제된 메시지는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default MessageDetailHeader
