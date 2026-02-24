'use client'

import { Mail, User, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { MessageWithRelations, UUID } from '@/lib/supabase/database.types'

/**
 * Props for MessageDetail component
 */
export interface MessageDetailProps {
  /** Message with relations */
  message: MessageWithRelations
  /** Current user ID */
  currentUserId: UUID
}

/**
 * Message detail component
 *
 * Displays full message content with sender/receiver information.
 */
export function MessageDetail({ message, currentUserId }: MessageDetailProps) {
  const isReceiver = message.receiver_id === currentUserId
  const displayName = isReceiver ? message.sender?.display_name : message.receiver?.display_name
  const avatarUrl = isReceiver ? message.sender?.avatar_url : message.receiver?.avatar_url

  return (
    <div className="space-y-6">
      {/* Message Title */}
      <div>
        <h1 className="text-2xl font-bold mb-2">{message.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{new Date(message.created_at).toLocaleString('ko-KR')}</span>
          </div>
          {!message.is_read && isReceiver && (
            <Badge variant="secondary">읽지 않음</Badge>
          )}
          {message.is_read && isReceiver && (
            <Badge variant="outline">
              읽음{' '}
              {message.read_at
                ? new Date(message.read_at).toLocaleString('ko-KR')
                : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Sender/Receiver Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>
                {displayName?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{displayName || '알 수 없음'}</p>
              <p className="text-sm text-muted-foreground">
                {isReceiver ? '보낸 사람' : '받는 사람'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Thread (if reply) */}
      {message.parent && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>원본 메시지</span>
              </div>
              <div className="pl-6 border-l-2 border-muted">
                <p className="font-medium mb-1">{message.parent.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {message.parent.content}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MessageDetail
