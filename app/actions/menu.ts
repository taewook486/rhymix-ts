'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Menu,
  MenuItem,
  MenuLocation,
  MenuItemType,
  MenuItemTarget,
  MenuItemRequiredRole,
} from '@/lib/supabase/database.types'

// =====================================================
// MENU ACTIONS
// =====================================================

export async function getMenus() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Menu[] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getMenuById(menuId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Menu }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getActiveMenuByLocation(location: MenuLocation) {
  try {
    const supabase = await createClient()

    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('location', location)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (menuError || !menu) {
      return { success: false, error: menuError?.message || 'Menu not found' }
    }

    // Get menu items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', menu.id)
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('order_index', { ascending: true })

    if (itemsError) {
      return { success: false, error: itemsError.message }
    }

    // Build hierarchical structure
    const hierarchicalItems = buildMenuTree(items as MenuItem[])

    return {
      success: true,
      data: {
        ...menu,
        items: hierarchicalItems,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function createMenu(formData: FormData) {
  try {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const title = formData.get('title') as string
    const location = (formData.get('location') as MenuLocation) || 'header'
    const description = formData.get('description') as string | null

    if (!name || !title) {
      return { success: false, error: 'Name and title are required' }
    }

    // Get max order_index
    const { data: existingMenus } = await supabase
      .from('menus')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex =
      existingMenus && existingMenus.length > 0
        ? (existingMenus[0].order_index || 0) + 1
        : 0

    const { data, error } = await supabase
      .from('menus')
      .insert({
        name,
        title,
        location,
        description,
        is_active: true,
        order_index: nextOrderIndex,
        config: {
          type: 'normal',
          max_depth: 3,
          expandable: true,
          show_title: false,
        },
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/menus')
    return { success: true, data: data as Menu }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateMenu(menuId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const title = formData.get('title') as string
    const location = formData.get('location') as MenuLocation
    const description = formData.get('description') as string | null
    const is_active = formData.get('is_active') === 'true'

    if (!name || !title) {
      return { success: false, error: 'Name and title are required' }
    }

    const { data, error } = await supabase
      .from('menus')
      .update({
        name,
        title,
        location,
        description,
        is_active,
      })
      .eq('id', menuId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/menus')
    return { success: true, data: data as Menu }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function deleteMenu(menuId: string) {
  try {
    const supabase = await createClient()

    // Menu items will be cascade deleted
    const { error } = await supabase.from('menus').delete().eq('id', menuId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/menus')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =====================================================
// MENU ITEM ACTIONS
// =====================================================

export async function getMenuItems(menuId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('order_index', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    // Build hierarchical structure
    const hierarchicalItems = buildMenuTree(data as MenuItem[])

    return { success: true, data: hierarchicalItems }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getMenuItem(itemId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as MenuItem }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function createMenuItem(menuId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const title = formData.get('title') as string
    const url = formData.get('url') as string | null
    const type = (formData.get('type') as MenuItemType) || 'link'
    const icon = formData.get('icon') as string | null
    const target = (formData.get('target') as MenuItemTarget) || '_self'
    const required_role =
      (formData.get('required_role') as MenuItemRequiredRole) || 'all'
    const parent_id = (formData.get('parent_id') as string) || null
    const is_active = formData.get('is_active') === 'true'
    const is_visible = formData.get('is_visible') === 'true'
    const is_new_window = formData.get('is_new_window') === 'true'
    const is_nofollow = formData.get('is_nofollow') === 'true'

    if (!title) {
      return { success: false, error: 'Title is required' }
    }

    // Calculate depth and path
    let depth = 0
    let path = ''

    if (parent_id) {
      const { data: parent } = await supabase
        .from('menu_items')
        .select('depth, path')
        .eq('id', parent_id)
        .single()

      if (parent) {
        depth = (parent.depth || 0) + 1
        path = parent.path ? `${parent.path}/${parent_id}` : parent_id
      }
    }

    // Get max order_index for this parent
    const { data: existingItems } = await supabase
      .from('menu_items')
      .select('order_index')
      .eq('menu_id', menuId)
      .eq('parent_id', parent_id || null)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex =
      existingItems && existingItems.length > 0
        ? (existingItems[0].order_index || 0) + 1
        : 0

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        menu_id: menuId,
        parent_id: parent_id || null,
        title,
        url,
        type,
        icon,
        target,
        required_role,
        depth,
        path,
        order_index: nextOrderIndex,
        is_active,
        is_visible,
        is_new_window,
        is_nofollow,
        badge: null,
        rel: null,
        css_class: null,
        style: null,
        config: {},
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/menus')
    return { success: true, data: data as MenuItem }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateMenuItem(itemId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const title = formData.get('title') as string
    const url = formData.get('url') as string | null
    const type = formData.get('type') as MenuItemType
    const icon = formData.get('icon') as string | null
    const target = formData.get('target') as MenuItemTarget
    const required_role = formData.get('required_role') as MenuItemRequiredRole
    const is_active = formData.get('is_active') === 'true'
    const is_visible = formData.get('is_visible') === 'true'
    const is_new_window = formData.get('is_new_window') === 'true'
    const is_nofollow = formData.get('is_nofollow') === 'true'

    if (!title) {
      return { success: false, error: 'Title is required' }
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update({
        title,
        url,
        type,
        icon,
        target,
        required_role,
        is_active,
        is_visible,
        is_new_window,
        is_nofollow,
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/menus')
    return { success: true, data: data as MenuItem }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function deleteMenuItem(itemId: string) {
  try {
    const supabase = await createClient()

    // Children will be cascade deleted
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/menus')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function reorderMenuItems(
  menuId: string,
  items: Array<{ id: string; order_index: number; parent_id: string | null }>
) {
  try {
    const supabase = await createClient()

    // Update each item's order and parent
    for (const item of items) {
      // Calculate new depth and path
      let depth = 0
      let path = ''

      if (item.parent_id) {
        const { data: parent } = await supabase
          .from('menu_items')
          .select('depth, path')
          .eq('id', item.parent_id)
          .single()

        if (parent) {
          depth = (parent.depth || 0) + 1
          path = parent.path ? `${parent.path}/${item.parent_id}` : item.parent_id
        }
      }

      const { error } = await supabase
        .from('menu_items')
        .update({
          order_index: item.order_index,
          parent_id: item.parent_id || null,
          depth,
          path,
        })
        .eq('id', item.id)

      if (error) {
        console.error(`Failed to update item ${item.id}:`, error)
      }
    }

    revalidatePath('/admin/menus')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const itemMap = new Map<string, MenuItem & { children: MenuItem[] }>()
  const rootItems: (MenuItem & { children: MenuItem[] })[] = []

  // First pass: create map with empty children arrays
  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  // Second pass: build tree structure
  items.forEach((item) => {
    const node = itemMap.get(item.id)
    if (!node) return

    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // If parent not found, add to root
        rootItems.push(node)
      }
    } else {
      rootItems.push(node)
    }
  })

  return rootItems
}
