/**
 * Migrate Users from Rhymix PHP to TypeScript
 *
 * Source: xe_member table in MySQL
 * Target: auth.users and profiles tables in Supabase PostgreSQL
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

async function migrateUsers() {
  console.log('🔄 Starting user migration...')

  const sourceConnection = await mysql.createConnection(sourceDbConfig)

  try {
    // Get all users from source
    const [users] = await sourceConnection.execute(`
      SELECT
        member_srl as id,
        user_id as email,
        user_name as nickname,
        email_address as email,
        homepage as website,
        blog as blog,
        description as bio,
        regdate as created_at,
        last_login as last_login,
        extra_vars as metadata
      FROM xe_member
      WHERE denied != 'Y'
      ORDER BY member_srl
    `)

    console.log(`📊 Found ${users.length} users to migrate`)

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const user of users) {
      try {
        // Parse extra_vars for additional fields
        let metadata = {}
        if (user.metadata) {
          try {
            metadata = JSON.parse(user.metadata)
          } catch (e) {
            console.warn(`Failed to parse metadata for user ${user.id}`)
          }
        }

        // Insert into auth.users (password will need reset)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
          user_metadata: {
            nickname: user.nickname || user.email.split('@')[0],
          },
        })

        if (authError) {
          if (authError.message.includes('duplicate')) {
            console.log(`⚠️  User ${user.email} already exists, skipping...`)
          } else {
            throw authError
          }
          continue
        }

        // Insert into profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.user.id,
            email: user.email,
            nickname: user.nickname || user.email.split('@')[0],
            website: user.website || null,
            blog: user.blog || null,
            bio: user.bio || null,
            avatar_url: metadata.avatar_url || null,
            created_at: new Date(user.created_at * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (profileError) {
          throw profileError
        }

        successCount++
        console.log(`✅ Migrated user: ${user.email}`)

      } catch (error) {
        errorCount++
        errors.push({ user: user.email, error: error.message })
        console.error(`❌ Failed to migrate user ${user.email}:`, error.message)
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(({ user, error }) => {
        console.log(`   - ${user}: ${error}`)
      })
    }

  } finally {
    await sourceConnection.end()
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('\n✨ User migration completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
