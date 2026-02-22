'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'

// =====================================================
// Search Types
// =====================================================

export type SearchResultType = 'post' | 'comment' | 'document' | 'board'

export interface SearchFilters {
  type?: SearchResultType | SearchResultType[]
  author_id?: string
  board_id?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  excerpt: string
  url: string
  author: string | null
  created_at: string
  relevance?: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  filters: SearchFilters
}

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  QUERY_TOO_SHORT: '검색어는 최소 2자 이상 입력해주세요.',
  QUERY_EMPTY: '검색어를 입력해주세요.',
  SEARCH_FAILED: '검색 중 오류가 발생했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Prepare search query for PostgreSQL full-text search
 * Converts user input to tsquery format
 */
function prepareSearchQuery(query: string): string {
  // Remove special characters that could break tsquery
  const cleaned = query.replace(/[&|!():*<>'"]/g, ' ').trim()

  // Split into terms and join with & (AND operator)
  const terms = cleaned.split(/\s+/).filter((term) => term.length >= 2)

  if (terms.length === 0) {
    return ''
  }

  // Add prefix matching for partial matches (useful for Korean)
  return terms.map((term) => `${term}:*`).join(' & ')
}

/**
 * Prepare search query for trigram similarity search
 * Used as fallback for partial/similar matches
 */
function prepareTrigramQuery(query: string): string {
  return query.replace(/[&|!():*<>'"]/g, ' ').trim()
}

/**
 * Generate URL for search result based on type
 */
function generateResultUrl(type: SearchResultType, id: string, boardId?: string): string {
  switch (type) {
    case 'post':
      return boardId ? `/board/${boardId}/post/${id}` : `/post/${id}`
    case 'comment':
      return `/comment/${id}`
    case 'document':
      return `/document/${id}`
    case 'board':
      return `/board/${id}`
    default:
      return '/'
  }
}

/**
 * Highlight matching terms in excerpt
 */
function highlightExcerpt(excerpt: string, query: string): string {
  if (!excerpt || !query) return excerpt

  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2)
  let highlighted = excerpt

  terms.forEach((term) => {
    // Case-insensitive replacement with mark tag
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi')
    highlighted = highlighted.replace(regex, '<mark>$1</mark>')
  })

  return highlighted
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Truncate text to specified length while preserving word boundaries
 */
function truncateText(text: string, maxLength: number = 200): string {
  if (!text || text.length <= maxLength) return text

  // Try to truncate at word boundary
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

// =====================================================
// Search Actions
// =====================================================

/**
 * Search content across posts, comments, and documents
 * Uses PostgreSQL full-text search with trigram fallback
 */
export async function searchContent(
  query: string,
  filters: SearchFilters = {}
): Promise<ActionResult<SearchResponse>> {
  try {
    // Validate query
    const trimmedQuery = query?.trim()

    if (!trimmedQuery) {
      return { success: false, error: ERROR_MESSAGES.QUERY_EMPTY }
    }

    if (trimmedQuery.length < 2) {
      return { success: false, error: ERROR_MESSAGES.QUERY_TOO_SHORT }
    }

    const supabase = await createClient()
    const { limit = 20, offset = 0, type, author_id, board_id, date_from, date_to } = filters

    // Prepare search queries
    const tsQuery = prepareSearchQuery(trimmedQuery)
    const trigramQuery = prepareTrigramQuery(trimmedQuery)

    // Determine which content types to search
    const searchTypes: SearchResultType[] = type
      ? Array.isArray(type)
        ? type
        : [type]
      : ['post', 'comment', 'document']

    const results: SearchResult[] = []
    let total = 0

    // Search posts
    if (searchTypes.includes('post')) {
      const postResults = await searchPosts(supabase, tsQuery, trigramQuery, {
        author_id,
        board_id,
        date_from,
        date_to,
        limit,
        offset,
      })

      if (postResults.success && postResults.data) {
        results.push(...postResults.data.results)
        total += postResults.data.total
      }
    }

    // Search comments
    if (searchTypes.includes('comment')) {
      const commentResults = await searchComments(supabase, tsQuery, trigramQuery, {
        author_id,
        date_from,
        date_to,
        limit,
        offset,
      })

      if (commentResults.success && commentResults.data) {
        results.push(...commentResults.data.results)
        total += commentResults.data.total
      }
    }

    // Search documents
    if (searchTypes.includes('document')) {
      const documentResults = await searchDocuments(supabase, tsQuery, trigramQuery, {
        author_id,
        date_from,
        date_to,
        limit,
        offset,
      })

      if (documentResults.success && documentResults.data) {
        results.push(...documentResults.data.results)
        total += documentResults.data.total
      }
    }

    // Sort results by relevance and created_at
    results.sort((a, b) => {
      // First by relevance (if available)
      if (a.relevance !== undefined && b.relevance !== undefined) {
        const relevanceDiff = (b.relevance || 0) - (a.relevance || 0)
        if (relevanceDiff !== 0) return relevanceDiff
      }
      // Then by created_at (most recent first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Apply final limit after combining all results
    const paginatedResults = results.slice(0, limit)

    return {
      success: true,
      data: {
        results: paginatedResults,
        total,
        query: trimmedQuery,
        filters,
      },
    }
  } catch (error) {
    console.error('Unexpected error in searchContent:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Search posts with full-text search
 */
async function searchPosts(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tsQuery: string,
  trigramQuery: string,
  options: {
    author_id?: string
    board_id?: string
    date_from?: string
    date_to?: string
    limit: number
    offset: number
  }
): Promise<ActionResult<{ results: SearchResult[]; total: number }>> {
  try {
    const { author_id, board_id, date_from, date_to, limit, offset } = options

    // Build the base query with FTS
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        board_id,
        title,
        content,
        excerpt,
        author_id,
        author_name,
        created_at,
        profiles:author_id (
          display_name
        ),
        boards:board_id (
          slug
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .is('is_blind', false)

    // Apply filters
    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (board_id) {
      query = query.eq('board_id', board_id)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Try full-text search first
    if (tsQuery) {
      query = query.textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      // If FTS fails, try trigram search as fallback
      console.log('FTS failed, trying trigram search:', error.message)
      return await searchPostsTrigram(supabase, trigramQuery, options)
    }

    const results: SearchResult[] = (data || []).map((post: any) => ({
      type: 'post' as SearchResultType,
      id: post.id,
      title: post.title,
      excerpt: highlightExcerpt(
        truncateText(post.excerpt || post.content?.replace(/<[^>]*>/g, '') || ''),
        trigramQuery
      ),
      url: generateResultUrl('post', post.id, post.board_id),
      author: post.author_name || post.profiles?.display_name || null,
      created_at: post.created_at,
    }))

    return { success: true, data: { results, total: count || 0 } }
  } catch (error) {
    console.error('Error in searchPosts:', error)
    return { success: false, error: ERROR_MESSAGES.SEARCH_FAILED }
  }
}

/**
 * Fallback trigram search for posts
 */
async function searchPostsTrigram(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  trigramQuery: string,
  options: {
    author_id?: string
    board_id?: string
    date_from?: string
    date_to?: string
    limit: number
    offset: number
  }
): Promise<ActionResult<{ results: SearchResult[]; total: number }>> {
  try {
    const { author_id, board_id, date_from, date_to, limit, offset } = options

    // Use ILIKE for partial matching as fallback
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        board_id,
        title,
        content,
        excerpt,
        author_id,
        author_name,
        created_at,
        profiles:author_id (
          display_name
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .is('is_blind', false)
      .or(`title.ilike.%${trigramQuery}%,content.ilike.%${trigramQuery}%`)

    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (board_id) {
      query = query.eq('board_id', board_id)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Trigram search failed:', error)
      return { success: true, data: { results: [], total: 0 } }
    }

    const results: SearchResult[] = (data || []).map((post: any) => ({
      type: 'post' as SearchResultType,
      id: post.id,
      title: post.title,
      excerpt: highlightExcerpt(
        truncateText(post.excerpt || post.content?.replace(/<[^>]*>/g, '') || ''),
        trigramQuery
      ),
      url: generateResultUrl('post', post.id, post.board_id),
      author: post.author_name || post.profiles?.display_name || null,
      created_at: post.created_at,
    }))

    return { success: true, data: { results, total: count || 0 } }
  } catch (error) {
    console.error('Error in searchPostsTrigram:', error)
    return { success: true, data: { results: [], total: 0 } }
  }
}

/**
 * Search comments with full-text search
 */
async function searchComments(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tsQuery: string,
  trigramQuery: string,
  options: {
    author_id?: string
    date_from?: string
    date_to?: string
    limit: number
    offset: number
  }
): Promise<ActionResult<{ results: SearchResult[]; total: number }>> {
  try {
    const { author_id, date_from, date_to, limit, offset } = options

    let query = supabase
      .from('comments')
      .select(
        `
        id,
        post_id,
        content,
        author_id,
        author_name,
        created_at,
        posts!inner (
          id,
          title,
          board_id
        ),
        profiles:author_id (
          display_name
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'visible')
      .is('deleted_at', null)
      .is('is_blind', false)

    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Use ILIKE for comment search (comments may not have search_vector)
    if (trigramQuery) {
      query = query.ilike('content', `%${trigramQuery}%`)
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error searching comments:', error)
      return { success: true, data: { results: [], total: 0 } }
    }

    const results: SearchResult[] = (data || []).map((comment: any) => ({
      type: 'comment' as SearchResultType,
      id: comment.id,
      title: comment.posts?.title ? `Re: ${comment.posts.title}` : '댓글',
      excerpt: highlightExcerpt(truncateText(comment.content?.replace(/<[^>]*>/g, '') || ''), trigramQuery),
      url: generateResultUrl('post', comment.post_id, comment.posts?.board_id) + `#comment-${comment.id}`,
      author: comment.author_name || comment.profiles?.display_name || null,
      created_at: comment.created_at,
    }))

    return { success: true, data: { results, total: count || 0 } }
  } catch (error) {
    console.error('Error in searchComments:', error)
    return { success: true, data: { results: [], total: 0 } }
  }
}

/**
 * Search documents with full-text search
 */
async function searchDocuments(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tsQuery: string,
  trigramQuery: string,
  options: {
    author_id?: string
    date_from?: string
    date_to?: string
    limit: number
    offset: number
  }
): Promise<ActionResult<{ results: SearchResult[]; total: number }>> {
  try {
    const { author_id, date_from, date_to, limit, offset } = options

    let query = supabase
      .from('documents')
      .select(
        `
        id,
        title,
        content,
        excerpt,
        author_id,
        created_at,
        profiles:author_id (
          display_name
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null)

    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Try full-text search first
    if (tsQuery) {
      query = query.textSearch('search_vector', tsQuery, {
        type: 'websearch',
        config: 'english',
      })
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      // Fallback to ILIKE search
      console.log('Document FTS failed, using ILIKE:', error.message)
      return await searchDocumentsFallback(supabase, trigramQuery, options)
    }

    const results: SearchResult[] = (data || []).map((doc: any) => ({
      type: 'document' as SearchResultType,
      id: doc.id,
      title: doc.title,
      excerpt: highlightExcerpt(
        truncateText(doc.excerpt || doc.content?.replace(/<[^>]*>/g, '') || ''),
        trigramQuery
      ),
      url: generateResultUrl('document', doc.id),
      author: doc.profiles?.display_name || null,
      created_at: doc.created_at,
    }))

    return { success: true, data: { results, total: count || 0 } }
  } catch (error) {
    console.error('Error in searchDocuments:', error)
    return { success: false, error: ERROR_MESSAGES.SEARCH_FAILED }
  }
}

/**
 * Fallback search for documents using ILIKE
 */
async function searchDocumentsFallback(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  trigramQuery: string,
  options: {
    author_id?: string
    date_from?: string
    date_to?: string
    limit: number
    offset: number
  }
): Promise<ActionResult<{ results: SearchResult[]; total: number }>> {
  try {
    const { author_id, date_from, date_to, limit, offset } = options

    let query = supabase
      .from('documents')
      .select(
        `
        id,
        title,
        content,
        excerpt,
        author_id,
        created_at,
        profiles:author_id (
          display_name
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .or(`title.ilike.%${trigramQuery}%,content.ilike.%${trigramQuery}%`)

    if (author_id) {
      query = query.eq('author_id', author_id)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Document fallback search failed:', error)
      return { success: true, data: { results: [], total: 0 } }
    }

    const results: SearchResult[] = (data || []).map((doc: any) => ({
      type: 'document' as SearchResultType,
      id: doc.id,
      title: doc.title,
      excerpt: highlightExcerpt(
        truncateText(doc.excerpt || doc.content?.replace(/<[^>]*>/g, '') || ''),
        trigramQuery
      ),
      url: generateResultUrl('document', doc.id),
      author: doc.profiles?.display_name || null,
      created_at: doc.created_at,
    }))

    return { success: true, data: { results, total: count || 0 } }
  } catch (error) {
    console.error('Error in searchDocumentsFallback:', error)
    return { success: true, data: { results: [], total: 0 } }
  }
}

/**
 * Get search suggestions based on partial query
 * Returns matching titles and popular terms
 */
export async function getSearchSuggestions(query: string): Promise<ActionResult<string[]>> {
  try {
    const trimmedQuery = query?.trim()

    if (!trimmedQuery || trimmedQuery.length < 1) {
      return { success: true, data: [] }
    }

    const supabase = await createClient()
    const suggestions: Set<string> = new Set()

    // Get matching post titles
    const { data: posts } = await supabase
      .from('posts')
      .select('title')
      .eq('status', 'published')
      .is('deleted_at', null)
      .ilike('title', `%${trimmedQuery}%`)
      .limit(5)

    if (posts) {
      posts.forEach((post) => {
        if (post.title) {
          suggestions.add(post.title)
        }
      })
    }

    // Get matching document titles
    const { data: documents } = await supabase
      .from('documents')
      .select('title')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .ilike('title', `%${trimmedQuery}%`)
      .limit(5)

    if (documents) {
      documents.forEach((doc) => {
        if (doc.title) {
          suggestions.add(doc.title)
        }
      })
    }

    // Get matching tags from posts
    const { data: taggedPosts } = await supabase
      .from('posts')
      .select('tags')
      .eq('status', 'published')
      .is('deleted_at', null)
      .overlaps('tags', [trimmedQuery])
      .limit(10)

    if (taggedPosts) {
      taggedPosts.forEach((post) => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(trimmedQuery.toLowerCase())) {
              suggestions.add(tag)
            }
          })
        }
      })
    }

    // Limit to 10 suggestions
    const suggestionList = Array.from(suggestions).slice(0, 10)

    return { success: true, data: suggestionList }
  } catch (error) {
    console.error('Unexpected error in getSearchSuggestions:', error)
    return { success: true, data: [] }
  }
}

/**
 * Get popular search terms
 * Returns most searched terms from search logs or top content tags
 */
export async function getPopularSearchTerms(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient()
    const popularTerms: Set<string> = new Set()

    // Get popular tags from posts (weighted by post count)
    const { data: popularTags } = await supabase
      .from('posts')
      .select('tags')
      .eq('status', 'published')
      .is('deleted_at', null)
      .not('tags', 'is', null)
      .limit(100)

    if (popularTags) {
      const tagCounts: Record<string, number> = {}

      popularTags.forEach((post) => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        }
      })

      // Sort by count and take top tags
      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag)

      sortedTags.forEach((tag) => popularTerms.add(tag))
    }

    // Get recent popular document categories
    const { data: documents } = await supabase
      .from('documents')
      .select('categories')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .not('categories', 'is', null)
      .limit(50)

    if (documents) {
      const categoryCounts: Record<string, number> = {}

      documents.forEach((doc) => {
        if (doc.categories && Array.isArray(doc.categories)) {
          doc.categories.forEach((category: string) => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1
          })
        }
      })

      // Sort by count and take top categories
      const sortedCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category)

      sortedCategories.forEach((category) => popularTerms.add(category))
    }

    // Limit to 15 popular terms
    const termList = Array.from(popularTerms).slice(0, 15)

    return { success: true, data: termList }
  } catch (error) {
    console.error('Unexpected error in getPopularSearchTerms:', error)
    return { success: true, data: [] }
  }
}
