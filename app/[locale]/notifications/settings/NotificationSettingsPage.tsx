'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NotificationSettingsComponent } from '@/components/notifications/NotificationSettings'
import type { UUID, NotificationSettings } from '@/lib/supabase/database.types'

/**
 * Props for NotificationSettingsPage component
 */
interface NotificationSettingsPageProps {
  userId: UUID
}

/**
 * Notification settings page component
 *
 * Wraps the NotificationSettings component with page layout.
 */
export function NotificationSettingsPage({ userId }: NotificationSettingsPageProps) {
  const handleSettingsUpdated = (settings: NotificationSettings) => {
    // Settings updated - could trigger analytics or other actions
    console.log('Notification settings updated:', settings)
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to notifications
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure how and when you receive notifications
        </p>
      </div>

      {/* Settings component */}
      <NotificationSettingsComponent
        userId={userId}
        onSettingsUpdated={handleSettingsUpdated}
      />
    </div>
  )
}
