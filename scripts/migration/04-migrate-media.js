/**
 * Migrate Media Files from Rhymix PHP to TypeScript
 *
 * Source: xe_files table + local file system in MySQL
 * Target: Supabase Storage (media bucket)
 */

const mysql = require('mysql2/promise')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')
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

const SOURCE_FILES_PATH = process.env.RHYMIX_FILES_PATH || './files'
const BATCH_SIZE = 50

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.mp4': 'video/mp4',
    'webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.zip': 'application/zip',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase()
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  const videoExts = ['.mp4', '.webm', '.mov', '.avi']
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  return 'document'
}

async function migrateFiles() {
  console.log('🔄 Starting file migration...')

  const sourceConnection = await mysql.createConnection(sourceDbConfig)

  try {
    // Get total count
    const [countResult] = await sourceConnection.execute(`
      SELECT COUNT(*) as total FROM xe_files
    `)
    const total = countResult[0].total
    console.log(`📊 Total files to migrate: ${total}`)

    let offset = 0
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors = []

    while (offset < total) {
      // Get batch of files
      const [files] = await sourceConnection.execute(`
        SELECT
          f.file_srl as id,
          f.upload_filename as original_name,
          f.source_filename as stored_filename,
          f.download_count,
          f.file_size,
          f.direct_download,
          f.module_srl,
          f.target_srl,
          f.regdate as created_at
        FROM xe_files f
        ORDER BY f.file_srl
        LIMIT ? OFFSET ?
      `, [BATCH_SIZE, offset])

      console.log(`📦 Processing batch ${offset}-${offset + files.length}...`)

      for (const file of files) {
        try {
          // Determine file type and mime type
          const fileType = getFileType(file.original_name)
          const mimeType = getMimeType(file.original_name)

          // Build source file path
          // Rhymix stores files in /files/attach/images/{module_srl}/{month_folder}/{stored_filename}
          const date = new Date(file.created_at * 1000)
          const monthFolder = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
          const sourcePath = path.join(
            SOURCE_FILES_PATH,
            'attach',
            'images',
            file.module_srl.toString(),
            monthFolder,
            file.stored_filename
          )

          // Check if source file exists
          let fileData
          try {
            fileData = await fs.readFile(sourcePath)
          } catch (readError) {
            console.warn(`⚠️  Source file not found: ${sourcePath}`)
            skippedCount++
            continue
          }

          // Build storage path
          const storagePath = `${file.module_srl}/${file.id}/${file.stored_filename}`

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(storagePath, fileData, {
              contentType: mimeType,
              upsert: false,
            })

          if (uploadError) {
            // If file exists, get public URL instead
            if (uploadError.message.includes('already exists')) {
              const { data: existingUrl } = supabase.storage
                .from('media')
                .getPublicUrl(storagePath)

              console.log(`⚠️  File ${file.id} already exists in storage`)
            } else {
              throw uploadError
            }
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(storagePath)

          // Insert into media table
          const { error: dbError } = await supabase
            .from('media')
            .insert({
              id: file.id.toString(),
              original_name: file.original_name,
              stored_name: file.stored_filename,
              file_type: fileType,
              mime_type: mimeType,
              file_size: parseInt(file.file_size),
              url: urlData.publicUrl,
              storage_path: storagePath,
              uploaded_by: null, // Would need user mapping
              created_at: new Date(file.created_at * 1000).toISOString(),
            })

          if (dbError && !dbError.message.includes('duplicate')) {
            throw dbError
          }

          successCount++
          if (successCount % 50 === 0) {
            console.log(`   ✅ Progress: ${successCount}/${total}`)
          }

        } catch (error) {
          errorCount++
          errors.push({ fileId: file.id, error: error.message })
          if (errorCount < 10) {
            console.error(`❌ Failed to migrate file ${file.id}:`, error.message)
          }
        }
      }

      offset += files.length
    }

    console.log('\n📊 File Migration Summary:')
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n❌ Sample Errors:')
      errors.slice(0, 20).forEach(({ fileId, error }) => {
        console.log(`   - ${fileId}: ${error}`)
      })
    }

  } finally {
    await sourceConnection.end()
  }
}

// Run migration
migrateFiles()
  .then(() => {
    console.log('\n✨ File migration completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
