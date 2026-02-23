'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface SiteModule {
  id: string
  name: string
  slug: string
  title: string
  description: string | null
  version: string
  author: string | null
  homepage: string | null
  module_type: 'module' | 'widget' | 'addon' | 'layout' | 'theme'
  category: string | null
  icon: string | null
  screenshot_url: string | null
  config: {
    dependencies?: string[]
    settings?: Record<string, any>
  }
  is_enabled: boolean
  is_system: boolean
  is_installed: boolean
  install_count: number
  rating: number
  created_at: string
  updated_at: string
  installed_at: string
}

export interface ModuleInput {
  name: string
  slug: string
  title: string
  description?: string
  version?: string
  author?: string
  homepage?: string
  module_type?: 'module' | 'widget' | 'addon' | 'layout' | 'theme'
  category?: string
  icon?: string
  screenshot_url?: string
  config?: {
    dependencies?: string[]
    settings?: Record<string, any>
  }
  is_enabled?: boolean
  is_system?: boolean
}

export interface ModuleUpdate extends Partial<ModuleInput> {
  name?: string
  slug?: string
  title?: string
}

export interface GetModulesResponse {
  success: boolean
  data?: SiteModule[]
  error?: string
}

export interface GetModuleResponse {
  success: boolean
  data?: SiteModule
  error?: string
}

export interface CreateModuleResponse {
  success: boolean
  data?: SiteModule
  error?: string
}

export interface UpdateModuleResponse {
  success: boolean
  data?: SiteModule
  error?: string
}

export interface DeleteModuleResponse {
  success: boolean
  error?: string
}

export interface ToggleModuleResponse {
  success: boolean
  data?: SiteModule
  error?: string
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get all modules (enabled by default)
 */
export async function getModules(includeDisabled = false): Promise<GetModulesResponse> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('site_modules')
      .select('*')
      .eq('is_installed', true)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true })

    if (!includeDisabled) {
      query = query.eq('is_enabled', true)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: data as SiteModule[] }
  } catch (error) {
    console.error('Get modules error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get modules'
    }
  }
}

/**
 * Get a single module by ID
 */
export async function getModule(moduleId: string): Promise<GetModuleResponse> {
  try {
    if (!moduleId) {
      return { success: false, error: 'Module ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_modules')
      .select('*')
      .eq('id', moduleId)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as SiteModule }
  } catch (error) {
    console.error('Get module error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get module'
    }
  }
}

/**
 * Get a module by slug
 */
export async function getModuleBySlug(slug: string): Promise<GetModuleResponse> {
  try {
    if (!slug) {
      return { success: false, error: 'Slug is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_modules')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: data as SiteModule }
  } catch (error) {
    console.error('Get module by slug error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get module'
    }
  }
}

/**
 * Create a new module entry
 */
export async function createModule(input: ModuleInput): Promise<CreateModuleResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Validate input
    if (!input.name || !input.slug || !input.title) {
      return { success: false, error: 'Name, slug, and title are required' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9_-]+$/
    if (!slugRegex.test(input.slug)) {
      return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' }
    }

    // Check if slug already exists
    const { data: existingModule } = await supabase
      .from('site_modules')
      .select('id')
      .eq('slug', input.slug)
      .single()

    if (existingModule) {
      return { success: false, error: 'Slug already exists' }
    }

    // Create module
    const moduleData = {
      name: input.name,
      slug: input.slug,
      title: input.title,
      description: input.description || null,
      version: input.version || '1.0.0',
      author: input.author || null,
      homepage: input.homepage || null,
      module_type: input.module_type || 'module',
      category: input.category || null,
      icon: input.icon || null,
      screenshot_url: input.screenshot_url || null,
      config: input.config || { dependencies: [], settings: {} },
      is_enabled: input.is_enabled !== undefined ? input.is_enabled : true,
      is_system: input.is_system || false,
      is_installed: true
    }

    const { data, error } = await supabase
      .from('site_modules')
      .insert(moduleData)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/modules')

    return { success: true, data: data as SiteModule }
  } catch (error) {
    console.error('Create module error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create module'
    }
  }
}

/**
 * Update an existing module
 */
