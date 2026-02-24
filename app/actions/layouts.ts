'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Layout, LayoutColumn, LayoutWidget, AvailableWidget } from '@/types/layout'

// =====================================================
// Layout CRUD Operations
// =====================================================

/**
 * Get all layouts
 */
export async function getLayouts(): Promise<Layout[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Failed to get layouts:', error)
    return []
  }
}

/**
 * Get layout by ID
 */
export async function getLayoutById(layoutId: string): Promise<Layout | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('id', layoutId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Failed to get layout:', error)
    return null
  }
}

/**
 * Get layout with widgets and columns
 */
export async function getLayoutDetail(layoutId: string) {
  try {
    const supabase = await createClient()

    // Get layout
    const { data: layout, error: layoutError } = await supabase
      .from('layouts')
      .select('*')
      .eq('id', layoutId)
      .single()

    if (layoutError) throw layoutError

    // Get columns
    const { data: columns, error: columnsError } = await supabase
      .from('layout_columns')
      .select('*')
      .eq('layout_id', layoutId)
      .order('column_index', { ascending: true })

    if (columnsError) throw columnsError

    // Get widgets with details
    const { data: widgets, error: widgetsError } = await supabase
      .from('layout_widgets')
      .select(`
        *,
        widget:site_widgets(*)
      `)
      .eq('layout_id', layoutId)
      .order('column_index', { ascending: true })
      .order('row_index', { ascending: true })
      .order('order_index', { ascending: true })

    if (widgetsError) throw widgetsError

    return {
      layout,
      columns: columns || [],
      widgets: (widgets || []).map((w: any) => ({
        ...w,
        widget_name: w.widget?.name,
        widget_title: w.widget?.title,
        widget_type: w.widget?.type,
        widget_config: w.widget?.config,
      })),
    }
  } catch (error) {
    console.error('Failed to get layout detail:', error)
    return null
  }
}

/**
 * Create new layout
 */
export async function createLayout(layout: Partial<Layout>): Promise<{ success: boolean; data?: Layout; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('layouts')
      .insert({
        name: layout.name,
        title: layout.title,
        description: layout.description,
        layout_type: layout.layout_type || 'custom',
        is_default: layout.is_default || false,
        is_active: true,
        config: layout.config || { columns: [], widgets: [] },
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/layouts')
    revalidatePath('/admin/layout')

    return { success: true, data }
  } catch (error: any) {
    console.error('Failed to create layout:', error)
    return { success: false, error: error.message || 'Failed to create layout' }
  }
}

/**
 * Update layout
 */
export async function updateLayout(
  layoutId: string,
  updates: Partial<Layout>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('layouts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', layoutId)

    if (error) throw error

    revalidatePath('/admin/layouts')
    revalidatePath('/admin/layout')
    revalidatePath(`/admin/layout/${layoutId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Failed to update layout:', error)
    return { success: false, error: error.message || 'Failed to update layout' }
  }
}

/**
 * Delete layout (soft delete)
 */
export async function deleteLayout(layoutId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('layouts')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', layoutId)

    if (error) throw error

    revalidatePath('/admin/layouts')
    revalidatePath('/admin/layout')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete layout:', error)
    return { success: false, error: error.message || 'Failed to delete layout' }
  }
}

// =====================================================
// Layout Widget Operations
// =====================================================

/**
 * Add widget to layout
 */
export async function addWidgetToLayout(
  layoutId: string,
  widget: {
    widget_id: string
    column_index: number
    row_index: number
    order_index: number
    width_fraction?: number
    config?: Record<string, any>
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('layout_widgets').insert({
      layout_id: layoutId,
      widget_id: widget.widget_id,
      column_index: widget.column_index,
      row_index: widget.row_index,
      order_index: widget.order_index,
      width_fraction: widget.width_fraction || 1.0,
      config: widget.config || {},
    })

    if (error) throw error

    revalidatePath('/admin/layouts')
    revalidatePath(`/admin/layout/${layoutId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Failed to add widget to layout:', error)
    return { success: false, error: error.message || 'Failed to add widget' }
  }
}

/**
 * Update layout widget
 */
export async function updateLayoutWidget(
  widgetId: string,
  updates: Partial<LayoutWidget>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('layout_widgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', widgetId)

    if (error) throw error

    revalidatePath('/admin/layouts')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to update layout widget:', error)
    return { success: false, error: error.message || 'Failed to update widget' }
  }
}

/**
 * Remove widget from layout
 */
export async function removeWidgetFromLayout(
  widgetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('layout_widgets')
      .delete()
      .eq('id', widgetId)

    if (error) throw error

    revalidatePath('/admin/layouts')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to remove widget from layout:', error)
    return { success: false, error: error.message || 'Failed to remove widget' }
  }
}

