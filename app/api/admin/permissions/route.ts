import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
    const { name, description, module } = body

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

    // Check if permission name already exists
    const { data: existingPermission } = await supabase
      .from('permissions')
      .select('id')
      .ilike('name', name.trim())
      .single()

    if (existingPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission with this name already exists' },
        { status: 409 }
      )
    }

    // Try to insert into permissions table
    const { data: newPermission, error: insertError } = await supabase
      .from('permissions')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        module,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Permission creation error:', insertError)

      // Check if table doesn't exist
      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            success: false,
            error: 'Permissions table not found. Please run database migrations first.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: insertError.message || 'Failed to create permission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Permission created successfully',
      permission: newPermission,
    })
  } catch (error) {
    console.error('Permission creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
