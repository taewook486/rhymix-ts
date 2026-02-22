'use server'

/**
 * Installation Server Actions
 *
 * Provides server actions for the installation wizard:
 * - Checking installation status
 * - Validating Supabase connection
 * - Creating admin account
 * - Saving site configuration
 * - Environment variable management
 * - Completing installation
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/ssr'
import {
  saveSupabaseConfig,
  saveAdminInfo,
  saveSiteConfig,
  completeInstallation,
  getInstallationStatus,
  updateInstallationStep,
} from './installation-state'
import {
  supabaseConfigSchema,
  adminAccountSchema,
  siteConfigSchema,
  type SupabaseConfigFormData,
  type AdminAccountFormData,
  type SiteConfigFormData,
} from './types'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Generic action result type
 */
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
  errorDetails?: Record<string, unknown>
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean
  projectRef?: string
  region?: string
  migrationsApplied?: boolean
}

/**
 * Admin user creation result
 */
export interface AdminUserResult {
  userId: string
  email: string
}

// =====================================================
// INSTALLATION STATUS ACTIONS
// =====================================================

/**
 * Check if installation is complete (for middleware)
 */
export async function checkInstallationStatus(): Promise<{
  installed: boolean
  currentStep: number
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('installation_status')
      .select('status, current_step')
      .limit(1)
      .single()

    if (error || !data) {
      // If table doesn't exist, need to run migrations
      return { installed: false, currentStep: 1 }
    }

    return {
      installed: data.status === 'completed',
      currentStep: data.current_step,
    }
  } catch {
    return { installed: false, currentStep: 1 }
  }
}

/**
 * Get detailed installation state
 */
export async function getInstallationState(): Promise<
  ActionResult<{
    isInstalled: boolean
    currentStep: number
    siteName?: string
    adminEmail?: string
  }>
