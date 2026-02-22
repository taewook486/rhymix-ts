# Rhymix PHP to TypeScript Migration Scripts

This directory contains scripts for migrating data from the original Rhymix PHP installation to the new TypeScript implementation.

## Migration Steps

### 1. Database Connection Setup

Configure your source database connection in `config/source-db.config.js`:

```javascript
module.exports = {
  host: process.env.RHYMIX_MYSQL_HOST || 'localhost',
  port: process.env.RHYMIX_MYSQL_PORT || 3306,
  user: process.env.RHYMIX_MYSQL_USER || 'rhymix_user',
  password: process.env.RHYMIX_MYSQL_PASSWORD || '',
  database: process.env.RHYMIX_MYSQL_DATABASE || 'rhymix_db',
}
```

### 2. Run Migration Scripts

Execute migrations in the following order:

```bash
# 1. Migrate users and profiles
node scripts/migration/01-migrate-users.js

# 2. Migrate boards and categories
node scripts/migration/02-migrate-boards.js

# 3. Migrate posts and comments
node scripts/migration/03-migrate-content.js

# 4. Migrate media files
node scripts/migration/04-migrate-media.js

# 5. Migrate menus and widgets
node scripts/migration/05-migrate-layout.js

# 6. Verify migration
node scripts/migration/99-verify-migration.js
```

### 3. Data Mapping

| Rhymix PHP Table | TypeScript Table | Notes |
|-----------------|------------------|-------|
| `xe_member` | `profiles` | User profiles with auth |
| `xe_documents` | `posts` | Documents → posts |
| `xe_comments` | `comments` | Comments structure |
| `xe_modules` | `boards` | Module → board mapping |
| `xe_files` | `media` | File storage migration |

### 4. Data Transformation

Key transformations during migration:

- **Passwords**: Re-hash with bcrypt (users will need to reset)
- **Content**: Convert HTML to markdown (Tiptap format)
- **Images**: Migrate to Supabase Storage
- **Dates**: Convert to ISO 8601 format
- **Slugs**: Generate from titles for SEO

## Rollback

If migration fails, use the rollback script:

```bash
node scripts/migration/rollback.js
```

## Verification

After migration, run verification:

```bash
node scripts/migration/99-verify-migration.js
```
