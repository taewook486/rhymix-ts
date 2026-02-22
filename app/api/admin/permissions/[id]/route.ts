import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin only' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, module, group_ids } = body

    // Separate system groups and custom groups
    const systemGroupIds = Array.isArray(group_ids)
      ? group_ids.filter((id: string) => id.startsWith('system_'))
      : []
    const customGroupIds = Array.isArray(group_ids)
      ? group_ids.filter((id: string) => !id.startsWith('system_'))
      : []

    // Validation
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Permission name must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!module) {
      return NextResponse.json(
        { success: false, error: 'Module is required' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Check if permission exists
    const { data: existingPermission } = await adminSupabase
      .from('permissions')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission not found' },
        { status: 404 }
      )
    }

    // Check if another permission with the same name exists
    const { data: duplicatePermission } = await adminSupabase
      .from('permissions')
      .select('id')
      .ilike('name', name.trim())
      .neq('id', id)
      .single()

    if (duplicatePermission) {
      return NextResponse.json(
        { success: false, error: 'Permission with this name already exists' },
        { status: 409 }
      )
    }

    // Update permission using admin client (bypasses RLS)
    const { data: updatedPermission, error: updateError } = await adminSupabase
      .from('permissions')
      .update({
        name: name.trim(),
        description: description?.trim() || '',
        module,
        system_groups: systemGroupIds, // Store system groups separately
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Permission update error:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update permission' },
        { status: 500 }
      )
    }

    // Handle group permissions for custom groups
    if (customGroupIds.length > 0 || Array.isArray(group_ids)) {
      // Delete existing group_permissions for this permission
      const { error: deleteError } = await adminSupabase
        .from('group_permissions')
        .delete()
        .eq('permission_id', id)

      if (deleteError) {
        console.error('Group permissions delete error:', deleteError)
        // Non-fatal error, continue with insert
      }

      // Insert new group_permissions for custom groups only
      if (customGroupIds.length > 0) {
        const groupPermissionEntries = customGroupIds.map((groupId: string) => ({
          group_id: groupId,
          permission_id: id,
        }))

        const { error: insertError } = await adminSupabase
          .from('group_permissions')
          .insert(groupPermissionEntries)

        if (insertError) {
          console.error('Group permissions insert error:', insertError)
          // Non-fatal error, permission was updated successfully
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Permission updated successfully',
      permission: updatedPermission,
    })
  } catch (error) {
    console.error('Permission update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin only' },
        { status: 403 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Check if permission exists
    const { data: existingPermission } = await adminSupabase
      .from('permissions')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission not found' },
        { status: 404 }
      )
    }

    // Delete associated group_permissions first ( CASCADE should handle this automatically, but explicit delete is safer)
    const { error: groupPermDeleteError } = await adminSupabase
      .from('group_permissions')
      .delete()
      .eq('permission_id', id)

    if (groupPermDeleteError) {
      console.error('Group permissions delete error:', groupPermDeleteError)
      // Non-fatal error, continue with permission delete
    }

    // Delete permission using admin client (bypasses RLS)
    const { error: deleteError } = await adminSupabase
      .from('permissions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Permission delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message || 'Failed to delete permission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Permission deleted successfully',
    })
  } catch (error) {
    console.error('Permission delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
