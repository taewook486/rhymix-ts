import { redirect } from 'next/navigation'
import { getInstallationStatus } from '@/lib/install/installation-state'
import { InstallationStep } from '@/lib/install/types'
import { SupabaseClient } from './client'

// Force dynamic rendering for installation pages
export const dynamic = 'force-dynamic'

export default async function InstallSupabasePage() {
  // Check installation status
  const status = await getInstallationStatus()

  // If completed, redirect to home
  if (status?.status === 'completed') {
    redirect('/')
  }

  // If in progress but behind, redirect to current step
  if (status?.status === 'in_progress' && status.current_step > InstallationStep.SUPABASE) {
    const routes = ['', 'welcome', 'supabase', 'admin', 'config', 'complete']
    redirect(`/install/${routes[status.current_step]}`)
  }

  return <SupabaseClient />
}
