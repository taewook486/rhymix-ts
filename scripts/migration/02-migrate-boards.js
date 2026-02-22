/**
 * Migrate Boards from Rhymix PHP to TypeScript
 *
 * Source: xe_modules table (module_type = 'board') in MySQL
 * Target: boards table in Supabase PostgreSQL
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

async function migrateBoards() {
  console.log('🔄 Starting board migration...')

  const sourceConnection = await mysql.createConnection(sourceDbConfig)

  try {
    // Get all board modules
    const [modules] = await sourceConnection.execute(`
      SELECT
        m.module_srl as id,
        m.mid as slug,
        m.module as name,
        m.browser_title as title,
        m.description,
        m.is_default,
        m.open_rss,
        m.header_text,
        m.footer_text,
        s.use_category,
        s.list_count,
        s.search_list_count,
        s.page_count
      FROM xe_modules m
      LEFT JOIN xe_board_settings s ON m.module_srl = s.module_srl
      WHERE m.module_type = 'board'
      ORDER BY m.module_srl
    `)

    console.log(`📊 Found ${modules.length} boards to migrate`)

    // Get categories for each board
    const [categories] = await sourceConnection.execute(`
      SELECT
        module_srl,
        title,
        expand,
        group_srls,
        color
      FROM xe_document_categories
      ORDER BY module_srl, listorder
    `)

    // Group categories by module
    const categoriesByModule = {}
    for (const cat of categories) {
      const moduleId = cat.module_srl.toString()
      if (!categoriesByModule[moduleId]) {
        categoriesByModule[moduleId] = []
      }
      categoriesByModule[moduleId].push({
        title: cat.title,
        expand: cat.expand === 'Y',
        color: cat.color || null,
      })
    }

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const board of modules) {
      try {
        // Generate slug from mid if not set
        const slug = board.slug || slugify(board.title || board.name)

        // Get categories for this board
        const boardCategories = categoriesByModule[board.id.toString()] || []

        // Build skin info from module info
        const skin = board.skin || 'default'

        // Insert into boards table
        const { error: boardError } = await supabase
          .from('boards')
          .insert({
            id: board.id.toString(),
            slug: slug,
            title: board.title || board.name,
            description: board.description || null,
            skin: skin,
            use_category: board.use_category === 'Y',
            is_default: board.is_default === 'Y',
            is_hidden: false,
            list_count: parseInt(board.list_count) || 20,
            page_count: parseInt(board.page_count) || 10,
            open_rss: board.open_rss === 'Y',
            header_text: board.header_text || null,
            footer_text: board.footer_text || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (boardError) {
          if (boardError.message.includes('duplicate')) {
            console.log(`⚠️  Board "${slug}" already exists, skipping...`)
          } else {
            throw boardError
          }
          continue
        }

        // Insert categories if any
        if (boardCategories.length > 0) {
          const categoryData = boardCategories.map((cat, idx) => ({
            board_id: board.id.toString(),
            title: cat.title,
            expand: cat.expand,
            color: cat.color,
            order: idx,
          }))

          const { error: catError } = await supabase
            .from('categories')
            .insert(categoryData)

          if (catError) {
            console.warn(`⚠️  Failed to migrate categories for board "${slug}": ${catError.message}`)
          }
        }

        successCount++
        console.log(`✅ Migrated board: ${slug}`)

      } catch (error) {
        errorCount++
        errors.push({ board: board.title || board.id, error: error.message })
        console.error(`❌ Failed to migrate board ${board.title || board.id}:`, error.message)
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(({ board, error }) => {
        console.log(`   - ${board}: ${error}`)
      })
    }

  } finally {
    await sourceConnection.end()
  }
}

// Run migration
migrateBoards()
  .then(() => {
    console.log('\n✨ Board migration completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
