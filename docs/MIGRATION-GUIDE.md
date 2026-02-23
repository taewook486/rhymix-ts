# Rhymix MySQL → Supabase PostgreSQL Migration Guide

This guide explains how to migrate data from the original Rhymix (PHP/MySQL) to Rhymix-TS (Next.js/Supabase).

## Prerequisites

### Source Database (MySQL)
- MySQL 5.7+ or MariaDB 10.3+
- Original Rhymix database
- Database access credentials

### Target Database (Supabase PostgreSQL)
- Supabase project
- Service role key (for admin operations)
- Supabase project URL

### Environment Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

## Environment Variables

Create or update `.env.local` with the following:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Source MySQL Database (Migration Only)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=rhymix
```

## Migration Overview

The migration script transfers the following data:

| Source (MySQL) | Target (PostgreSQL) | Notes |
|----------------|-------------------|-------|
| `rx_member` | `profiles` | User profiles |
| `rx_board` | `boards` | Board configuration |
| `rx_documents` | `documents` | Wiki documents |
| `rx_documents` (board) | `posts` | Forum posts |
| `rx_comments` | `comments` | Comments |
| `rx_files` | `files` | Attachments |

## Running the Migration

### Dry Run (Recommended First)

Always run a dry run first to verify the migration:

```bash
npm run migrate:dry
```

This will:
- Connect to both databases
- Show migration statistics
- NOT write any data to Supabase

### Production Migration

After verifying the dry run, run the actual migration:

```bash
npm run migrate
```

## Migration Process

### Phase 1: Users
- Migrates user accounts from `rx_member`
- Converts integer IDs to UUIDs
- Maps roles (admin → admin, others → user)
- Preserves profile information

### Phase 2: Boards
- Migrates board configuration from `rx_board`
- Preserves board settings and permissions
- Maps module relationships

### Phase 3: Documents
- Migrates wiki documents from `rx_documents`
- Converts content to HTML
- Preserves document metadata

### Phase 4: Posts
- Migrates forum posts from `rx_documents` (where module='board')
- Converts markdown content to HTML
- Preserves post metadata (view count, votes, etc.)

### Phase 5: Comments
- Migrates comments from `rx_comments`
- Preserves comment threading
- Maps parent-child relationships

### Phase 6: Files
- Migrates file metadata from `rx_files`
- Note: Actual file migration requires separate S3/Storage migration

## Post-Migration Tasks

### 1. Verify Data
```sql
-- Check user count
SELECT COUNT(*) FROM profiles;

-- Check post count
SELECT COUNT(*) FROM posts;

-- Check comment count
SELECT COUNT(*) FROM comments;
```

### 2. Update Sequences
```sql
-- Update board post counts
UPDATE boards b
SET post_count = (
  SELECT COUNT(*)
  FROM posts
  WHERE board_id = b.id
  AND status = 'published'
  AND deleted_at IS NULL
);

-- Update board comment counts
UPDATE boards b
SET comment_count = (
  SELECT COUNT(*)
  FROM comments c
  JOIN posts p ON c.post_id = p.id
  WHERE p.board_id = b.id
  AND c.status = 'visible'
  AND c.deleted_at IS NULL
);
```

### 3. Rebuild Search Vectors
```sql
-- Rebuild full-text search vectors
UPDATE posts SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''));
UPDATE documents SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''));
```

### 4. Create Default Admin
```sql
-- Create default admin user if not exists
INSERT INTO profiles (id, email, display_name, role, email_verified)
VALUES (
  gen_random_uuid(),
  'admin@rhymix.local',
  'Administrator',
  'admin',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin';
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to MySQL database

```bash
# Test MySQL connection
mysql -h localhost -u root -p rhymix

# Check MySQL is running
systemctl status mysql
```

### Permission Issues

**Problem**: Supabase RLS policies blocking migration

**Solution**: Use service role key for migration:

```bash
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Large Datasets

**Problem**: Migration timing out on large datasets

**Solution**: Migrate in batches by modifying the script:

```typescript
// Add LIMIT to queries
LIMIT 1000

// Run multiple times with OFFSET
OFFSET 0
OFFSET 1000
OFFSET 2000
```

## Rollback

If migration fails, you can reset Supabase:

```bash
# Delete all data (CAUTION!)
psql $DATABASE_URL -c "TRUNCATE posts, comments, documents, profiles CASCADE;"
```

## Data Mapping Reference

### User Status Mapping
| Rhymix | Rhymix-TS |
|--------|----------|
| denied = 'N' | enabled |
| denied = 'Y' | (skip) |
| is_admin = 'Y' | role = 'admin' |
| is_admin = 'N' | role = 'user' |

### Post Status Mapping
| Rhymix | Rhymix-TS |
|--------|----------|
| PUBLIC | published |
| SECRET | is_secret = true |
| TEMP | status = 'draft' |
| TRASH | status = 'trash' |

### Comment Status Mapping
| Rhymix | Rhymix-TS |
|--------|----------|
| DECLARED | visible |
| SECRET | is_secret = true |
| TRASH | status = 'trash' |
| MODERATED | is_blind = true |

## Performance Tips

1. **Disable triggers** during migration for faster inserts
2. **Batch inserts** instead of single-row inserts
3. **Parallel migration** for independent tables
4. **Index creation** after data migration

## Support

For migration issues:
1. Check migration logs
2. Verify database connections
3. Review error messages
4. Check Rhymix-TS documentation

## Security Considerations

- Never commit database credentials to version control
- Use read-only MySQL user for dry runs
- Use service role key only for production migration
- Backup both databases before migration
- Test migration on staging first
