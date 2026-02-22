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
    const { name, description } = body

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Group name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check if groups table exists, if not create it or return an error
    const { data: existingGroup, error: checkError } = await supabase
      .from('groups')
      .select('id')
      .ilike('name', name.trim())
      .single()

    if (!checkError && existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Group with this name already exists' },
        { status: 409 }
      )
    }

    // Try to insert into groups table
    const { data: newGroup, error: insertError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Group creation error:', insertError)

      // Check if table doesn't exist
      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            success: false,
            error: 'Groups table not found. Please run database migrations first.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: insertError.message || 'Failed to create group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      group: newGroup,
    })
  } catch (error) {
    console.error('Group creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
