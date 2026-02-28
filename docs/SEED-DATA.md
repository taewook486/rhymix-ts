# Seed Data System Documentation

## Overview

This document describes the initial data seeding system implemented as part of SPEC-SETUP-001. The seed data system provides automated setup of default data for new Rhymix-TS installations, including boards, menus, pages, layouts, widgets, and site configuration.

## Architecture

### Database Migration

**Location**: `supabase/migrations/014_initial_data_seed.sql`

**Type**: PostgreSQL Migration

**Purpose**: Seeds default data for new installations using idempotent SQL operations.

### Server Actions

**Location**: `app/actions/seed.ts`

**Type**: Server Actions

**Purpose**: Provides TypeScript functions for seeding and verification.

## Seeded Data

### 1. Default Boards (3)

Three default boards are created during installation:

#### Free Board (자유게시판)

```sql
slug: 'board'
title: '자유게시판'
description: '자유롭게 글을 작성할 수 있는 게시판입니다.'
config: {
  post_permission: 'all',
  comment_permission: 'all',
  list_count: 20,
  page_count: 10,
  use_category: true,
  use_tags: true,
  use_editor: true,
  use_file: true
}
```

#### Q&A (질문답변)

```sql
slug: 'qna'
title: '질문답변'
description: '질문과 답변을 주고받을 수 있는 게시판입니다.'
config: {
  post_permission: 'all',
  comment_permission: 'all',
  list_count: 20,
  page_count: 10,
  use_category: true,
  use_tags: true,
  use_editor: true,
  use_file: true
}
```

#### Notice (공지사항)

```sql
slug: 'notice'
title: '공지사항'
description: '공지사항을 확인하실 수 있습니다.'
config: {
  post_permission: 'admin',
  comment_permission: 'all',
  list_count: 20,
  page_count: 10,
  use_category: false,
  use_tags: false,
  use_editor: true,
  use_file: true
}
```

### 2. Menu Structures (3)

Three default menu structures are created with associated menu items:

#### GNB (Global Navigation Bar)

```sql
name: 'gnb'
title: 'Main Menu'
location: 'header'
description: 'Global Navigation Bar - Main site navigation'
config: {
  type: 'normal',
  max_depth: 2,
  expandable: true,
  show_title: false
}
```

**Menu Items**:
- Welcome (/)
- Free Board (/board)
- Q&A (/qna)
- Notice (/notice)

#### UNB (Utility Navigation Bar)

```sql
name: 'unb'
title: 'Utility Menu'
location: 'top'
description: 'Utility Navigation Bar - External links'
config: {
  type: 'normal',
  max_depth: 1,
  expandable: false,
  show_title: false
}
```

