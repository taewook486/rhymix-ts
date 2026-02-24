'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Save, Bell, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '@/app/actions/notifications'
import type { NotificationSettings, UUID } from '@/lib/supabase/database.types'

/**
 * Props for NotificationSettings component
 */
export interface NotificationSettingsProps {
  /** User ID to get/update settings for */
  userId: UUID
  /** Settings updated callback */
  onSettingsUpdated?: (settings: NotificationSettings) => void
  /** Custom class name */
  className?: string
}

/**
 * Notification settings component
 *
 * Allows users to configure their notification preferences.
 * Manages email, push, and in-app notification settings.
 *
 * @example
 * ```tsx
 * function SettingsPage({ user }: { user: User }) {
 *   return (
 *     <div>
 *       <h1>Notification Settings</h1>
 *       <NotificationSettings userId={user.id} />
 *     </div>
 *   )
 * }
 * ```
 */
export function NotificationSettingsComponent({
  userId,
  onSettingsUpdated,
  className,
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: true,
    push: false,
    comment: true,
    mention: true,
    like: false,
    reply: true,
    system: true,
    admin: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [userId])

  async function loadSettings() {
    setIsLoading(true)
    setError(null)

    const result = await getNotificationSettings(userId)

    if (result.success && result.data) {
      setSettings(result.data)
    } else {
      setError(result.error || 'Failed to load notification settings')
      toast({
        title: 'Error',
        description: result.error || 'Failed to load notification settings',
        variant: 'destructive',
      })
    }

    setIsLoading(false)
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)

    const result = await updateNotificationSettings(userId, settings)

    if (result.success && result.data) {
      setSettings(result.data)
      onSettingsUpdated?.(result.data)
      toast({
        title: 'Settings saved',
        description: 'Your notification settings have been updated.',
      })
    } else {
      setError(result.error || 'Failed to update notification settings')
      toast({
        title: 'Error',
        description: result.error || 'Failed to update notification settings',
        variant: 'destructive',
      })
    }

    setIsSaving(false)
  }

  function handleToggle(key: keyof NotificationSettings) {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about different activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Delivery Methods</h3>

          {/* Email notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.email || false}
              onCheckedChange={() => handleToggle('email')}
            />
          </div>

          {/* Push notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Push notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive push notifications in your browser
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.push || false}
              onCheckedChange={() => handleToggle('push')}
            />
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Notification Types</h3>

          {/* Comment notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comment-notifications" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </Label>
              <p className="text-xs text-muted-foreground">
                When someone comments on your content
              </p>
            </div>
            <Switch
              id="comment-notifications"
              checked={settings.comment || false}
              onCheckedChange={() => handleToggle('comment')}
            />
          </div>

          {/* Mention notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mention-notifications">Mentions</Label>
              <p className="text-xs text-muted-foreground">
                When someone mentions you
              </p>
            </div>
            <Switch
              id="mention-notifications"
              checked={settings.mention || false}
              onCheckedChange={() => handleToggle('mention')}
            />
          </div>

          {/* Like notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="like-notifications">Likes</Label>
              <p className="text-xs text-muted-foreground">
                When someone likes your content
              </p>
            </div>
            <Switch
              id="like-notifications"
              checked={settings.like || false}
              onCheckedChange={() => handleToggle('like')}
            />
          </div>

          {/* Reply notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reply-notifications">Replies</Label>
              <p className="text-xs text-muted-foreground">
                When someone replies to your comments
              </p>
            </div>
            <Switch
              id="reply-notifications"
              checked={settings.reply || false}
              onCheckedChange={() => handleToggle('reply')}
            />
          </div>

          {/* System notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system-notifications">System</Label>
              <p className="text-xs text-muted-foreground">
                Important system announcements
              </p>
            </div>
            <Switch
              id="system-notifications"
              checked={settings.system !== false} // Default true
              onCheckedChange={() => handleToggle('system')}
            />
          </div>

          {/* Admin notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="admin-notifications">Admin</Label>
              <p className="text-xs text-muted-foreground">
                Administrative notifications (if applicable)
              </p>
            </div>
            <Switch
              id="admin-notifications"
              checked={settings.admin !== false} // Default true
              onCheckedChange={() => handleToggle('admin')}
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default NotificationSettingsComponent
