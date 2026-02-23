'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface Page {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  author_id: string
  view_count: number
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  layout: string
  is_homepage: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  author?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    email: string
  }
}

export interface PageInput {
  title: string
  slug: string
  content: string
  status?: 'draft' | 'published'
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  layout?: string
  is_homepage?: boolean
}

export interface PageUpdate extends Partial<PageInput> {
  title?: string
  slug?: string
  content?: string
}

export interface CreatePageResponse {
  success: boolean
  data?: Page
  error?: string
}

export interface UpdatePageResponse {
  success: boolean
  data?: Page
  error?: string
}

export interface DeletePageResponse {
  success: boolean
  error?: string
}

export interface GetPagesResponse {
  success: boolean
  data?: Page[]
  error?: string
}

export interface GetPageResponse {
  success: boolean
  data?: Page
  error?: string
}

export interface IncrementViewCountResponse {
  success: boolean
  view_count?: number
  error?: string
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get all pages (with optional filters)
 */
export async function getPages(
  status?: 'draft' | 'published',
  authorId?: string
): Promise<GetPagesResponse> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('pages')
      .select(`
        *,
        author:profiles(id, display_name, avatar_url, email)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (authorId) {
      query = query.eq('author_id', authorId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Transform author from array to object
    const pages: Page[] = (data || []).map((item: any) => ({
      ...item,
      author: item.author?.[0] || null
    }))

    return { success: true, data: pages }
  } catch (error) {
    console.error('Get pages error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pages'
    }
  }
}

/**
 * Get a single page by ID
 */
export async function getPage(pageId: string): Promise<GetPageResponse> {
  try {
    if (!pageId) {
      return { success: false, error: 'Page ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        author:profiles(id, display_name, avatar_url, email)
      `)
      .eq('id', pageId)
      .single()

    if (error) {
      throw error
    }

    const page: Page = {
      ...data as any,
      author: (data as any).author?.[0] || null
    }

    return { success: true, data: page }
  } catch (error) {
    console.error('Get page error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get page'
    }
  }
}

/**
 * Get a page by slug
 */
