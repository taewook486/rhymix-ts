// @ts-nocheck
/**
 * Rhymix MySQL to Supabase PostgreSQL Migration Script
 *
 * This script migrates data from the original Rhymix MySQL database
 * to the new Supabase PostgreSQL database for Rhymix-TS.
 *
 * Usage:
 *   npm run migrate -- --source-host=localhost --source-user=root --source-password=...
 *
 * Prerequisites:
 *   - MySQL database with original Rhymix data
 *   - Supabase PostgreSQL database
 *   - Environment variables configured for Supabase
 */

import { createClient } from '@supabase/supabase-js'
import mysql from 'mysql2/promise'
import { createHash } from 'crypto'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface MigrationConfig {
  mysql: {
    host: string
    port: number
    user: string
    password: string
    database: string
  }
  supabase: {
    url: string
    key: string
  }
  options: {
    dryRun?: boolean
    batchSize?: number
    skipTables?: string[]
    onlyTables?: string[]
  }
}

interface MigrationStats {
  users: { migrated: number; failed: number; skipped: number }
  posts: { migrated: number; failed: number; skipped: number }
  comments: { migrated: number; failed: number; skipped: number }
  documents: { migrated: number; failed: number; skipped: number }
  attachments: { migrated: number; failed: number; skipped: number }
  startTime: Date
  endTime?: Date
}

// =====================================================
// CONNECTION POOLS
// =====================================================

let mysqlConnection: mysql.Connection | null = null
let supabaseClient: ReturnType<typeof createClient> | null = null

async function initializeConnections(config: MigrationConfig) {
  // MySQL Connection
  mysqlConnection = await mysql.createConnection(config.mysql)

  // Supabase Connection
  supabaseClient = createClient(config.supabase.url, config.supabase.key)

  console.log('✓ Connections established')
}

