/**
 * Supabase Admin Client
 *
 * Creates a Supabase client with service role privileges for
 * administrative operations like user creation during installation.
 *
 * IMPORTANT: This client should ONLY be used on the server side
 * and only during installation or by authenticated admins.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Creates a Supabase admin client with service role key
 * This client bypasses RLS policies for administrative operations
 *
 * @returns Supabase client with service role privileges
 * @throws Error if service role key is not configured
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is not configured'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not configured. ' +
        'This is required for administrative operations during installation.'
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Creates a Supabase client with custom URL and key for validation
 * Used to test connection during installation
 *
 * @param url - Supabase project URL
 * @param key - Supabase anon/service role key
 * @returns Supabase client instance
 */
export function createClientWithCredentials(
  url: string,
  key: string
): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Admin user creation result
 */
export interface AdminUserResult {
  success: boolean
  userId?: string
  email?: string
  error?: string
  errorDetails?: Record<string, unknown>
}

/**
 * Creates an admin user using the Supabase Admin API
 *
 * @param email - Admin email address
 * @param password - Admin password
 * @param displayName - Admin display name
 * @returns Result object with user ID or error details
 */
export async function createAdminUser(
  email: string,
  password: string,
  displayName: string
): Promise<AdminUserResult> {
  try {
    const adminClient = createAdminClient()

    // Create user with admin privileges
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        display_name: displayName,
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

    return {
      success: true,
      userId: authData.user.id,
      email: authData.user.email!,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during user creation',
      errorDetails: {
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
    }
  }
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean
  error?: string
  details?: {
    url: string
    projectRef?: string
    region?: string
  }
}

/**
 * Tests Supabase connection with provided credentials
 *
 * @param url - Supabase project URL
 * @param key - Supabase anon key
 * @returns Connection test result
 */
export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<ConnectionTestResult> {
  try {
    const client = createClientWithCredentials(url, key)

    // Test connection by fetching a simple query
    const { error } = await client.from('profiles').select('id').limit(1)

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine for testing
      return {
        success: false,
        error: error.message,
        details: {
          url,
        },
      }
    }

    // Extract project ref from URL
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const projectRef = hostname.split('.')[0]

    return {
      success: true,
      details: {
        url,
        projectRef,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
      details: {
        url,
      },
    }
  }
}

/**
 * Verifies that required database migrations have been applied
 *
 * @param url - Supabase project URL
 * @param key - Supabase service role key
 * @returns Object indicating if migrations are applied
 */
export async function verifyMigrationsApplied(
  url: string,
  key: string
): Promise<{ applied: boolean; error?: string }> {
  try {
    const client = createClientWithCredentials(url, key)

    // Check if required tables exist
    const requiredTables = ['profiles', 'installation_status', 'site_config', 'settings']

    for (const table of requiredTables) {
      const { error } = await client.from(table).select('id').limit(1)

      if (error && error.code === '42P01') {
        // Table does not exist
        return {
          applied: false,
          error: `Required table '${table}' does not exist. Please run migrations.`,
        }
      }
    }

    return { applied: true }
  } catch (error) {
    return {
      applied: false,
      error: error instanceof Error ? error.message : 'Migration verification failed',
    }
  }
}
