import { createClient } from '@/lib/supabase/server'
import {
  InstallationStatusRecord,
  InstallationStatusType,
  InstallationStepType,
} from './types'

/**
 * Get the current installation status
 */
export async function getInstallationStatus(): Promise<InstallationStatusRecord | null> {
  try {
    const supabase = await createClient()

    // Check if installation_status table exists
    const { data, error } = await supabase
      .from('installation_status')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      // Table might not exist yet (migration not run)
      console.error('Installation status error:', error)
      return null
    }

    return data as InstallationStatusRecord
  } catch (error) {
    console.error('Failed to get installation status:', error)
    return null
  }
}

/**
 * Check if installation is complete
 */
export async function isInstallationComplete(): Promise<boolean> {
  const status = await getInstallationStatus()
  return status?.status === 'completed'
}

/**
 * Check if installation has started
 */
export async function isInstallationStarted(): Promise<boolean> {
  const status = await getInstallationStatus()
  return status?.status === 'in_progress'
}

/**
 * Update installation step
 */
export async function updateInstallationStep(
  step: InstallationStepType,
  data?: Partial<InstallationStatusRecord>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current record
    const { data: current, error: fetchError } = await supabase
      .from('installation_status')
      .select('id')
      .limit(1)
      .single()

    if (fetchError || !current) {
      return { success: false, error: 'Installation record not found' }
    }

    // Update record
    const updateData: Record<string, unknown> = {
      current_step: step,
      status: step === 5 ? 'completed' : 'in_progress',
      ...data,
    }

    const { error: updateError } = await supabase
      .from('installation_status')
      .update(updateData)
      .eq('id', current.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to update installation step:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Save Supabase configuration
 */
export async function saveSupabaseConfig(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ success: boolean; error?: string }> {
  return updateInstallationStep(2, {
    supabase_url: supabaseUrl,
    supabase_anon_key: supabaseAnonKey,
  })
}

/**
 * Save admin account info
 */
export async function saveAdminInfo(
  adminEmail: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  return updateInstallationStep(3, {
    admin_email: adminEmail,
    admin_user_id: adminUserId,
  })
}

/**
 * Save site configuration
 */
export async function saveSiteConfig(
  siteName: string,
  timezone: string,
  language: string
): Promise<{ success: boolean; error?: string }> {
  return updateInstallationStep(4, {
    site_name: siteName,
    timezone,
    language,
  })
}

/**
 * Complete installation
 */
export async function completeInstallation(): Promise<{
  success: boolean
  error?: string
}> {
  return updateInstallationStep(5, {
    status: 'completed',
  })
}

/**
 * Reset installation (for testing/development)
 */
export async function resetInstallation(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('installation_status')
      .update({
        status: 'pending',
        current_step: 1,
        site_name: null,
        admin_email: null,
        admin_user_id: null,
        timezone: 'Asia/Seoul',
        language: 'ko',
        supabase_url: null,
        supabase_anon_key: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to reset installation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
