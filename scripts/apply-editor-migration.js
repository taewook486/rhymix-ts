#!/usr/bin/env node
/**
 * Script to apply editor_settings migration to local Supabase database
 * Usage: node scripts/apply-editor-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    console.log('Connecting to local Supabase database...');
    await client.connect();
    console.log('Connected successfully');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '021_editor_settings.sql');
    console.log('Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');

    // Verify the table was created
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'editor_settings'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✓ editor_settings table created successfully');

      // Check default data
      const dataResult = await client.query('SELECT * FROM public.editor_settings');
      console.log('✓ Default settings row inserted:', dataResult.rows.length, 'row(s)');
    } else {
      console.error('✗ editor_settings table was not created');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

applyMigration();