async function closeConnections() {
  if (mysqlConnection) {
    await mysqlConnection.end()
  }
  console.log('✓ Connections closed')
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function convertMarkdownToHtml(markdown: string): string {
  // Basic markdown conversion (in production, use a proper markdown library)
  let html = markdown

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  return html
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function truncateText(text: string, maxLength: number = 200): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// =====================================================
// DATA MIGRATION FUNCTIONS
// =====================================================

/**
 * Migrate users from rx_member table
 */
async function migrateUsers(stats: MigrationStats, config: MigrationConfig) {
  console.log('\n📦 Migrating users...')

  try {
    const [rows] = await mysqlConnection!.query(`
      SELECT
        member_srl as id,
        user_id as username,
        email_address as email,
        nick_name as display_name,
        homepage as website_url,
        birthday,
        description as bio,
        allow_mailing as email_notification,
        is_admin,
        denied,
        list_order,
        regdate as created_at,
        last_login as last_login_at,
        signature,
        'user' as role
      FROM rx_member
      WHERE denied = 'N'
      ORDER BY member_srl
    `)

    const users = rows as any[]
    let migrated = 0
    let failed = 0

    for (const user of users) {
      try {
        // Generate UUID for MySQL integer IDs
        const uuid = generateUUID()

        const profile = {
          id: uuid,
          email: user.email || `user_${user.id}@rhymix.local`,
          display_name: user.display_name || user.username,
          bio: user.bio,
          website_url: user.website_url,
          role: user.is_admin === 'Y' ? 'admin' : 'user',
          signature: user.signature,
          notification_settings: JSON.stringify({
            email: user.email_notification === 'Y',
            push: false,
            comment: true
          }),
          metadata: JSON.stringify({
            original_id: user.id,
            original_username: user.username,
            list_order: user.list_order
          }),
          email_verified: new Date().toISOString(),
          last_login_at: user.last_login_at ? new Date(parseInt(user.last_login_at) * 1000).toISOString() : null,
          created_at: user.created_at ? new Date(parseInt(user.created_at) * 1000).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        if (!config.options.dryRun) {
          const { error } = await supabaseClient!.from('profiles').insert(profile)

          if (error) {
            console.error(`  ✗ Failed to migrate user ${user.id}:`, error.message)
            failed++
            continue
          }
        }

        migrated++
        if (migrated % 100 === 0) {
          console.log(`  Progress: ${migrated}/${users.length} users migrated`)
        }
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate user ${user.id}:`, error.message)
        failed++
      }
    }

    stats.users = { migrated, failed, skipped: 0 }
    console.log(`  ✓ Users: ${migrated} migrated, ${failed} failed`)

  } catch (error: any) {
    console.error('  ✗ Failed to migrate users:', error.message)
    stats.users = { migrated: 0, failed: 0, skipped: 0 }
  }
}

/**
 * Migrate boards from rx_board table
 */
async function migrateBoards(stats: MigrationStats, config: MigrationConfig) {
  console.log('\n📦 Migrating boards...')

  try {
    const [rows] = await mysqlConnection!.query(`
      SELECT
        board_srl as id,
        module_srl as module_id,
        mid as slug,
        title as name,
        description,
        content,
        skin,
        use_category,
        list_count,
        search_list_count,
        page_count,
        header_text,
        footer_text,
        regdate as created_at,
        last_update as updated_at,
        order_index,
        is_notice,
        is_hidden,
        use_anonymous,
        admin_id
      FROM rx_board
      ORDER BY board_srl
    `)

    const boards = rows as any[]
    let migrated = 0
    let failed = 0

    for (const board of boards) {
      try {
        const uuid = generateUUID()

        const config = {
          post_permission: 'all',
          comment_permission: 'all',
          list_count: board.list_count || 20,
          search_list_count: board.search_list_count || 20,
          page_count: board.page_count || 10,
          anonymous: board.use_anonymous === 'Y',
          use_category: board.use_category === 'Y',
          use_tags: true,
          use_editor: true,
          use_file: true,
          max_file_size: 10485760,
          allowed_file_extensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
          max_file_count: 10,
          allow_captcha: false,
          allow_anonymous: board.use_anonymous === 'Y',
          hide_category: false
        }

        const boardData = {
          id: uuid,
          slug: board.slug,
          title: board.name || board.title,
          description: board.description,
          content: board.content,
          skin: board.skin || 'default',
          config,
          list_order: 'latest',
          is_notice: board.is_notice === 'Y',
          is_hidden: board.is_hidden === 'Y',
          created_at: board.created_at ? new Date(parseInt(board.created_at) * 1000).toISOString() : new Date().toISOString(),
          updated_at: board.updated_at ? new Date(parseInt(board.updated_at) * 1000).toISOString() : new Date().toISOString()
        }

        if (!config.options.dryRun) {
          const { error } = await supabaseClient!.from('boards').insert(boardData)

          if (error) {
            console.error(`  ✗ Failed to migrate board ${board.id}:`, error.message)
            failed++
            continue
          }
        }

        migrated++
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate board ${board.id}:`, error.message)
        failed++
      }
    }

    console.log(`  ✓ Boards: ${migrated} migrated, ${failed} failed`)

  } catch (error: any) {
    console.error('  ✗ Failed to migrate boards:', error.message)
  }
}

/**
 * Migrate documents from rx_documents table
 */
async function migrateDocuments(stats: MigrationStats, config: MigrationConfig) {
  console.log('\n📦 Migrating documents...')

  try {
    const [rows] = await mysqlConnection!.query(`
      SELECT
        document_srl as id,
        module_srl as module_id,
        title,
        content,
        user_id as author_id,
        allow_comment as allow_comment,
        allow_trackback as allow_ping,
        regdate as created_at,
        last_update as updated_at,
        status,
        is_notice
      FROM rx_documents
      ORDER BY document_srl
    `)

    const documents = rows as any[]
    let migrated = 0
    let failed = 0

    for (const doc of documents) {
      try {
        const uuid = generateUUID()

        const documentData = {
          id: uuid,
          module: 'wiki',
          title: doc.title,
          content: doc.content,
          content_html: convertMarkdownToHtml(doc.content),
          excerpt: truncateText(stripTags(doc.content)),
          slug: doc.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-'),
          author_id: null, // Will be mapped to admin
          status: doc.status || 'published',
          visibility: 'public',
          allow_comment: doc.allow_comment === 'Y',
          allow_ping: doc.allow_ping === 'Y',
          created_at: doc.created_at ? new Date(parseInt(doc.created_at) * 1000).toISOString() : new Date().toISOString(),
          updated_at: doc.updated_at ? new Date(parseInt(doc.updated_at) * 1000).toISOString() : new Date().toISOString()
        }

        if (!config.options.dryRun) {
          const { error } = await supabaseClient!.from('documents').insert(documentData)

          if (error) {
            console.error(`  ✗ Failed to migrate document ${doc.id}:`, error.message)
            failed++
            continue
          }
        }

        migrated++
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate document ${doc.id}:`, error.message)
        failed++
      }
    }

    stats.documents = { migrated, failed, skipped: 0 }
    console.log(`  ✓ Documents: ${migrated} migrated, ${failed} failed`)

  } catch (error: any) {
    console.error('  ✗ Failed to migrate documents:', error.message)
    stats.documents = { migrated: 0, failed: 0, skipped: 0 }
  }
}

/**
 * Migrate posts from rx_documents table (forum posts)
 */
async function migratePosts(stats: MigrationStats, config: MigrationConfig) {
  console.log('\n📦 Migrating posts...')

  try {
    const [rows] = await mysqlConnection!.query(`
      SELECT
        document_srl as id,
        module_srl as module_id,
        category_srl as category_id,
        title,
        content,
        user_id as author_id,
        user_name as author_name,
        nick_name as author_nick_name,
        is_notice,
        is_secret,
        allow_comment as allow_comment,
        allow_trackback as allow_trackback,
        lock_comment as is_locked,
        regdate as created_at,
        last_update as updated_at,
        readed_count as view_count,
        voted_count as vote_count,
        blamed_count as blamed_count,
        comment_count,
        trackback_count as trackback_count,
        status,
        tags
      FROM rx_documents
      WHERE module = 'board'
      ORDER BY document_srl
      LIMIT 1000
    `)

    const posts = rows as any[]
    let migrated = 0
    let failed = 0

    // Get board mapping
    const [boards] = await mysqlConnection!.query(`
      SELECT board_srl as id, mid as slug FROM rx_board
    `)
    const boardMap = new Map((boards as any[]).map((b: any) => [b.module_id, b.slug]))

    for (const post of posts) {
      try {
        const uuid = generateUUID()
        const boardSlug = boardMap.get(post.module_id)

        const postData = {
          id: uuid,
          board_id: boardSlug || 'general',
          author_id: null, // Will be mapped
          author_name: post.author_nick_name || post.author_name,
          title: post.title,
          content: post.content,
          content_html: convertMarkdownToHtml(post.content),
          excerpt: truncateText(stripTags(post.content)),
          status: post.status || 'published',
          visibility: 'all',
          is_notice: post.is_notice === 'Y',
          is_secret: post.is_secret === 'Y',
          is_locked: post.lock_comment === 'Y',
          allow_comment: post.allow_comment === 'Y',
          allow_trackback: post.allow_trackback === 'Y',
          view_count: post.view_count || 0,
          vote_count: post.vote_count || 0,
          blamed_count: post.blamed_count || 0,
          comment_count: post.comment_count || 0,
          trackback_count: post.trackback_count || 0,
          created_at: post.created_at ? new Date(parseInt(post.created_at) * 1000).toISOString() : new Date().toISOString(),
          updated_at: post.updated_at ? new Date(parseInt(post.updated_at) * 1000).toISOString() : new Date().toISOString()
        }

        if (!config.options.dryRun) {
          const { error } = await supabaseClient!.from('posts').insert(postData)

          if (error) {
            console.error(`  ✗ Failed to migrate post ${post.id}:`, error.message)
            failed++
            continue
          }
        }

        migrated++
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate post ${post.id}:`, error.message)
        failed++
      }
    }

    stats.posts = { migrated, failed, skipped: 0 }
    console.log(`  ✓ Posts: ${migrated} migrated, ${failed} failed`)

  } catch (error: any) {
    console.error('  ✗ Failed to migrate posts:', error.message)
    stats.posts = { migrated: 0, failed: 0, skipped: 0 }
  }
}

/**
 * Migrate comments from rx_comments table
 */
async function migrateComments(stats: MigrationStats, config: MigrationConfig) {
  console.log('\n📦 Migrating comments...')

  try {
    const [rows] = await mysqlConnection!.query(`
      SELECT
        comment_srl as id,
        document_srl as post_id,
        parent_srl as parent_id,
        user_id as author_id,
        user_name as author_name,
        nick_name as author_nick_name,
        content,
        is_secret,
        regdate as created_at,
        last_update as updated_at,
        voted_count as vote_count,
        blamed_count as blamed_count
      FROM rx_comments
      ORDER BY comment_srl
      LIMIT 1000
    `)

    const comments = rows as any[]
    let migrated = 0
    let failed = 0

    for (const comment of comments) {
      try {
        const uuid = generateUUID()

        const commentData = {
          id: uuid,
          post_id: comment.post_id,
          parent_id: comment.parent_id || null,
          author_id: null, // Will be mapped
          author_name: comment.author_nick_name || comment.author_name,
          content: comment.content,
          content_html: convertMarkdownToHtml(comment.content),
          status: 'visible',
          is_secret: comment.is_secret === 'Y',
          vote_count: comment.vote_count || 0,
          blamed_count: comment.blamed_count || 0,
          created_at: comment.created_at ? new Date(parseInt(comment.created_at) * 1000).toISOString() : new Date().toISOString(),
          updated_at: comment.updated_at ? new Date(parseInt(comment.updated_at) * 1000).toISOString() : new Date().toISOString()
        }

        if (!config.options.dryRun) {
          const { error } = await supabaseClient!.from('comments').insert(commentData)

          if (error) {
            console.error(`  ✗ Failed to migrate comment ${comment.id}:`, error.message)
            failed++
            continue
          }
        }

        migrated++
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate comment ${comment.id}:`, error.message)
        failed++
      }
    }

    stats.comments = { migrated, failed, skipped: 0 }
    console.log(`  ✓ Comments: ${migrated} migrated, ${failed} failed`)

  } catch (error: any) {
    console.error('  ✗ Failed to migrate comments:', error.message)
    stats.comments = { migrated: 0, failed: 0, skipped: 0 }
  }
}

/**
 * Migrate attachments/files from rx_files table
 */
async function migrateAttachments(stats: MigrationStats, config: MigrationConfig) {
  console.log('\n📦 Migrating attachments...')

  try {
    const [rows] = await mysqlConnection!.query(`
      SELECT
        file_srl as id,
        module_srl as module_id,
        target_srl as target_id,
        member_srl as author_id,
        source_filename as original_filename,
        filename,
        download_count,
        file_size,
        is_image,
        regdate as created_at
      FROM rx_files
      ORDER BY file_srl
      LIMIT 1000
    `)

    const files = rows as any[]
    let migrated = 0
    let failed = 0

    for (const file of files) {
      try {
        const uuid = generateUUID()

        const fileData = {
          id: uuid,
          target_type: 'post', // Will be determined from context
          target_id: file.target_id,
          author_id: null, // Will be mapped
          filename: file.filename,
          original_filename: file.original_filename,
          mime_type: file.is_image === 'Y' ? 'image/jpeg' : 'application/octet-stream',
          file_size: file.file_size || 0,
          is_image: file.is_image === 'Y',
          download_count: file.download_count || 0,
          storage_path: `uploads/${file.filename}`,
          status: 'active',
          created_at: file.created_at ? new Date(parseInt(file.created_at) * 1000).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        if (!config.options.dryRun) {
          const { error } = await supabaseClient!.from('files').insert(fileData)

          if (error) {
            console.error(`  ✗ Failed to migrate file ${file.id}:`, error.message)
            failed++
            continue
          }
        }

        migrated++
      } catch (error: any) {
        console.error(`  ✗ Failed to migrate file ${file.id}:`, error.message)
        failed++
      }
    }

    stats.attachments = { migrated, failed, skipped: 0 }
    console.log(`  ✓ Attachments: ${migrated} migrated, ${failed} failed`)

  } catch (error: any) {
    console.error('  ✗ Failed to migrate attachments:', error.message)
    stats.attachments = { migrated: 0, failed: 0, skipped: 0 }
  }
}

// =====================================================
// MAIN MIGRATION ORCHESTRATOR
// =====================================================

export async function runMigration(config: MigrationConfig) {
  const stats: MigrationStats = {
    users: { migrated: 0, failed: 0, skipped: 0 },
    posts: { migrated: 0, failed: 0, skipped: 0 },
    comments: { migrated: 0, failed: 0, skipped: 0 },
    documents: { migrated: 0, failed: 0, skipped: 0 },
    attachments: { migrated: 0, failed: 0, skipped: 0 },
    startTime: new Date()
  }

  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║   Rhymix MySQL → Supabase PostgreSQL Migration      ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log(`Mode: ${config.options.dryRun ? 'DRY RUN (no data will be written)' : 'PRODUCTION'}`)
  console.log('')

  try {
    await initializeConnections(config)

    // Migration order matters due to foreign key dependencies
    await migrateUsers(stats, config)
    await migrateBoards(stats, config)
    await migrateDocuments(stats, config)
    await migratePosts(stats, config)
    await migrateComments(stats, config)
    await migrateAttachments(stats, config)

    stats.endTime = new Date()

    console.log('\n╔═══════════════════════════════════════════════════════╗')
    console.log('║                    MIGRATION SUMMARY                   ║')
    console.log('╠═══════════════════════════════════════════════════════╣')
    console.log(`║ Users:       ${stats.users.migrated.toString().padStart(4)} migrated, ${stats.users.failed.toString().padStart(3)} failed`)
    console.log(`║ Posts:       ${stats.posts.migrated.toString().padStart(4)} migrated, ${stats.posts.failed.toString().padStart(3)} failed`)
    console.log(`║ Comments:    ${stats.comments.migrated.toString().padStart(4)} migrated, ${stats.comments.failed.toString().padStart(3)} failed`)
    console.log(`║ Documents:   ${stats.documents.migrated.toString().padStart(4)} migrated, ${stats.documents.failed.toString().padStart(3)} failed`)
    console.log(`║ Attachments: ${stats.attachments.migrated.toString().padStart(4)} migrated, ${stats.attachments.failed.toString().padStart(3)} failed`)
    console.log('╠═════════════════════════════════════════════════════════╣')
    console.log(`║ Duration:    ${Math.round((stats.endTime!.getTime() - stats.startTime.getTime()) / 1000)}s`)
    console.log('╚═══════════════════════════════════════════════════════╝')

    if (config.options.dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was actually migrated.')
      console.log('   Run without --dry-run to perform the actual migration.')
    }

  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message)
    throw error
  } finally {
    await closeConnections()
  }
}

// =====================================================
// CLI ENTRY POINT
// =====================================================

if (require.main === module) {
  const args = process.argv.slice(2)

  const config: MigrationConfig = {
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'rhymix'
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      key: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    options: {
      dryRun: args.includes('--dry-run'),
      batchSize: 100
    }
  }

  runMigration(config).catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
}
