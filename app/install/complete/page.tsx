import { redirect } from 'next/navigation'
import { getInstallationStatus } from '@/lib/install/installation-state'
import { CompleteClient } from './client'

export default async function InstallCompletePage() {
  // Check installation status
  const status = await getInstallationStatus()

  // If not in progress or completed, redirect to start
  if (!status || (status.status !== 'in_progress' && status.status !== 'completed')) {
    redirect('/install')
  }

  return <CompleteClient />
}
