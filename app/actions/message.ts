'use server'

import { createClient } from '@/lib/supabase/server'
import type { UUID } from '@/lib/supabase/database.types'
import type {
  Message,
  MessageInsert,
  MessageUpdate,
  MessageListFilters,
  MessageBlock,
  MessageBlockInsert,
  MessageWithRelations,
  MessageBlockWithRelations,
} from '@/lib/supabase/database.types'
import type { ActionResult } from '@/types/board'

// =====================================================
// Error Messages (Korean)
// =====================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '요청하신 데이터를 찾을 수 없습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  MESSAGE_NOT_FOUND: '메시지를 찾을 수 없습니다.',
  BLOCKED_USER: '차단된 사용자에게는 메시지를 보낼 수 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  CREATE_FAILED: '메시지 전송에 실패했습니다.',
  UPDATE_FAILED: '메시지 수정에 실패했습니다.',
  DELETE_FAILED: '메시지 삭제에 실패했습니다.',
  BLOCK_FAILED: '차단에 실패했습니다.',
  UNBLOCK_FAILED: '차단 해제에 실패했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
}

// =====================================================
// Message Actions
// =====================================================

/**
 * Send a new message
 */
export async function sendMessage(data: MessageInsert): Promise<ActionResult<Message>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Validate input
    if (!data.receiver_id || !data.title || !data.content) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // Check if receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.receiver_id)
      .single()

    if (receiverError || !receiver) {
      return { success: false, error: ERROR_MESSAGES.USER_NOT_FOUND }
    }

    // Check if blocked
    const { data: isBlocked } = await supabase
      .rpc('is_blocked', {
        p_user_id: user.id,
        p_target_id: data.receiver_id,
      })

    if (isBlocked) {
      return { success: false, error: ERROR_MESSAGES.BLOCKED_USER }
    }

    // Send message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: data.receiver_id,
        title: data.title.trim(),
        content: data.content.trim(),
        parent_id: data.parent_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Send message error:', error)
      return { success: false, error: ERROR_MESSAGES.CREATE_FAILED }
    }

    return { success: true, data: message }
  } catch (error) {
    console.error('Send message error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get message list (inbox or sent)
 */
export async function getMessages(filters: MessageListFilters): Promise<ActionResult<Message[]>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Build query based on folder
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.folder === 'inbox') {
      query = query
        .eq('receiver_id', user.id)
        .eq('is_receiver_deleted', false)
    } else if (filters.folder === 'sent') {
      query = query
        .eq('sender_id', user.id)
        .eq('is_sender_deleted', false)
    }

    // Apply filters
    if (filters.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Get messages error:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: messages || [] }
  } catch (error) {
    console.error('Get messages error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get message with relations
 */
export async function getMessage(messageId: UUID): Promise<ActionResult<MessageWithRelations>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Get message with relations
    const { data: message, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(id, display_name, avatar_url),
        parent:messages!messages_parent_id_fkey(id, title, sender_id, receiver_id)
      `)
      .eq('id', messageId)
      .single()

    if (error || !message) {
      return { success: false, error: ERROR_MESSAGES.MESSAGE_NOT_FOUND }
    }

    // Check permission
    if (message.sender_id !== user.id && message.receiver_id !== user.id) {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // Check if deleted
    if (message.sender_id === user.id && message.is_sender_deleted) {
      return { success: false, error: ERROR_MESSAGES.MESSAGE_NOT_FOUND }
    }

    if (message.receiver_id === user.id && message.is_receiver_deleted) {
      return { success: false, error: ERROR_MESSAGES.MESSAGE_NOT_FOUND }
    }

    // Auto-mark as read if receiver
    if (message.receiver_id === user.id && !message.is_read) {
      await markAsRead(messageId)
    }

    return { success: true, data: message as MessageWithRelations }
  } catch (error) {
    console.error('Get message error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: UUID): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Mark as read
    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('receiver_id', user.id)

    if (error) {
      console.error('Mark as read error:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true }
  } catch (error) {
    console.error('Mark as read error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Mark all messages as read
 */
export async function markAllAsRead(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Mark all as read
    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Mark all as read error:', error)
      return { success: false, error: ERROR_MESSAGES.UPDATE_FAILED }
    }

    return { success: true }
  } catch (error) {
    console.error('Mark all as read error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Delete message (soft delete)
 */
export async function deleteMessage(messageId: UUID): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Get message first
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .eq('id', messageId)
      .single()

    if (fetchError || !message) {
      return { success: false, error: ERROR_MESSAGES.MESSAGE_NOT_FOUND }
    }

    // Soft delete based on user role
    if (message.sender_id === user.id) {
      // Sender deleting
      const { error } = await supabase
        .from('messages')
        .update({
          is_sender_deleted: true,
          sender_deleted_at: new Date().toISOString(),
        })
        .eq('id', messageId)

      if (error) {
        console.error('Delete message error:', error)
        return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
      }
    } else if (message.receiver_id === user.id) {
      // Receiver deleting
      const { error } = await supabase
        .from('messages')
        .update({
          is_receiver_deleted: true,
          receiver_deleted_at: new Date().toISOString(),
        })
        .eq('id', messageId)

      if (error) {
        console.error('Delete message error:', error)
        return { success: false, error: ERROR_MESSAGES.DELETE_FAILED }
      }
    } else {
      return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete message error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Get count
    const { data, error } = await supabase
      .rpc('count_unread_messages', {
        p_user_id: user.id,
      })

    if (error) {
      console.error('Get unread count error:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data || 0 }
  } catch (error) {
    console.error('Get unread count error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

// =====================================================
// Block Actions
// =====================================================

/**
 * Block a user
 */
export async function blockUser(blockedId: UUID): Promise<ActionResult<MessageBlock>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Cannot block yourself
    if (user.id === blockedId) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT }
    }

    // Check if user exists
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blockedId)
      .single()

    if (!targetUser) {
      return { success: false, error: ERROR_MESSAGES.USER_NOT_FOUND }
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('message_blocks')
      .select('*')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)
      .single()

    if (existing) {
      return { success: false, error: '이미 차단된 사용자입니다.' }
    }

    // Block user
    const { data: block, error } = await supabase
      .from('message_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      })
      .select()
      .single()

    if (error) {
      console.error('Block user error:', error)
      return { success: false, error: ERROR_MESSAGES.BLOCK_FAILED }
    }

    return { success: true, data: block }
  } catch (error) {
    console.error('Block user error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(blockedId: UUID): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Delete block
    const { error } = await supabase
      .from('message_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)

    if (error) {
      console.error('Unblock user error:', error)
      return { success: false, error: ERROR_MESSAGES.UNBLOCK_FAILED }
    }

    return { success: true }
  } catch (error) {
    console.error('Unblock user error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Get blocked users list
 */
export async function getBlockedUsers(): Promise<ActionResult<MessageBlockWithRelations[]>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Get blocked users
    const { data: blocks, error } = await supabase
      .from('message_blocks')
      .select(`
        *,
        blocked:profiles!message_blocks_blocked_id_fkey(id, display_name, avatar_url)
      `)
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get blocked users error:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: (blocks as MessageBlockWithRelations[]) || [] }
  } catch (error) {
    console.error('Get blocked users error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(targetUserId: UUID): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // Check if blocked
    const { data, error } = await supabase
      .rpc('is_blocked', {
        p_user_id: user.id,
        p_target_id: targetUserId,
      })

    if (error) {
      console.error('Check if blocked error:', error)
      return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }

    return { success: true, data: data || false }
  } catch (error) {
    console.error('Check if blocked error:', error)
    return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR }
  }
}
