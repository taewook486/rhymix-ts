/**
 * Supabase Auth Utilities
 *
 * Helper functions for authentication using Supabase
 */

import { createClient } from './server'

/**
 * Get the current authenticated user
 *
 * @returns Supabase auth user response with data and error properties
 */
export async function getUser() {
  const supabase = await createClient()
  return supabase.auth.getUser()
}

/**
 * Get the current session
 *
 * @returns Supabase auth session response with data and error properties
 */
export async function getSession() {
  const supabase = await createClient()
  return supabase.auth.getSession()
}

/**
 * Sign in with email and password
 *
 * @param email User email
 * @param password User password
 * @returns Supabase auth response
 */
export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Sign up with email and password
 *
 * @param email User email
 * @param password User password
 * @param options Additional options like user metadata
 * @returns Supabase auth response
 */
export async function signUp(email: string, password: string, options?: {
  data?: Record<string, any>
  emailRedirectTo?: string
}) {
  const supabase = await createClient()
  return supabase.auth.signUp({
    email,
    password,
    options,
  })
}

/**
 * Sign out the current user
 *
 * @returns Supabase auth response
 */
export async function signOut() {
  const supabase = await createClient()
  return supabase.auth.signOut()
}

/**
 * Reset password for an email
 *
 * @param email User email
 * @param redirectTo URL to redirect after password reset
 * @returns Supabase auth response
 */
export async function resetPassword(email: string, redirectTo?: string) {
  const supabase = await createClient()
  return supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

/**
 * Update user password
 *
 * @param password New password
 * @returns Supabase auth response
 */
export async function updatePassword(password: string) {
  const supabase = await createClient()
  return supabase.auth.updateUser({ password })
}

/**
 * Update user metadata
 *
 * @param metadata User metadata to update
 * @returns Supabase auth response
 */
export async function updateUser(metadata: Record<string, any>) {
  const supabase = await createClient()
  return supabase.auth.updateUser({ data: metadata })
}

// Export auth object for direct access
export const auth = {
  getUser,
  getSession,
  signIn,
  signUp,
  signOut,
  resetPassword,
  updatePassword,
  updateUser,
}