> {
  try {
    const status = await getInstallationStatus()

    if (!status) {
      return {
        success: true,
        data: { isInstalled: false, currentStep: 1 },
      }
    }

    return {
      success: true,
      data: {
        isInstalled: status.status === 'completed',
        currentStep: status.current_step,
        siteName: status.site_name || undefined,
        adminEmail: status.admin_email || undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =====================================================
// DATABASE CONNECTION ACTIONS
// =====================================================

/**
 * Validate Supabase connection with detailed testing
 */
export async function validateSupabaseConnection(
  data: SupabaseConfigFormData
): Promise<ActionResult<ConnectionTestResult>> {
  try {
    // Validate input
    const validated = supabaseConfigSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Invalid data',
      }
    }

    const { supabaseUrl, supabaseAnonKey } = validated.data

    // For local development, skip the API test and directly validate
    // The local Supabase instance uses Docker networking which may not be accessible
    // from server-side fetch in the same way
    const isLocalDev = supabaseUrl.includes('localhost') ||
                       supabaseUrl.includes('127.0.0.1')

    if (isLocalDev) {
      // For local development, just validate the format and save
      console.log('[Install] Local development detected, skipping API connection test')

      // Save configuration directly
      const result = await saveSupabaseConfig(supabaseUrl, supabaseAnonKey)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to save configuration',
        }
      }

      return {
        success: true,
        data: {
          success: true,
          projectRef: 'local',
          migrationsApplied: true, // Assume migrations are applied in local dev
        },
      }
    }

    // For production, test the connection
    const testResponse = await fetch(
      `${supabaseUrl}/rest/v1/installation_status?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    )

    if (!testResponse.ok) {
      // Check if it's a connection error vs. table not found
      if (testResponse.status === 0 || testResponse.status === 503) {
        return {
          success: false,
          error: 'Cannot reach Supabase server. Please check the URL.',
        }
      }
      if (testResponse.status === 401 || testResponse.status === 403) {
        return {
          success: false,
          error: 'Invalid Supabase credentials. Please check your Anon Key.',
        }
      }
      // Table not found or other error - still might be valid connection
      console.warn('[Install] Connection test returned non-OK status:', testResponse.status)
    }

    // Extract project ref from URL
    const urlObj = new URL(supabaseUrl)
    const hostname = urlObj.hostname
    const projectRef = hostname.split('.')[0]

    // Test if we can access the profiles table (basic migration check)
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    const migrationsApplied = profileResponse.ok

    // Save configuration
    const result = await saveSupabaseConfig(supabaseUrl, supabaseAnonKey)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to save configuration',
      }
    }

    return {
      success: true,
      data: {
        success: true,
        projectRef,
        migrationsApplied,
      },
    }
  } catch (error) {
    console.error('[Install] Connection validation error:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Connection failed. Please verify your Supabase credentials.',
    }
  }
}

// =====================================================
// ADMIN ACCOUNT ACTIONS
// =====================================================

/**
 * Create admin account during installation
 * Uses the Supabase Admin API if service role key is available,
 * otherwise falls back to regular signUp flow.
 */
export async function createAdminAccount(
  data: AdminAccountFormData
): Promise<ActionResult<AdminUserResult>> {
  try {
    // Validate input
    const validated = adminAccountSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Invalid data',
      }
    }

    // Check if we have a service role key for admin API access
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    // If service role key is available, use admin API for more reliable user creation
    if (serviceRoleKey && supabaseUrl) {
      return await createAdminWithServiceRole(
        supabaseUrl,
        serviceRoleKey,
        validated.data.email,
        validated.data.password,
        validated.data.nickname,
        validated.data.user_id
      )
    }

    // Fall back to regular signup flow
    return await createAdminWithSignUp(validated.data)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin account',
    }
  }
}

/**
 * Create admin user using Supabase Admin API (requires service role key)
 */
async function createAdminWithServiceRole(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  displayName: string,
  userId: string
): Promise<ActionResult<AdminUserResult>> {
  try {
    // Create admin client with service role
    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create user with admin privileges
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        display_name: displayName,
        user_id: userId,
        role: 'admin',
      },
    })

    if (authError) {
      return {
        success: false,
        error: authError.message,
        errorDetails: {
          code: authError.code,
          status: authError.status,
        },
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'User creation returned no user data',
      }
    }

    // Create or update profile with admin role
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: authData.user.id,
      email: authData.user.email!,
      display_name: displayName,
      role: 'admin',
      email_verified: new Date().toISOString(),
    })

    if (profileError) {
      // Attempt to clean up the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id)

      return {
        success: false,
        error: `Failed to create user profile: ${profileError.message}`,
        errorDetails: {
          code: profileError.code,
          details: profileError.details,
        },
      }
    }

    // Save admin info to installation status
    const result = await saveAdminInfo(email, authData.user.id)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to save admin info',
      }
    }

    return {
      success: true,
      data: {
        userId: authData.user.id,
        email: authData.user.email!,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during admin creation',
    }
  }
}

/**
 * Create admin user using regular signUp flow (fallback)
 */
async function createAdminWithSignUp(data: {
  email: string
  password: string
  nickname: string
  user_id: string
}): Promise<ActionResult<AdminUserResult>> {
  try {
    const supabase = await createClient()

    console.log('[Install] Creating auth user with email:', data.email)

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nickname: data.nickname,
          user_id: data.user_id,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (authError) {
      console.error('[Install] Auth signUp error:', authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' }
    }

    console.log('[Install] Auth user created:', authData.user.id)

    // Create profile manually (no trigger exists or trigger might fail due to RLS)
    // Use upsert to handle both create and update cases
    console.log('[Install] Creating profile for user:', authData.user.id)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: data.email,
        display_name: data.nickname,
        role: 'admin',
        email_verified: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('[Install] Profile creation error:', profileError)
      // Attempt to clean up the auth user if profile creation fails
      // Note: This won't work with anon key, but the service role flow handles this
      return {
        success: false,
        error: `Failed to create user profile: ${profileError.message}`,
        errorDetails: {
          code: profileError.code,
          details: profileError.details,
        },
      }
    }

    console.log('[Install] Profile created successfully')

    // Save admin info to installation status
    console.log('[Install] Saving admin info to installation_status')
    const result = await saveAdminInfo(data.email, authData.user.id)

    if (!result.success) {
      console.error('[Install] Failed to save admin info:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[Install] Admin account created successfully')
    return {
      success: true,
      data: {
        userId: authData.user.id,
        email: data.email,
      },
    }
  } catch (error) {
    console.error('[Install] Exception in createAdminWithSignUp:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin account',
    }
  }
}

// =====================================================
// SITE CONFIGURATION ACTIONS
// =====================================================

/**
 * Save site configuration
 * Also initializes the site_config table with default values
 */
export async function saveConfiguration(
  data: SiteConfigFormData
): Promise<ActionResult> {
  try {
    // Validate input
    const validated = siteConfigSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Invalid data',
      }
    }

    const supabase = await createClient()

    // Save to installation_status first
    const result = await saveSiteConfig(
      validated.data.siteName,
      validated.data.timezone,
      validated.data.language
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to save site configuration',
      }
    }

    // Also save to site_config table for application use
    const configEntries = [
      {
        key: 'site.name',
        value: JSON.stringify(validated.data.siteName),
        category: 'general',
        description: 'Site name displayed in title and header',
        is_public: true,
      },
      {
        key: 'site.timezone',
        value: JSON.stringify(validated.data.timezone),
        category: 'general',
        description: 'Site timezone',
        is_public: true,
      },
      {
        key: 'site.language',
        value: JSON.stringify(validated.data.language),
        category: 'general',
        description: 'Default site language',
        is_public: true,
      },
    ]

    for (const entry of configEntries) {
      const { error: insertError } = await supabase
        .from('site_config')
        .upsert(entry, { onConflict: 'key' })

      if (insertError) {
        console.error(`Failed to save config ${entry.key}:`, insertError)
        // Continue with other entries
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save configuration',
    }
  }
}

/**
 * Get site configuration value
 */
export async function getSiteConfigValue(key: string): Promise<ActionResult<unknown>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', key)
      .single()

    if (error) {
      return {
        success: false,
        error: `Configuration key '${key}' not found`,
      }
    }

    return {
      success: true,
      data: data.value,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting configuration',
    }
  }
}

/**
 * Get all site configuration
 */
export async function getAllSiteConfig(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from('site_config').select('key, value')

    if (error) {
      return {
        success: false,
        error: `Failed to get site configuration: ${error.message}`,
      }
    }

    const config: Record<string, unknown> = {}
    for (const item of data || []) {
      config[item.key] = item.value
    }

    return {
      success: true,
      data: config,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting configuration',
    }
  }
}

// =====================================================
// INSTALLATION COMPLETION ACTIONS
// =====================================================

/**
 * Complete installation
 * Marks installation as completed and saves final metadata
 */
export async function finalizeInstallation(): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Update installation status
    const result = await completeInstallation()

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to complete installation',
      }
    }

    // Update settings table to mark installation as complete
    const { error: settingsError } = await supabase.from('settings').upsert({
      module: 'core',
      key: 'installation_complete',
      value: JSON.stringify(true),
      description: 'Installation wizard completed',
      is_public: false,
      is_system: true,
    })

    if (settingsError) {
      console.error('Failed to update settings:', settingsError)
      // Continue anyway - main completion was successful
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete installation',
    }
  }
}

// =====================================================
// ENVIRONMENT VARIABLE MANAGEMENT
// =====================================================

/**
 * Write environment variables to .env.local
 * This function writes Supabase credentials to the environment file
 *
 * @param url - Supabase project URL
 * @param anonKey - Supabase anon key
 * @param serviceRoleKey - Supabase service role key (optional)
 * @returns Action result
 */
export async function writeEnvironmentVariables(
  url: string,
  anonKey: string,
  serviceRoleKey?: string
): Promise<ActionResult> {
  try {
    // This is a server action, so we can use Node.js fs
    const fs = await import('fs')
    const path = await import('path')

    const envPath = path.join(process.cwd(), '.env.local')

    // Read existing .env.local if it exists
    let envContent = ''
    try {
      envContent = fs.readFileSync(envPath, 'utf-8')
    } catch {
      // File doesn't exist, start fresh
      envContent = ''
    }

    // Parse existing variables
    const envLines = envContent.split('\n').filter((line) => line.trim() && !line.startsWith('#'))
    const envMap = new Map<string, string>()

    for (const line of envLines) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envMap.set(key.trim(), valueParts.join('=').trim())
      }
    }

    // Update/add Supabase variables
    envMap.set('NEXT_PUBLIC_SUPABASE_URL', url)
    envMap.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey)

    if (serviceRoleKey) {
      envMap.set('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey)
    }

    // Also set SUPABASE_URL (without NEXT_PUBLIC prefix) for server-side use
    envMap.set('SUPABASE_URL', url)

    // Generate new content with comments
    const header = '# Rhymix TS Environment Variables\n# Generated by Installation Wizard\n\n'
    const newEnvContent =
      header +
      Array.from(envMap.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') +
      '\n'

    // Write to file
    fs.writeFileSync(envPath, newEnvContent, 'utf-8')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? `Failed to write environment variables: ${error.message}`
          : 'Unknown error writing environment variables',
    }
  }
}

// =====================================================
// UTILITY ACTIONS
// =====================================================

/**
 * Reset installation (for testing/debugging purposes)
 * Only works in development environment
 */
export async function resetInstallation(): Promise<ActionResult> {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Installation reset is not allowed in production',
      }
    }

    const supabase = await createClient()

    // Reset installation status
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
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      return {
        success: false,
        error: `Failed to reset installation: ${error.message}`,
      }
    }

    // Clear site config
    await supabase.from('site_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error resetting installation',
    }
  }
}

/**
 * Save installation step progress
 */
export async function saveInstallationStep(
  step: number,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const result = await updateInstallationStep(step as 1 | 2 | 3 | 4 | 5, data)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to save step',
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error saving step',
    }
  }
}
