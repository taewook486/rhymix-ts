'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sendMessage } from '@/app/actions/message'
import { toast } from '@/hooks/use-toast'
import type { MessageWithRelations, UUID } from '@/lib/supabase/database.types'

/**
 * Props for MessageForm component
 */
export interface MessageFormProps {
  /** Current user ID */
  currentUserId: UUID
  /** Reply-to message (if any) */
  replyMessage?: MessageWithRelations | null
  /** Default receiver ID */
  defaultReceiverId?: string
}

/**
 * Message form component
 *
 * Form for composing and sending messages.
 */
export function MessageForm({
  currentUserId,
  replyMessage,
  defaultReceiverId,
}: MessageFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(
    replyMessage
      ? `Re: ${replyMessage.title.replace(/^Re:\s*/, '')}`
      : ''
  )
  const [content, setContent] = useState(
    replyMessage
      ? `\n\n------- 원본 메시지 -------\n${replyMessage.content}\n`
      : ''
  )
  const [receiverId, setReceiverId] = useState(defaultReceiverId || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim() || !receiverId) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await sendMessage({
        sender_id: currentUserId,
        receiver_id: receiverId as UUID,
        title: title.trim(),
        content: content.trim(),
        parent_id: replyMessage?.id || null,
      })

      if (result.success) {
        toast({
          title: '메시지 전송',
          description: '메시지를 보냈습니다.',
        })
        router.push('/messages')
      } else {
        toast({
          title: '전송 실패',
          description: result.error || '메시지 전송에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '전송 실패',
        description: '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>메시지 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Receiver ID Input */}
          <div className="space-y-2">
            <Label htmlFor="receiver">받는 사람 ID</Label>
            <Input
              id="receiver"
              type="text"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              placeholder="사용자 ID 입력"
              disabled={!!replyMessage || !!defaultReceiverId}
              required
            />
            <p className="text-xs text-muted-foreground">
              받는 사람의 사용자 ID를 입력하세요.
            </p>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="메시지 제목"
              maxLength={255}
              required
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <Label htmlFor="content">내용</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="메시지 내용을 입력하세요..."
              rows={10}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                '전송'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default MessageForm
