'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'
import { locales, type Locale } from '@/lib/i18n/config'

// =====================================================
// Types
// =====================================================

export interface Translation {
  id: string
  lang_code: string
  namespace: string
  key: string
  value: string
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface TranslationInput {
  lang_code: string
  namespace: string
  key: string
  value: string
  is_active?: boolean
}

export interface TranslationUpdate {
  value?: string
  is_active?: boolean
}

export interface MissingTranslation {
  key: string
  namespace: string
  missing_langs: string[]
}

export interface TranslationStats {
  total: number
  active: number
  system: number
  by_lang: Record<string, number>
  by_namespace: Record<string, number>
  missing_count: number
}

// =====================================================
// Error Messages
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  PERMISSION_DENIED: 'Admin access required',
  NOT_FOUND: 'Translation not found',
  INVALID_INPUT: 'Invalid input provided',
  DUPLICATE_KEY: 'Translation key already exists for this language and namespace',
  CREATE_FAILED: 'Failed to create translation',
  UPDATE_FAILED: 'Failed to update translation',
  DELETE_FAILED: 'Failed to delete translation',
  UNKNOWN_ERROR: 'An unexpected error occurred',
  IMPORT_FAILED: 'Failed to import translations',
  INVALID_FILE: 'Invalid file format',
}

// =====================================================
// Helper Functions
// =====================================================

async function checkAdminAccess(): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  return profile?.role === 'admin' || profile?.role === 'moderator'
}

// =====================================================
// Translation CRUD Actions
// =====================================================

/**
 * Get all translations with optional filtering
 */