**Menu Items**:
- Rhymix Official (https://rhymix.org/)
- Rhymix GitHub (https://github.com/rhymix)

#### FNB (Footer Navigation Bar)

```sql
name: 'fnb'
title: 'Footer Menu'
location: 'footer'
description: 'Footer Navigation Bar - Footer links'
config: {
  type: 'normal',
  max_depth: 1,
  expandable: false,
  show_title: false
}
```

**Menu Items**:
- Terms of Service (/terms)
- Privacy Policy (/privacy)

### 3. Default Pages (3)

Three default pages are created:

#### Welcome/Home Page

```sql
slug: 'home'
title: 'Welcome to Rhymix'
is_homepage: true
status: 'published'
```

Content includes:
- Getting started guide
- Features overview
- Default boards information
- Support links

#### Terms of Service

```sql
slug: 'terms'
title: 'Terms of Service'
is_homepage: false
status: 'published'
```

Content includes:
- Acceptance of terms
- Use license
- User responsibilities
- Content ownership

#### Privacy Policy

```sql
slug: 'privacy'
title: 'Privacy Policy'
is_homepage: false
status: 'published'
```

Content includes:
- Information collection
- Data usage
- Security measures
- Contact information

### 4. Layouts (2)

Two default layouts are created:

#### PC Layout

```sql
layout_name: 'default'
layout_type: 'P'
title: 'Default Layout'
skin: 'default'
extra_vars: {
  use_demo: true,
  use_ncenter_widget: true,
  content_fixed_width: true
}
```

#### Mobile Layout

```sql
layout_name: 'default'
layout_type: 'M'
title: 'Mobile Layout'
skin: 'default'
extra_vars: {
  use_demo: true
}
```

### 5. Dashboard Widgets (4)

Four default widgets are created for the admin dashboard:

#### Recent Comments Widget

```sql
widget_name: 'recent_comments'
widget_type: 'dashboard'
position: 'sidebar'
title: '최근 댓글'
config: {
  count: 5,
  show_author: true,
  show_date: true,
  enable_actions: true
}
```

#### Latest Documents Widget

```sql
widget_name: 'latest_documents'
widget_type: 'dashboard'
position: 'main'
title: '최신 게시물'
config: {
  count: 5,
  show_author: true,
  show_date: true,
  enable_actions: true
}
```

#### Member Statistics Widget

```sql
widget_name: 'member_stats'
widget_type: 'dashboard'
position: 'sidebar'
title: '회원'
config: {
  show_total: true,
  show_today: true,
  show_link: true
}
```

#### Document Statistics Widget

```sql
widget_name: 'document_stats'
widget_type: 'dashboard'
position: 'main'
title: '문서'
config: {
  show_total: true,
  show_today: true,
  show_link: true
}
```

### 6. Site Configuration (17 keys)

Site configuration entries are organized by category:

#### Appearance Settings

```sql
key: 'site.theme'
value: 'default'
category: 'appearance'
description: 'Active theme'

key: 'site.logo_url'
value: null
category: 'appearance'
description: 'Logo URL'

key: 'site.favicon_url'
value: null
category: 'appearance'
description: 'Favicon URL'
```

#### SEO Settings

```sql
key: 'seo.meta_keywords'
value: []
category: 'seo'
description: 'Meta keywords'

key: 'seo.google_analytics_id'
value: null
category: 'seo'
description: 'Google Analytics ID'
```

#### Security Settings

```sql
key: 'auth.allow_registration'
value: true
category: 'security'
description: 'Allow user registration'

key: 'auth.require_email_verification'
value: true
category: 'security'
description: 'Require email verification'

key: 'auth.allow_social_login'
value: false
category: 'security'
description: 'Allow social login'
```

#### Email Settings

```sql
key: 'email.smtp_enabled'
value: false
category: 'email'
description: 'SMTP enabled'
```

#### Feature Settings

```sql
key: 'features.allow_file_upload'
value: true
category: 'features'
description: 'Allow file uploads'

key: 'features.max_file_size'
value: 10485760  // 10MB
category: 'features'
description: 'Max file size (bytes)'
```

#### Module Settings

```sql
key: 'modules.board.skin'
value: 'default'
category: 'appearance'
description: 'Default board skin'

key: 'modules.editor.skin'
value: 'ckeditor'
category: 'appearance'
description: 'Default editor skin'
```

## Server Actions API

### SeedResult Interface

```typescript
interface SeedResult {
  success: boolean
  data?: {
    boards: number
    menus: number
    pages: number
    widgets: number
    config: number
  }
  error?: string
  details?: string
}
```

### SeedStatus Interface

```typescript
interface SeedStatus {
  isSeeded: boolean
  boards: number
  menus: number
  pages: number
  config: number
}
```

### Functions

#### checkSeedingStatus()

Checks if initial seeding has been completed.

**Returns**: `Promise<SeedStatus>`

**Example**:
```typescript
const status = await checkSeedingStatus()
if (status.isSeeded) {
  console.log('Database is already seeded')
}
```

**Implementation**:
- Counts boards with slugs: 'board', 'qna', 'notice'
- Counts menus with names: 'gnb', 'unb', 'fnb'
- Counts pages with slugs: 'home', 'terms', 'privacy'
- Returns `isSeeded: true` if all counts are >= 3

#### seedDefaultData()

Executes initial data seeding.

**Returns**: `Promise<SeedResult>`

**Example**:
```typescript
const result = await seedDefaultData()
if (result.success) {
  console.log('Seeded:', result.data)
} else {
  console.error('Error:', result.error)
}
```

**Features**:
- Idempotent: Safe to run multiple times
- Checks status before seeding
- Returns early if already seeded
- Uses Supabase upsert with conflict resolution
- Transaction integrity: All-or-nothing execution

**Seeding Order**:
1. Check if already seeded
2. Seed default boards (3)
3. Seed default menus (3)
4. Seed menu items for each menu
5. Seed default pages (3)
6. Seed site configuration (17 keys)
7. Verify seeding completed

#### verifySeeding()

Verifies seeding integrity.

**Returns**: `Promise<{ success: boolean, results: Array<...> }>`

**Example**:
```typescript
const verification = await verifySeeding()
console.table(verification.results)
```

**Checks**:
- Boards: Expected 3, counts 'board', 'qna', 'notice'
- Menus: Expected 3, counts 'gnb', 'unb', 'fnb'
- Pages: Expected 3, counts 'home', 'terms', 'privacy'
- Site Config: Expected 10, counts all entries

## Database Functions

### verify_initial_seed()

PostgreSQL function to verify seeding completed successfully.

**Returns**: TABLE with columns:
- `table_name` TEXT
- `expected_count` INTEGER
- `actual_count` INTEGER
- `status` TEXT ('OK' or 'MISSING')

**Usage**:
```sql
SELECT * FROM verify_initial_seed();
```

**Example Output**:
```
 table_name | expected_count | actual_count | status
-----------+---------------+-------------+--------
 boards    |             3 |           3 | OK
 menus     |             3 |           3 | OK
 pages     |             3 |           3 | OK
 site_config |          17 |          17 | OK
```

### is_seeding_complete()

PostgreSQL function to check if seeding is complete.

**Returns**: BOOLEAN

**Usage**:
```sql
SELECT is_seeding_complete();
```

**Implementation**:
```sql
-- Returns TRUE if:
-- - boards_count >= 3 (board, qna, notice)
-- - menus_count >= 3 (gnb, unb, fnb)
-- - pages_count >= 3 (home, terms, privacy)
```

## Idempotency

All seeding operations are idempotent using SQL conflict resolution:

```sql
INSERT INTO public.boards (...)
VALUES (...)
ON CONFLICT (slug) DO NOTHING;
```

This means:
- Safe to run multiple times
- No duplicate data created
- Existing data is preserved
- No errors on re-runs

## Integration with Installation Wizard

The seed data system integrates with the installation wizard:

1. User completes installation form
2. Wizard calls `seedDefaultData()`
3. System verifies seeding with `verifySeeding()`
4. Success message displayed to user
5. User redirected to admin panel

## Usage Example

```typescript
'use server'

import { seedDefaultData, checkSeedingStatus } from '@/app/actions/seed'

export async function completeInstallation() {
  // Check if already seeded
  const status = await checkSeedingStatus()

  if (status.isSeeded) {
    return { success: true, message: 'Already seeded' }
  }

  // Execute seeding
  const result = await seedDefaultData()

  if (result.success) {
    return {
      success: true,
      message: `Seeded ${result.data?.boards} boards, ${result.data?.menus} menus, ${result.data?.pages} pages`
    }
  } else {
    return {
      success: false,
      message: result.error || 'Seeding failed'
    }
  }
}
```

## Testing

### Manual Testing

```typescript
// Test seeding status
const status = await checkSeedingStatus()
console.log('Is seeded:', status.isSeeded)

// Test seeding
const result = await seedDefaultData()
console.log('Seed result:', result)

// Test verification
const verification = await verifySeeding()
console.log('Verification:', verification)
```

### Automated Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { seedDefaultData, checkSeedingStatus, verifySeeding } from '@/app/actions/seed'

describe('Seed Data System', () => {
  it('should seed default data', async () => {
    const result = await seedDefaultData()
    expect(result.success).toBe(true)
    expect(result.data?.boards).toBeGreaterThanOrEqual(3)
  })

  it('should detect seeded status', async () => {
    const status = await checkSeedingStatus()
    expect(status.isSeeded).toBe(true)
  })

  it('should verify seeding integrity', async () => {
    const verification = await verifySeeding()
    expect(verification.success).toBe(true)
    expect(verification.results).toHaveLength(4)
  })
})
```

## Security Considerations

1. **Permission Checks**: Seeding functions should only be accessible to admin users
2. **Rate Limiting**: Prevent abuse by limiting seeding attempts
3. **Transaction Safety**: All operations use database transactions
4. **Input Validation**: All inputs are validated before insertion
5. **SQL Injection**: All queries use parameterized statements

## Performance Considerations

1. **Bulk Operations**: Use upsert for batch inserts
2. **Index Usage**: Queries use indexed columns (slug, name)
3. **Conflict Resolution**: ON CONFLICT avoids duplicate key errors
4. **Selective Counting**: Counts only specific default items

## Future Enhancements

Potential improvements for future versions:

1. **Configurable Seeds**: Allow users to select which default data to create
2. **Custom Templates**: Provide multiple seeding templates
3. **Seeding Profiles**: Create different profiles for different use cases
4. **Incremental Seeding**: Add new default data without re-seeding everything
5. **Seed Versioning**: Track seed versions for upgrade scenarios
6. **Data Migration**: Migrate existing data to new seed structures
7. **Seeding API**: Provide REST API for seeding operations

## Related Documentation

- [Admin Menu API](./ADMIN-MENU-API.md)
- [Migration Guide](./MIGRATION-GUIDE.md)
- [Database Schema](./DATABASE-SCHEMA.md)
- [Installation Guide](./INSTALLATION.md)

## SPEC Reference

- **SPEC ID**: SPEC-SETUP-001
- **Specification**: .moai/specs/SPEC-SETUP-001/spec.md
- **Implementation Date**: 2026-02-28
