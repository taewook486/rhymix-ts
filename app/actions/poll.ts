'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/supabase/auth'

// =====================================================
// Types
// =====================================================

export interface Poll {
  id: string
  title: string
  stop_date: string | null
  poll_type: 'single' | 'multiple'
  max_choices: number
  is_active: boolean
  total_votes: number
  created_at: string
}

export interface PollItem {
  id: string
  poll_id: string
  title: string
  order_index: number
  vote_count: number
}

export interface CreatePollInput {
  title: string
  stop_date?: string
  poll_type: 'single' | 'multiple'
  max_choices?: number
  items: string[]
}

export interface VotePollInput {
  poll_id: string
  item_ids: string[]
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get all polls
 */
export async function getPolls(): Promise<{
  success: boolean
  data?: Poll[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data as Poll[] }
  } catch (error) {
    console.error('Get polls error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get polls'
    }
  }
}

/**
 * Get poll with items
 */
export async function getPoll(pollId: string): Promise<{
  success: boolean
  data?: Poll & { items: PollItem[] }
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single()

    if (pollError) throw pollError

    const { data: items, error: itemsError } = await supabase
      .from('poll_items')
      .select('*')
      .eq('poll_id', pollId)
      .order('order_index', { ascending: true })

    if (itemsError) throw itemsError

    return {
      success: true,
      data: { ...poll, items: items as PollItem[] } as any
    }
  } catch (error) {
    console.error('Get poll error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get poll'
    }
  }
}

/**
 * Create a new poll
 */
export async function createPoll(input: CreatePollInput): Promise<{
  success: boolean
  data?: Poll
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: input.title,
        stop_date: input.stop_date || null,
        poll_type: input.poll_type,
        max_choices: input.max_choices || 1,
        is_active: true,
      })
      .select()
      .single()

    if (pollError) throw pollError

    // Create poll items
    if (input.items && input.items.length > 0) {
      const items = input.items.map((title, index) => ({
        poll_id: poll.id,
        title,
        order_index: index,
        vote_count: 0,
      }))

      const { error: itemsError } = await supabase
        .from('poll_items')
        .insert(items)

      if (itemsError) throw itemsError
    }

    revalidatePath('/admin/polls')
    return { success: true, data: poll as Poll }
  } catch (error) {
    console.error('Create poll error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create poll'
    }
  }
}

/**
 * Update a poll
 */
export async function updatePoll(
  pollId: string,
  input: Partial<CreatePollInput>
): Promise<{
  success: boolean
  data?: Poll
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('polls')
      .update({
        ...input,
        stop_date: input.stop_date || null,
      })
      .eq('id', pollId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/polls')
    return { success: true, data: data as Poll }
  } catch (error) {
    console.error('Update poll error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update poll'
    }
  }
}

/**
 * Delete a poll
 */
export async function deletePoll(pollId: string): Promise<{
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
      .from('polls')
      .delete()
      .eq('id', pollId)

    if (error) throw error

    revalidatePath('/admin/polls')
    return { success: true }
  } catch (error) {
    console.error('Delete poll error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete poll'
    }
  }
}

/**
 * Vote on a poll
 */
export async function votePoll(input: VotePollInput): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const userId = user.data.user.id
    const supabase = await createClient()

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('poll_logs')
      .select('*')
      .eq('poll_id', input.poll_id)
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (existingVote) {
      return { success: false, error: '이미 투표하셨습니다.' }
    }

    // Check if poll is active
    const { data: poll } = await supabase
      .from('polls')
      .select('*')
      .eq('id', input.poll_id)
      .single()

    if (!poll || !poll.is_active) {
      return { success: false, error: '투표가 종료되었습니다.' }
    }

    if (poll.stop_date && new Date(poll.stop_date) < new Date()) {
      return { success: false, error: '투표 기간이 만료되었습니다.' }
    }

    // Validate max choices
    if (poll.poll_type === 'multiple' && input.item_ids.length > (poll.max_choices || 1)) {
      return { success: false, error: `최대 ${poll.max_choices || 1}개까지 선택 가능합니다.` }
    }

    // Record votes
    const voteLogs = input.item_ids.map((item_id) => ({
      poll_id: input.poll_id,
      poll_item_id: item_id,
      user_id: userId,
      ip_address: null, // Could be populated from headers
    }))

    const { error: logError } = await supabase
      .from('poll_logs')
      .insert(voteLogs)

    if (logError) throw logError

    // Update vote counts
    for (const item_id of input.item_ids) {
      await supabase.rpc('increment_poll_votes', { p_item_id: item_id })
    }

    // Update total votes
    await supabase
      .from('polls')
      .update({ total_votes: (poll.total_votes || 0) + 1 })
      .eq('id', input.poll_id)

    return { success: true }
  } catch (error) {
    console.error('Vote poll error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to vote'
    }
  }
}

/**
 * Check if user has voted
 */
export async function hasVoted(pollId: string): Promise<{
  success: boolean
  data?: boolean
  error?: string
}> {
  try {
    const user = await auth.getUser()
    if (!user.data?.user) {
      return { success: true, data: false }
    }

    const userId = user.data.user.id
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('poll_logs')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .limit(1)

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: !!data }
  } catch (error) {
    console.error('Check voted error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check vote status'
    }
  }
}