export async function getTranslations(params?: {
  lang_code?: string
  namespace?: string
  search?: string
  is_active?: boolean
  limit?: number
  offset?: number
}): Promise<ActionResult<Translation[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('translations')
      .select('*')
      .order('namespace', { ascending: true })
      .order('key', { ascending: true })

    if (params?.lang_code) {
      query = query.eq('lang_code', params.lang_code)
    }

    if (params?.namespace) {
      query = query.eq('namespace', params.namespace)
    }

    if (params?.search) {
      query = query.or(`key.ilike.%${params.search}%,value.ilike.%${params.search}%`)
    }

    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    if (params?.limit) {
      query = query.limit(params.limit)
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching translations:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error in getTranslations:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get a single translation by ID
 */
export async function getTranslation(id: string): Promise<ActionResult<Translation>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from('translations').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
      }
      console.error('Error fetching translation:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error in getTranslation:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Create a new translation
 */
export async function createTranslation(input: TranslationInput): Promise<ActionResult<Translation>> {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Validate language code
    if (!locales.includes(input.lang_code as Locale)) {
      return { success: false, error: 'Invalid language code' }
    }

    const { data, error } = await supabase
      .from('translations')
      .insert({
        lang_code: input.lang_code,
        namespace: input.namespace,
        key: input.key,
        value: input.value,
        is_active: input.is_active ?? true,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: ERROR_MESSAGES.DUPLICATE_KEY }
      }
      console.error('Error creating translation:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data, message: 'Translation created successfully' }
  } catch (error) {
    console.error('Unexpected error in createTranslation:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Update an existing translation
 */
export async function updateTranslation(id: string, input: TranslationUpdate): Promise<ActionResult<Translation>> {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Check if translation exists and is not a system translation
    const { data: existing } = await supabase.from('translations').select('is_system').eq('id', id).single()

    if (!existing) {
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    const { data, error } = await supabase
      .from('translations')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating translation:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true, data, message: 'Translation updated successfully' }
  } catch (error) {
    console.error('Unexpected error in updateTranslation:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete a translation (only non-system translations)
 */
export async function deleteTranslation(id: string): Promise<ActionResult> {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Check if translation exists and is not a system translation
    const { data: existing } = await supabase.from('translations').select('is_system').eq('id', id).single()

    if (!existing) {
      return { success: false, error: ERROR_MESSAGES.NOT_FOUND }
    }

    if (existing.is_system) {
      return { success: false, error: 'Cannot delete system translations' }
    }

    const { error } = await supabase.from('translations').delete().eq('id', id)

    if (error) {
      console.error('Error deleting translation:', error)
      return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
    }

    return { success: true, message: 'Translation deleted successfully' }
  } catch (error) {
    console.error('Unexpected error in deleteTranslation:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Bulk update translations
 */
export async function bulkUpdateTranslations(
  updates: Array<{ id: string; value: string }>
): Promise<ActionResult> {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // Update each translation
    const results = await Promise.all(
      updates.map((update) =>
        supabase
          .from('translations')
          .update({
            value: update.value,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id)
      )
    )

    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('Errors in bulk update:', errors)
      return { success: false, error: `${errors.length} updates failed` }
    }

    return { success: true, message: `${updates.length} translations updated successfully` }
  } catch (error) {
    console.error('Unexpected error in bulkUpdateTranslations:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Missing Translations Detection
// =====================================================

/**
 * Detect missing translations across languages
 */
export async function getMissingTranslations(): Promise<ActionResult<MissingTranslation[]>> {
  try {
    const supabase = await createClient()

    // Get all unique keys with namespaces
    const { data: allKeys, error } = await supabase
      .from('translations')
      .select('namespace, key, lang_code')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching translations for missing detection:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Build a map of existing translations
    const translationMap = new Map<string, Set<string>>()

    for (const item of allKeys || []) {
      const mapKey = `${item.namespace}.${item.key}`
      if (!translationMap.has(mapKey)) {
        translationMap.set(mapKey, new Set())
      }
      translationMap.get(mapKey)!.add(item.lang_code)
    }

    // Find missing translations
    const missing: MissingTranslation[] = []

    for (const [compoundKey, existingLangs] of translationMap) {
      const missingLangs = locales.filter((lang) => !existingLangs.has(lang))
      if (missingLangs.length > 0) {
        const [namespace, ...keyParts] = compoundKey.split('.')
        missing.push({
          key: keyParts.join('.'),
          namespace,
          missing_langs: missingLangs,
        })
      }
    }

    return { success: true, data: missing }
  } catch (error) {
    console.error('Unexpected error in getMissingTranslations:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Statistics
// =====================================================

/**
 * Get translation statistics
 */
export async function getTranslationStats(): Promise<ActionResult<TranslationStats>> {
  try {
    const supabase = await createClient()

    // Get all translations
    const { data, error } = await supabase.from('translations').select('*')

    if (error) {
      console.error('Error fetching translation stats:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const translations = data || []

    // Calculate stats
    const byLang: Record<string, number> = {}
    const byNamespace: Record<string, number> = {}

    for (const t of translations) {
      byLang[t.lang_code] = (byLang[t.lang_code] || 0) + 1
      byNamespace[t.namespace] = (byNamespace[t.namespace] || 0) + 1
    }

    // Get missing count
    const missingResult = await getMissingTranslations()
    const missingCount = missingResult.success ? missingResult.data?.length || 0 : 0

    return {
      success: true,
      data: {
        total: translations.length,
        active: translations.filter((t) => t.is_active).length,
        system: translations.filter((t) => t.is_system).length,
        by_lang: byLang,
        by_namespace: byNamespace,
        missing_count: missingCount,
      },
    }
  } catch (error) {
    console.error('Unexpected error in getTranslationStats:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Import/Export
// =====================================================

/**
 * Export translations as JSON
 */
export async function exportTranslations(params?: {
  lang_code?: string
  namespace?: string
  format?: 'json' | 'nested'
}): Promise<ActionResult<Record<string, any>>> {
  try {
    const supabase = await createClient()

    let query = supabase.from('translations').select('*').eq('is_active', true)

    if (params?.lang_code) {
      query = query.eq('lang_code', params.lang_code)
    }

    if (params?.namespace) {
      query = query.eq('namespace', params.namespace)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error exporting translations:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    // Format as nested object structure
    const result: Record<string, any> = {}

    for (const t of data || []) {
      if (!result[t.lang_code]) {
        result[t.lang_code] = {}
      }
      if (!result[t.lang_code][t.namespace]) {
        result[t.lang_code][t.namespace] = {}
      }
      result[t.lang_code][t.namespace][t.key] = t.value
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Unexpected error in exportTranslations:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Import translations from JSON
 */
export async function importTranslations(
  jsonData: Record<string, any>,
  options?: {
    overwrite?: boolean
    namespace?: string
  }
): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()
    const overwrite = options?.overwrite ?? false
    let created = 0
    let updated = 0
    let skipped = 0

    // Process each language
    for (const [langCode, namespaces] of Object.entries(jsonData)) {
      if (!locales.includes(langCode as Locale)) {
        skipped++
        continue
      }

      // Process each namespace
      for (const [namespace, keys] of Object.entries(namespaces as Record<string, any>)) {
        // If a specific namespace is provided, skip others
        if (options?.namespace && namespace !== options.namespace) {
          continue
        }

        // Process each key
        for (const [key, value] of Object.entries(keys as Record<string, string>)) {
          // Check if translation exists
          const { data: existing } = await supabase
            .from('translations')
            .select('id')
            .eq('lang_code', langCode)
            .eq('namespace', namespace)
            .eq('key', key)
            .single()

          if (existing) {
            if (overwrite) {
              // Update existing
              const { error } = await supabase
                .from('translations')
                .update({
                  value,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

              if (error) {
                console.error('Error updating translation:', error)
                skipped++
              } else {
                updated++
              }
            } else {
              skipped++
            }
          } else {
            // Create new
            const { error } = await supabase.from('translations').insert({
              lang_code: langCode,
              namespace,
              key,
              value,
              is_active: true,
              is_system: false,
            })

            if (error) {
              console.error('Error creating translation:', error)
              skipped++
            } else {
              created++
            }
          }
        }
      }
    }

    return {
      success: true,
      data: { created, updated, skipped },
      message: `Imported: ${created} created, ${updated} updated, ${skipped} skipped`,
    }
  } catch (error) {
    console.error('Unexpected error in importTranslations:', error)
    return { success: false, error: ERROR_MESSAGES.IMPORT_FAILED }
  }
}

/**
 * Get all unique namespaces
 */
export async function getNamespaces(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from('translations').select('namespace')

    if (error) {
      console.error('Error fetching namespaces:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    const namespaces = [...new Set(data?.map((t) => t.namespace) || [])]

    return { success: true, data: namespaces.sort() }
  } catch (error) {
    console.error('Unexpected error in getNamespaces:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