export async function updateModule(moduleId: string, input: ModuleUpdate): Promise<UpdateModuleResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Validate module exists
    const { data: existingModule } = await supabase
      .from('site_modules')
      .select('id, is_system')
      .eq('id', moduleId)
      .single()

    if (!existingModule) {
      return { success: false, error: 'Module not found' }
    }

    // Prevent modifying system modules' critical fields
    if (existingModule.is_system) {
      if (input.slug || input.is_system !== undefined) {
        return { success: false, error: 'Cannot modify system module fields' }
      }
    }

    // Validate slug format if provided
    if (input.slug) {
      const slugRegex = /^[a-z0-9_-]+$/
      if (!slugRegex.test(input.slug)) {
        return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' }
      }

      // Check if new slug already exists
      const { data: slugModule } = await supabase
        .from('site_modules')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', moduleId)
        .single()

      if (slugModule) {
        return { success: false, error: 'Slug already exists' }
      }
    }

    // Build update data
    const updateData: any = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.version !== undefined) updateData.version = input.version
    if (input.author !== undefined) updateData.author = input.author
    if (input.homepage !== undefined) updateData.homepage = input.homepage
    if (input.module_type !== undefined) updateData.module_type = input.module_type
    if (input.category !== undefined) updateData.category = input.category
    if (input.icon !== undefined) updateData.icon = input.icon
    if (input.screenshot_url !== undefined) updateData.screenshot_url = input.screenshot_url
    if (input.config !== undefined) updateData.config = input.config
    if (input.is_enabled !== undefined) updateData.is_enabled = input.is_enabled

    // Update module
    const { data, error } = await supabase
      .from('site_modules')
      .update(updateData)
      .eq('id', moduleId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/modules')

    return { success: true, data: data as SiteModule }
  } catch (error) {
    console.error('Update module error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update module'
    }
  }
}

/**
 * Delete a module (uninstall)
 */
export async function deleteModule(moduleId: string): Promise<DeleteModuleResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Check if module exists and is not a system module
    const { data: existingModule } = await supabase
      .from('site_modules')
      .select('id, is_system, slug')
      .eq('id', moduleId)
      .single()

    if (!existingModule) {
      return { success: false, error: 'Module not found' }
    }

    if (existingModule.is_system) {
      return { success: false, error: 'Cannot delete system modules' }
    }

    // Delete module
    const { error } = await supabase
      .from('site_modules')
      .delete()
      .eq('id', moduleId)

    if (error) {
      throw error
    }

    revalidatePath('/admin/modules')

    return { success: true }
  } catch (error) {
    console.error('Delete module error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete module'
    }
  }
}

/**
 * Toggle module enabled/disabled state
 */
export async function toggleModule(moduleId: string): Promise<ToggleModuleResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }

    // Get current module state
    const { data: existingModule } = await supabase
      .from('site_modules')
      .select('id, is_enabled, is_system')
      .eq('id', moduleId)
      .single()

    if (!existingModule) {
      return { success: false, error: 'Module not found' }
    }

    // Toggle enabled state
    const newEnabledState = !existingModule.is_enabled

    // Prevent disabling system modules
    if (existingModule.is_system && !newEnabledState) {
      return { success: false, error: 'Cannot disable system modules' }
    }

    // Update module
    const { data, error } = await supabase
      .from('site_modules')
      .update({ is_enabled: newEnabledState })
      .eq('id', moduleId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/admin/modules')

    return { success: true, data: data as SiteModule }
  } catch (error) {
    console.error('Toggle module error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle module'
    }
  }
}

/**
 * Get module statistics
 */
export async function getModuleStats() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_modules')
      .select('is_enabled, is_system, module_type')

    if (error) {
      throw error
    }

    const modules = data || []

    return {
      success: true,
      data: {
        total: modules.length,
        enabled: modules.filter((m) => m.is_enabled).length,
        disabled: modules.filter((m) => !m.is_enabled).length,
        system: modules.filter((m) => m.is_system).length,
        addons: modules.filter((m) => !m.is_system).length,
        byType: {
          module: modules.filter((m) => m.module_type === 'module').length,
          widget: modules.filter((m) => m.module_type === 'widget').length,
          addon: modules.filter((m) => m.module_type === 'addon').length,
          layout: modules.filter((m) => m.module_type === 'layout').length,
          theme: modules.filter((m) => m.module_type === 'theme').length
        }
      }
    }
  } catch (error) {
    console.error('Get module stats error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get module statistics'
    }
  }
}
