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
    const { title, slug, content, status } = body

    // Validation
    if (!title || title.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Title must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!slug || slug.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Check if page exists
    const { data: existingPage } = await adminSupabase
      .from('pages')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }

    // Check if another page with the same slug exists
    const { data: duplicatePage } = await adminSupabase
      .from('pages')
      .select('id')
      .ilike('slug', slug.trim())
      .neq('id', id)
      .single()

    if (duplicatePage) {
      return NextResponse.json(
        { success: false, error: 'Page with this slug already exists' },
        { status: 409 }
      )
    }

    // Update page using admin client (bypasses RLS)
    const { data: updatedPage, error: updateError } = await adminSupabase
      .from('pages')
      .update({
        title: title.trim(),
        slug: slug.trim(),
        content: content?.trim() || '',
        status: status || 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Page update error:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update page' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Page updated successfully',
      page: updatedPage,
    })
  } catch (error) {
    console.error('Page update error:', error)
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

    // Check if page exists
    const { data: existingPage } = await adminSupabase
      .from('pages')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }

    // Delete page using admin client (bypasses RLS)
    const { error: deleteError } = await adminSupabase
      .from('pages')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Page delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message || 'Failed to delete page' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully',
    })
  } catch (error) {
    console.error('Page delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
