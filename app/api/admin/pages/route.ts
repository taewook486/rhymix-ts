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
    const { title, slug, content, status = 'draft' } = body

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

    // Check if slug already exists
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .ilike('slug', slug.trim())
      .single()

    if (existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page with this slug already exists' },
        { status: 409 }
      )
    }

    // Try to insert into pages table
    const { data: newPage, error: insertError } = await supabase
      .from('pages')
      .insert({
        title: title.trim(),
        slug: slug.trim(),
        content: content?.trim() || '',
        status,
        author_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Page creation error:', insertError)

      // Check if table doesn't exist
      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            success: false,
            error: 'Pages table not found. Please run database migrations first.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: insertError.message || 'Failed to create page' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Page created successfully',
      page: newPage,
    })
  } catch (error) {
    console.error('Page creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
