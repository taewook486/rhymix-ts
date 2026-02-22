/**
 * Source Database Configuration for Rhymix PHP Migration
 *
 * Copy this file to source-db.config.local.js and update with your credentials
 */

module.exports = {
  // MySQL connection settings
  mysql: {
    host: process.env.RHYMIX_MYSQL_HOST || 'localhost',
    port: parseInt(process.env.RHYMIX_MYSQL_PORT) || 3306,
    user: process.env.RHYMIX_MYSQL_USER || 'root',
    password: process.env.RHYMIX_MYSQL_PASSWORD || '',
    database: process.env.RHYMIX_MYSQL_DATABASE || 'rhymix',
    connectionLimit: 10,
  },

  // File system path to Rhymix files directory
  filesPath: process.env.RHYMIX_FILES_PATH || './files',

  // Migration settings
  migration: {
    batchSize: 100,        // Number of records to process per batch
    delayBetweenBatches: 100, // ms to wait between batches
    skipExisting: true,    // Skip records that already exist
    createMapping: true,   // Create ID mapping tables for reference updates

    // Tables to migrate
    tables: {
      users: true,
      boards: true,
      posts: true,
      comments: true,
      files: true,
      menus: true,
      widgets: true,
    },
  },

  // ID mapping tables (created during migration)
  mapping: {
    users: 'user_id_mapping',
    boards: 'board_id_mapping',
    posts: 'post_id_mapping',
  },
}
