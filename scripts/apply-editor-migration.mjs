#!/usr/bin/env node
/**
 * Script to apply editor_settings migration to local Supabase database
 * Usage: node scripts/apply-editor-migration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '021_editor_settings.sql');
    console.log('Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute via Supabase REST API using service role
    const SUPABASE_URL = 'http://127.0.0.1:54321';
    // Use environment variable: SUPABASE_SERVICE_KEY
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

    // We need to execute SQL directly, but REST API doesn't support this
    // Instead, let's provide manual instructions

    console.log('\n========================================');
    console.log('MANUAL MIGRATION REQUIRED');
    console.log('========================================\n');
    console.log('The migration file has been created at:');
    console.log(`  ${migrationPath}\n`);
    console.log('To apply this migration, choose one of these options:\n');
    console.log('Option 1: Supabase Studio SQL Editor');
    console.log('  1. Open http://127.0.0.1:54323 in your browser');
    console.log('  2. Go to SQL Editor');
    console.log('  3. Copy and paste the contents of the migration file');
    console.log('  4. Click "Run"\n');
    console.log('Option 2: Direct psql command (if available)');
    console.log('  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f ' + migrationPath + '\n');
    console.log('Option 3: Using Docker exec');
    console.log('  docker exec -i supabase_db_rhymix-ts psql -U postgres -d postgres < ' + migrationPath + '\n');
    console.log('After applying the migration, regenerate types with:');
    console.log('  npx supabase gen types typescript --local > lib/supabase/database.types.ts\n');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
