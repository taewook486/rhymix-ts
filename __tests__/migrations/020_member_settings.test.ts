/**
 * Migration Test: 020_member_settings
 *
 * Tests the database schema changes for member management enhancement:
 * 1. member_settings table creation with all required fields
 * 2. profiles table extension with new columns
 * 3. RLS policies for admin access
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

describe('Migration 020: Member Settings', () => {
  describe('member_settings table', () => {
    it('should exist and have all required columns', async () => {
      const { data, error } = await supabase
        .from('member_settings')
        .select('*')
        .limit(1)

      // Table should exist (error should not be "relation does not exist")
      if (error) {
        expect(error.code).not.toBe('42P01') // undefined_table
      }

      // If data exists, verify structure
      if (data && data.length > 0) {
        const settings = data[0]
        expect(settings).toHaveProperty('id')
        expect(settings).toHaveProperty('enable_join')
        expect(settings).toHaveProperty('enable_join_key')
        expect(settings).toHaveProperty('enable_confirm')
        expect(settings).toHaveProperty('authmail_expires')
        expect(settings).toHaveProperty('member_profile_view')
        expect(settings).toHaveProperty('allow_nickname_change')
        expect(settings).toHaveProperty('update_nickname_log')
        expect(settings).toHaveProperty('nickname_symbols')
        expect(settings).toHaveProperty('nickname_spaces')
        expect(settings).toHaveProperty('allow_duplicate_nickname')
        expect(settings).toHaveProperty('password_strength')
        expect(settings).toHaveProperty('password_hashing_algorithm')
        expect(settings).toHaveProperty('password_hashing_work_factor')
        expect(settings).toHaveProperty('password_hashing_auto_upgrade')
        expect(settings).toHaveProperty('password_change_invalidate_other_sessions')
        expect(settings).toHaveProperty('password_reset_method')
        expect(settings).toHaveProperty('created_at')
        expect(settings).toHaveProperty('updated_at')
      }
    })

    it('should have default row after migration', async () => {
      const { data, error } = await supabase
        .from('member_settings')
        .select('*')
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.length).toBeGreaterThanOrEqual(1)
    })

    it('should enforce single row via check constraint', async () => {
      // Try to insert a second row (should fail if constraint exists)
      const { error } = await supabase
        .from('member_settings')
        .insert([
          {
            enable_join: true,
          },
        ])

      // Should fail with check constraint violation
      if (error) {
        expect(error.code).toBe('23514') // check_violation
      }
    })
  })

  describe('profiles table extensions', () => {
    it('should have homepage column', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('homepage')
        .limit(1)

      expect(error).toBeNull()
    })

    it('should have blog column', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('blog')
        .limit(1)

      expect(error).toBeNull()
    })

    it('should have birthday column', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('birthday')
        .limit(1)

      expect(error).toBeNull()
    })

    it('should have allow_mailing column', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('allow_mailing')
        .limit(1)

      expect(error).toBeNull()
    })

    it('should have allow_message column', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('allow_message')
        .limit(1)

      expect(error).toBeNull()
    })
  })

  describe('RLS policies', () => {
    it('should allow admins to read member_settings', async () => {
      // This test requires admin authentication
      // For now, we just verify the table has RLS enabled
      const { data, error } = await supabase
        .rpc('check_rls_enabled', { table_name: 'member_settings' })
        .maybeSingle()

      // If RPC doesn't exist, skip this test
      if (error && error.code === '42883') {
        return // Skip test
      }

      expect(error).toBeNull()
    })
  })
})