/**
 * Reorder widgets in layout
 */
export async function reorderLayoutWidgets(
  layoutId: string,
  widgets: Array<{
    id: string
    column_index: number
    row_index: number
    order_index: number
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Update all widgets in a single transaction
    for (const widget of widgets) {
      const { error } = await supabase
        .from('layout_widgets')
        .update({
          column_index: widget.column_index,
          row_index: widget.row_index,
          order_index: widget.order_index,
        })
        .eq('id', widget.id)

      if (error) throw error
    }

    revalidatePath('/admin/layouts')
    revalidatePath(`/admin/layout/${layoutId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Failed to reorder widgets:', error)
    return { success: false, error: error.message || 'Failed to reorder widgets' }
  }
}

// =====================================================
// Layout Column Operations
// =====================================================

/**
 * Add column to layout
 */
export async function addLayoutColumn(
  layoutId: string,
  column: {
    column_index: number
    width_fraction: number
    css_class?: string
    inline_style?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('layout_columns').insert({
      layout_id: layoutId,
      column_index: column.column_index,
      width_fraction: column.width_fraction,
      css_class: column.css_class,
      inline_style: column.inline_style,
    })

    if (error) throw error

    revalidatePath('/admin/layouts')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to add layout column:', error)
    return { success: false, error: error.message || 'Failed to add column' }
  }
}

/**
 * Update layout column
 */
export async function updateLayoutColumn(
  columnId: string,
  updates: {
    width_fraction?: number
    css_class?: string
    inline_style?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('layout_columns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', columnId)

    if (error) throw error

    revalidatePath('/admin/layouts')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to update layout column:', error)
    return { success: false, error: error.message || 'Failed to update column' }
  }
}

/**
 * Remove column from layout
 */
export async function removeLayoutColumn(
  columnId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('layout_columns')
      .delete()
      .eq('id', columnId)

    if (error) throw error

    revalidatePath('/admin/layouts')

    return { success: true }
  } catch (error: any) {
    console.error('Failed to remove layout column:', error)
    return { success: false, error: error.message || 'Failed to remove column' }
  }
}

// =====================================================
// Available Widgets
// =====================================================

/**
 * Get available widgets for layout builder
 */
export async function getAvailableWidgets(): Promise<AvailableWidget[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_widgets')
      .select('id, name, title, description, type')
      .eq('is_active', true)
      .order('title', { ascending: true })

    if (error) throw error

    return (
      data?.map((widget) => ({
        id: widget.id,
        name: widget.name,
        title: widget.title,
        description: widget.description,
        type: widget.type,
      })) || []
    )
  } catch (error) {
    console.error('Failed to get available widgets:', error)
    return []
  }
}

// =====================================================
// Layout Preview
// =====================================================

/**
 * Render layout for preview
 */
export async function renderLayout(layoutId: string) {
  try {
    const layoutDetail = await getLayoutDetail(layoutId)

    if (!layoutDetail) {
      return null
    }

    return layoutDetail
  } catch (error) {
    console.error('Failed to render layout:', error)
    return null
  }
}
