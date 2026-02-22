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
    const { name, description } = body

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Group name must be at least 2 characters' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Check if group exists
    const { data: existingGroup } = await adminSupabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if another group with the same name exists
    const { data: duplicateGroup } = await adminSupabase
      .from('groups')
      .select('id')
      .ilike('name', name.trim())
      .neq('id', id)
      .single()

    if (duplicateGroup) {
      return NextResponse.json(
        { success: false, error: 'Group with this name already exists' },
        { status: 409 }
      )
    }

    // Update group using admin client (bypasses RLS)
    const { data: updatedGroup, error: updateError } = await adminSupabase
      .from('groups')
      .update({
        name: name.trim(),
        description: description?.trim() || '',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Group update error:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Group updated successfully',
      group: updatedGroup,
    })
  } catch (error) {
    console.error('Group update error:', error)
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

    // Check if group exists
    const { data: existingGroup } = await adminSupabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Delete group using admin client (bypasses RLS)
    const { error: deleteError } = await adminSupabase
      .from('groups')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Group delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message || 'Failed to delete group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully',
    })
  } catch (error) {
    console.error('Group delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
