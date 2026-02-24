import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationList } from './NotificationList'

/**
 * Notifications page
 *
 * Displays all notifications for the current user with filtering options.
 */
export default async function NotificationsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/notifications')
  }

  return <NotificationList userId={user.id} />
}
