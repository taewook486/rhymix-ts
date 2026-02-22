'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface MenuConfig {
  type: 'normal' | 'dropdown' | 'mega'
  max_depth: number
  expandable: boolean
  show_title: boolean
}

export interface Menu {
  id: string
  name: string
  title: string
  location: 'header' | 'footer' | 'sidebar' | 'top' | 'bottom'
  description: string | null
  config: MenuConfig
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  menu_id: string
  parent_id: string | null
  title: string
  url: string
  type: 'link' | 'divider' | 'header' | 'action' | 'custom'
  icon: string
  badge: string
  target: '_self' | '_blank' | '_parent' | '_top'
  rel: string
  css_class: string
  style: string
  depth: number
  path: string
  order_index: number
  is_active: boolean
  is_visible: boolean
  is_new_window: boolean
  is_nofollow: boolean
  required_role: 'all' | 'member' | 'admin'
  config: Record<string, any>
  created_at: string
  updated_at: string
}

// =====================================================
// Server Actions
// =====================================================

export async function getMenus(): Promise<{
  success: boolean
  data?: Menu[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) throw error
    return { success: true, data: data as Menu[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get menus' }
  }
}

export async function getMenuItems(menuId: string): Promise<{
  success: boolean
  data?: MenuItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return { success: true, data: data as MenuItem[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get menu items' }
  }
}

export async function createMenu(input: { name: string; title: string; location: string }): Promise<{
  success: boolean
  data?: Menu
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('menus')
      .insert({
        name: input.name,
        title: input.title,
        location: input.location,
        is_active: true,
        order_index: 0
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/menus')
    return { success: true, data: data as Menu }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create menu' }
  }
}

export async function updateMenu(menuId: string, input: { name?: string; title?: string; location?: string; is_active?: boolean }): Promise<{
  success: boolean
  data?: Menu
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('menus')
      .update(input)
      .eq('id', menuId)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/menus')
    return { success: true, data: data as Menu }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update menu' }
  }
}

export async function deleteMenu(menuId: string): Promise<{
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
      .from('menus')
      .delete()
      .eq('id', menuId)

    if (error) throw error
    revalidatePath('/admin/menus')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete menu' }
  }
}

export async function deleteMenuItem(menuItemId: string): Promise<{
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
      .from('menu_items')
      .delete()
      .eq('id', menuItemId)

    if (error) throw error
    revalidatePath('/admin/menus')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete menu item' }
  }
}

export async function createMenuItem(input: {
  menuId: string
  title: string
  url: string
  type: 'link' | 'divider' | 'header' | 'action' | 'custom'
  parentId?: string
  orderIndex?: number
}): Promise<{
  success: boolean
  data?: MenuItem
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        menu_id: input.menuId,
        parent_id: input.parentId || null,
        title: input.title,
        url: input.url,
        type: input.type,
        order_index: input.orderIndex || 0,
        is_active: true,
        is_visible: true,
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/menus')
    return { success: true, data: data as MenuItem }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create menu item' }
  }
}

export async function updateMenuItem(
  menuItemId: string,
  input: {
    title?: string
    url?: string
    type?: 'link' | 'divider' | 'header' | 'action' | 'custom'
    icon?: string
    badge?: string
    target?: '_self' | '_blank' | '_parent' | '_top'
    is_active?: boolean
    is_visible?: boolean
    required_role?: 'all' | 'member' | 'admin'
    config?: Record<string, any>
  }
): Promise<{
  success: boolean
  data?: MenuItem
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('menu_items')
      .update(input)
      .eq('id', menuItemId)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/menus')
    return { success: true, data: data as MenuItem }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update menu item' }
  }
}

export async function reorderMenuItems(menuId: string, updates: Array<{ id: string; order_index: number; parent_id: string | null }>): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Update each menu item's order
    for (const update of updates) {
      const { error } = await supabase
        .from('menu_items')
        .update({ order_index: update.order_index, parent_id: update.parent_id })
        .eq('id', update.id)

      if (error) throw error
    }

    revalidatePath('/admin/menus')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reorder menu items' }
  }
}
