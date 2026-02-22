/**
 * Migrate Posts and Comments from Rhymix PHP to TypeScript
 *
 * Source: xe_documents, xe_comments tables in MySQL
 * Target: posts, comments tables in Supabase PostgreSQL
 */

const mysql = require('mysql2/promise')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const sourceDbConfig = {
  host: process.env.RHYMIX_MYSQL_HOST || 'localhost',
  port: parseInt(process.env.RHYMIX_MYSQL_PORT) || 3306,
  user: process.env.RHYMIX_MYSQL_USER,
  password: process.env.RHYMIX_MYSQL_PASSWORD,
  database: process.env.RHYMIX_MYSQL_DATABASE,
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

async function migrateDocuments(batchSize = 100) {
  console.log('🔄 Starting document migration...')

  const sourceConnection = await mysql.createConnection(sourceDbConfig)

  try {
    // Get total count
    const [countResult] = await sourceConnection.execute(`
      SELECT COUNT(*) as total FROM xe_documents
    `)
    const total = countResult[0].total
    console.log(`📊 Total documents to migrate: ${total}`)

    let offset = 0
    let successCount = 0
    let errorCount = 0
    const errors = []

    while (offset < total) {
      // Get batch of documents
      const [documents] = await sourceConnection.execute(`
        SELECT
          d.document_srl as id,
          d.module_srl as board_id,
          d.member_srl as author_id,
          d.title,
          d.content,
          d.tags,
          d.category_srl as category_id,
          d.is_notice,
          d.is_secret,
          d.allow_comment,
          d.locked_comment,
          d.readed_count as view_count,
          d.voted_count as like_count,
          d.blamed_count as dislike_count,
          d.comment_count,
          d.trackback_count,
          d.secret,
          d.regdate as created_at,
          d.last_update as updated_at,
          d.status,
          u.nick_name as author_nickname
        FROM xe_documents d
        LEFT JOIN xe_member u ON d.member_srl = u.member_srl
        ORDER BY d.document_srl
        LIMIT ? OFFSET ?
      `, [batchSize, offset])

      console.log(`📦 Processing batch ${offset}-${offset + documents.length}...`)

      for (const doc of documents) {
        try {
          // Parse tags
          let tags = []
          if (doc.tags) {
            try {
              tags = JSON.parse(doc.tags)
            } catch (e) {
              tags = doc.tags.split(',').map(t => t.trim()).filter(Boolean)
            }
          }

          // Generate slug
          const slug = slugify(doc.title)

          // Map user ID from old member_srl to new auth.users.id
          // This requires a mapping table created during user migration
          const userId = await mapUserId(doc.author_id)

          // Insert into posts table
          const { error: postError } = await supabase
            .from('posts')
            .insert({
              id: doc.id.toString(),
              board_id: doc.board_id.toString(),
              author_id: userId,
              title: doc.title,
              slug: slug,
              content: doc.content,
              category_id: doc.category_id ? doc.category_id.toString() : null,
              tags: tags,
              is_notice: doc.is_notice === 'Y',
              is_secret: doc.is_secret === 'Y' || doc.secret === 'Y',
              view_count: parseInt(doc.view_count) || 0,
              like_count: parseInt(doc.like_count) || 0,
              comment_count: parseInt(doc.comment_count) || 0,
              status: doc.status === 'PUBLIC' ? 'published' : 'draft',
              allow_comment: doc.allow_comment !== 'N',
              created_at: new Date(doc.created_at * 1000).toISOString(),
              updated_at: new Date(doc.updated_at * 1000).toISOString(),
            })

          if (postError) {
            if (postError.message.includes('duplicate')) {
              console.log(`⚠️  Post ${doc.id} already exists, skipping...`)
            } else {
              throw postError
            }
            continue
          }

          successCount++
          if (successCount % 100 === 0) {
            console.log(`   ✅ Progress: ${successCount}/${total}`)
          }

        } catch (error) {
          errorCount++
          errors.push({ docId: doc.id, error: error.message })
          if (errorCount < 10) {
            console.error(`❌ Failed to migrate document ${doc.id}:`, error.message)
          }
        }
      }

      offset += documents.length
    }

    console.log('\n📊 Document Migration Summary:')
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n❌ Sample Errors:')
      errors.slice(0, 20).forEach(({ docId, error }) => {
        console.log(`   - ${docId}: ${error}`)
      })
    }

  } finally {
    await sourceConnection.end()
  }
}

async function mapUserId(oldMemberSrl) {
  // This function looks up the new user ID from a mapping table
  // For now, return a placeholder - this should be implemented
  // after creating a user_id_mapping table during user migration
  if (!oldMemberSrl || oldMemberSrl === '0') {
    return null
  }

  // TODO: Implement proper ID mapping lookup
  // const { data } = await supabase
  //   .from('user_id_mapping')
  //   .select('new_id')
  //   .eq('old_id', oldMemberSrl)
  //   .single()
  // return data?.new_id || null

  return null
}

// Run migration
migrateDocuments()
  .then(() => {
    console.log('\n✨ Content migration completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
