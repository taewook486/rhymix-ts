import { redirect } from 'next/navigation'
import { getInstallationStatus } from '@/lib/install/installation-state'
import { InstallationStep } from '@/lib/install/types'
import { AdminClient } from './client'

export default async function InstallAdminPage() {
  // Check installation status
  const status = await getInstallationStatus()

  // If completed, redirect to home
  if (status?.status === 'completed') {
    redirect('/')
  }

  // If in progress but behind, redirect to current step
  if (status?.status === 'in_progress' && status.current_step > InstallationStep.ADMIN) {
    const routes = ['', 'welcome', 'supabase', 'admin', 'config', 'complete']
    redirect(`/install/${routes[status.current_step]}`)
  }

  return <AdminClient />
}
