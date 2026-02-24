'use client'

import React, { useState } from 'react'
import { Bell, Trash2, CheckCheck, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { markAllNotificationsAsRead } from '@/app/actions/notifications'
import { toast } from '@/hooks/use-toast'
import type { UUID, NotificationWithMeta } from '@/lib/supabase/database.types'

/**
 * Props for NotificationList component
 */
interface NotificationListProps {
  userId: UUID
}

/**
 * Notification list component with filtering
 *
 * Displays all notifications with tabs for all/unread/read filtering.
 */
export function NotificationList({ userId }: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    deleteNotification,
    refresh,
  } = useNotifications({
    userId,
    realtime: true,
    showToast: false, // Don't show toast for this page
    limit: 100, // Load more notifications
  })

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === 'unread') return !notification.is_read
    if (activeTab === 'read') return notification.is_read
    return true
  })

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true)
    const result = await markAllNotificationsAsRead(userId)
    setIsMarkingAll(false)

    if (result.success) {
      toast({
        title: 'All notifications marked as read',
        description: `${unreadCount} notifications have been marked as read.`,
      })
      await refresh()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to mark all as read',
        variant: 'destructive',
      })
    }
  }

  // Handle delete notification
  const handleDelete = async (notificationId: UUID) => {
    await deleteNotification(notificationId)
  }

  // Handle mark as read
  const handleMarkRead = async (notificationId: UUID) => {
    await markAsRead(notificationId)
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({unreadCount} unread)
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({notifications.length - unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <NotificationContent
            notifications={filteredNotifications}
            isLoading={isLoading}
            error={error}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <NotificationContent
            notifications={filteredNotifications}
            isLoading={isLoading}
            error={error}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="read" className="mt-4">
          <NotificationContent
            notifications={filteredNotifications}
            isLoading={isLoading}
            error={error}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onRefresh={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Notification content component
 */
interface NotificationContentProps {
  notifications: NotificationWithMeta[]
  isLoading: boolean
  error: Error | null
  onMarkRead: (id: UUID) => void
  onDelete: (id: UUID) => void
  onRefresh: () => void
}

function NotificationContent({
  notifications,
  isLoading,
  error,
  onMarkRead,
  onDelete,
  onRefresh,
}: NotificationContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">Failed to load notifications</p>
        <Button variant="outline" onClick={onRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground">No notifications found</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg divide-y">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
          showActions={true}
        />
      ))}
    </div>
  )
}
