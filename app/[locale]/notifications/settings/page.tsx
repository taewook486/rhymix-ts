import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationSettingsPage } from './NotificationSettingsPage'

/**
 * Notification settings page
 *
 * Allows users to configure their notification preferences.
 */
export default async function NotificationsSettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/notifications/settings')
  }

  return <NotificationSettingsPage userId={user.id} />
}
