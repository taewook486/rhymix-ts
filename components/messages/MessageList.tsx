'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Inbox, Send, Plus, Search, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMessages } from '@/hooks/useMessages'
import { useRealtime } from '@/hooks/useRealtime'
import { toast } from '@/hooks/use-toast'
import type { UUID } from '@/lib/supabase/database.types'

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  /** User ID to fetch messages for */
  userId: UUID
  /** Active folder (default: 'inbox') */
  defaultFolder?: 'inbox' | 'sent'
}

/**
 * Message list component with inbox/sent folders
 *
 * Displays a tabbed interface for inbox and sent messages.
 * Supports realtime updates, search, and bulk actions.
 *
 * @example
 * ```tsx
 * function MessagesPage({ user }: { user: User }) {
 *   return (
 *     <div>
 *       <MessageList userId={user.id} />
 *     </div>
 *   )
 * }
 * ```
 */
export function MessageList({ userId, defaultFolder = 'inbox' }: MessageListProps) {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent'>(defaultFolder)
  const [searchQuery, setSearchQuery] = useState('')

  const {
    messages,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    refresh,
  } = useMessages({
    userId,
    folder: activeFolder,
    search: searchQuery || undefined,
  })

  // Subscribe to realtime message updates
  useRealtime({
    table: 'messages',
    filter: `receiver_id=eq.${userId}`,
    enabled: true,
    onInsert: () => {
      toast({
        title: '새 메시지',
        description: '새로운 메시지가 도착했습니다.',
      })
      refresh()
    },
    onUpdate: () => {
      refresh()
    },
  })

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead()
    toast({
      title: '모두 읽음으로 표시',
      description: '모든 메시지를 읽음으로 표시했습니다.',
    })
  }

  // Handle delete message
  const handleDelete = async (messageId: UUID) => {
    await deleteMessage(messageId)
    toast({
      title: '메시지 삭제',
      description: '메시지를 삭제했습니다.',
    })
  }

  // Filter messages based on search
  const filteredMessages = searchQuery
    ? messages.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={activeFolder} onValueChange={(v) => setActiveFolder(v as 'inbox' | 'sent')}>
          <TabsList>
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              받은편지함
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              보낸편지함
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Link href="/messages/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              메시지 작성
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="메시지 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Actions */}
      {activeFolder === 'inbox' && unreadCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            읽지 않은 메시지 {unreadCount}개
          </span>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            모두 읽음으로 표시
          </Button>
        </div>
      )}

      {/* Message List */}
      <ScrollArea className="h-[600px] border rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-destructive">오류가 발생했습니다.</div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              {activeFolder === 'inbox' ? (
                <>
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>받은 메시지가 없습니다.</p>
                </>
              ) : (
                <>
                  <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>보낸 메시지가 없습니다.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredMessages.map((message) => (
              <Link
                key={message.id}
                href={`/messages/${message.id}`}
                className="block hover:bg-accent transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!message.is_read && activeFolder === 'inbox' && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <h3
                          className={`font-medium truncate ${
                            !message.is_read && activeFolder === 'inbox' ? 'font-semibold' : ''
                          }`}
                        >
                          {message.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(message.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default MessageList