export async function getPageBySlug(slug: string): Promise<GetPageResponse> {
  try {
    if (!slug) {
      return { success: false, error: 'Slug is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        author:profiles(id, display_name, avatar_url, email)
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      throw error
    }

    const page: Page = {
      ...data as any,
      author: (data as any).author?.[0] || null
    }

    return { success: true, data: page }
  } catch (error) {
    console.error('Get page by slug error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get page'
    }
  }
}

/**
 * Get the homepage
 */
export async function getHomepage(): Promise<GetPageResponse> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        author:profiles(id, display_name, avatar_url, email)
      `)
      .eq('is_homepage', true)
      .eq('status', 'published')
      .single()

    if (error) {
      throw error
    }

    const page: Page = {
      ...data as any,
      author: (data as any).author?.[0] || null
    }

    return { success: true, data: page }
  } catch (error) {
    console.error('Get homepage error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get homepage'
    }
  }
}

/**
 * Create a new page
 */
export async function createPage(input: PageInput): Promise<CreatePageResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Validate input
    if (!input.title || !input.slug || !input.content) {
      return { success: false, error: 'Title, slug, and content are required' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9_-]+$/
    if (!slugRegex.test(input.slug)) {
      return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' }
    }

    // Check if slug already exists
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', input.slug)
      .single()

    if (existingPage) {
      return { success: false, error: 'Slug already exists' }
    }

    // If setting as homepage, unset other homepages
    if (input.is_homepage) {
      await supabase
        .from('pages')
        .update({ is_homepage: false })
        .eq('is_homepage', true)
    }

    // Create page
    const pageData = {
      title: input.title,
      slug: input.slug,
      content: input.content,
      status: input.status || 'draft',
      meta_title: input.meta_title || null,
      meta_description: input.meta_description || null,
      meta_keywords: input.meta_keywords || null,
      layout: input.layout || 'default',
      is_homepage: input.is_homepage || false,
      author_id: user.data.user.id,
      published_at: input.status === 'published' ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from('pages')
      .insert(pageData)
      .select(`
        *,
        author:profiles(id, display_name, avatar_url, email)
      `)
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/')
    revalidatePath('/admin/pages')

    const page: Page = {
      ...data as any,
      author: (data as any).author?.[0] || null
    }

    return { success: true, data: page }
  } catch (error) {
    console.error('Create page error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create page'
    }
  }
}

/**
 * Update an existing page
 */
export async function updatePage(pageId: string, input: PageUpdate): Promise<UpdatePageResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Validate page exists and user is the author or admin
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id, author_id, status, slug')
      .eq('id', pageId)
      .single()

    if (!existingPage) {
      return { success: false, error: 'Page not found' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isAuthor = existingPage.author_id === user.data.user.id

    if (!isAdmin && !isAuthor) {
      return { success: false, error: 'Forbidden: You can only edit your own pages' }
    }

    // Validate slug format if provided
    if (input.slug) {
      const slugRegex = /^[a-z0-9_-]+$/
      if (!slugRegex.test(input.slug)) {
        return { success: false, error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' }
      }

      // Check if new slug already exists
      const { data: slugPage } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', pageId)
        .single()

      if (slugPage) {
        return { success: false, error: 'Slug already exists' }
      }
    }

    // If setting as homepage, unset other homepages
    if (input.is_homepage) {
      await supabase
        .from('pages')
        .update({ is_homepage: false })
        .eq('is_homepage', true)
    }

    // Build update data
    const updateData: any = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.content !== undefined) updateData.content = input.content
    if (input.status !== undefined) {
      updateData.status = input.status
      // Set published_at if changing to published for the first time
      if (input.status === 'published' && existingPage.status !== 'published') {
        updateData.published_at = new Date().toISOString()
      }
    }
    if (input.meta_title !== undefined) updateData.meta_title = input.meta_title
    if (input.meta_description !== undefined) updateData.meta_description = input.meta_description
    if (input.meta_keywords !== undefined) updateData.meta_keywords = input.meta_keywords
    if (input.layout !== undefined) updateData.layout = input.layout
    if (input.is_homepage !== undefined) updateData.is_homepage = input.is_homepage

    // Update page
    const { data, error } = await supabase
      .from('pages')
      .update(updateData)
      .eq('id', pageId)
      .select(`
        *,
        author:profiles(id, display_name, avatar_url, email)
      `)
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/')
    revalidatePath('/admin/pages')
    revalidatePath(`/pages/${existingPage.slug}`)

    const page: Page = {
      ...data as any,
      author: (data as any).author?.[0] || null
    }

    return { success: true, data: page }
  } catch (error) {
    console.error('Update page error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update page'
    }
  }
}

/**
 * Delete a page
 */
export async function deletePage(pageId: string): Promise<DeletePageResponse> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Validate page exists and user is the author or admin
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id, author_id, slug')
      .eq('id', pageId)
      .single()

    if (!existingPage) {
      return { success: false, error: 'Page not found' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.data.user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isAuthor = existingPage.author_id === user.data.user.id

    if (!isAdmin && !isAuthor) {
      return { success: false, error: 'Forbidden: You can only delete your own pages' }
    }

    // Delete page
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageId)

    if (error) {
      throw error
    }

    revalidatePath('/')
    revalidatePath('/admin/pages')
    revalidatePath(`/pages/${existingPage.slug}`)

    return { success: true }
  } catch (error) {
    console.error('Delete page error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete page'
    }
  }
}

/**
 * Increment page view count
 */
export async function incrementPageViewCount(pageId: string): Promise<IncrementViewCountResponse> {
  try {
    if (!pageId) {
      return { success: false, error: 'Page ID is required' }
    }

    const supabase = await createClient()

    // Call the database function to increment view count
    const { data, error } = await supabase
      .rpc('increment_page_view_count', { page_id: pageId })

    if (error) {
      throw error
    }

    return { success: true, view_count: data }
  } catch (error) {
    console.error('Increment page view count error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to increment view count'
    }
  }
}

/**
 * Get pages by author
 */
export async function getPagesByAuthor(authorId: string): Promise<GetPagesResponse> {
  return getPages(undefined, authorId)
}

/**
 * Get published pages (for public view)
 */
export async function getPublishedPages(): Promise<GetPagesResponse> {
  return getPages('published')
}
