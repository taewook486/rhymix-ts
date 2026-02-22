'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface SiteWidget {
  id: string
  name: string
  title: string
  type: string
  position: string
  config: Record<string, any>
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface CreateWidgetInput {
  name: string
  title: string
  type: string
  position: string
  config?: Record<string, any>
  is_active?: boolean
  order_index?: number
}

export interface UpdateWidgetInput {
  title?: string
  position?: string
  config?: Record<string, any>
  is_active?: boolean
  order_index?: number
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get all widgets
 */
export async function getWidgets(): Promise<{
  success: boolean
  data?: SiteWidget[]
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_widgets')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) throw error

    return { success: true, data: data as SiteWidget[] }
  } catch (error) {
    console.error('Get widgets error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get widgets'
    }
  }
}

/**
 * Get widgets by position
 */
export async function getWidgetsByPosition(position: string): Promise<{
  success: boolean
  data?: SiteWidget[]
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_widgets')
      .select('*')
      .eq('position', position)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error

    return { success: true, data: data as SiteWidget[] }
  } catch (error) {
    console.error('Get widgets by position error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get widgets'
    }
  }
}

/**
 * Create a new widget
 */
export async function createWidget(input: CreateWidgetInput): Promise<{
  success: boolean
  data?: SiteWidget
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_widgets')
      .insert({
        name: input.name,
        title: input.title,
        type: input.type,
        position: input.position,
        config: input.config || {},
        is_active: input.is_active ?? true,
        order_index: input.order_index || 0,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/widgets')
    return { success: true, data: data as SiteWidget }
  } catch (error) {
    console.error('Create widget error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create widget'
    }
  }
}

/**
 * Update a widget
 */
export async function updateWidget(
  widgetId: string,
  input: UpdateWidgetInput
): Promise<{
  success: boolean
  data?: SiteWidget
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_widgets')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', widgetId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/widgets')
    return { success: true, data: data as SiteWidget }
  } catch (error) {
    console.error('Update widget error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update widget'
    }
  }
}

/**
 * Delete a widget
 */
export async function deleteWidget(widgetId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('site_widgets')
      .delete()
      .eq('id', widgetId)

    if (error) throw error

    revalidatePath('/admin/widgets')
    return { success: true }
  } catch (error) {
    console.error('Delete widget error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete widget'
    }
  }
}

/**
 * Reorder widgets in a position
 */
export async function reorderWidgets(
  position: string,
  widgetIds: string[]
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Update order_index for each widget
    const updates = widgetIds.map((id, index) =>
      supabase
        .from('site_widgets')
        .update({ order_index: index })
        .eq('id', id)
    )

    await Promise.all(updates)

    revalidatePath('/admin/widgets')
    return { success: true }
  } catch (error) {
    console.error('Reorder widgets error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder widgets'
    }
  }
}
