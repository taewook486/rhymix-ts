import { redirect } from 'next/navigation'
import { getInstallationStatus } from '@/lib/install/installation-state'
import { InstallationStep } from '@/lib/install/types'
import { WelcomeClient } from './client'

export default async function InstallWelcomePage() {
  // Check if already installed
  const status = await getInstallationStatus()

  if (status?.status === 'completed') {
    redirect('/')
  }

  // If installation is in progress, redirect to current step
  if (status?.status === 'in_progress' && status.current_step > InstallationStep.WELCOME) {
    const routes = ['', 'welcome', 'supabase', 'admin', 'config', 'complete']
    redirect(`/install/${routes[status.current_step]}`)
  }

  return <WelcomeClient />
}
