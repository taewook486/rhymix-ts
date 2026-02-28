# SPEC-SETUP-001: Initial Setup System

**SPEC ID:** SPEC-SETUP-001
**Title:** Initial Setup System with Automatic Data Seeding
**Version:** 1.0.0
**Created:** 2026-02-28
**Status:** Planned
**Priority:** Critical
**Assigned:** manager-ddd (implementation), expert-backend (seeding), expert-frontend (dashboard widgets)

---

## Environment

**System Context:**
- Next.js 16 App Router application
- Supabase PostgreSQL 16 database
- TypeScript 5.9 codebase
- React 19 frontend components
- Installation wizard flow (6 steps)

**Dependencies:**
- Database schema migrations (001-013) must be complete
- Installation status tracking system operational
- User authentication system functional
- Admin role system configured

**External Systems:**
- Supabase database for data persistence
- Next.js server actions for API operations
- RLS policies for data security

---

## Assumptions

### Technical Assumptions

1. **Database Schema Complete**
   - All migration files (001-013) have been applied
   - Tables exist: boards, menus, layouts, pages, widgets, site_config
   - RLS policies configured and functional

2. **Installation Wizard Operational**
   - 6-step installation wizard functional
   - Installation status tracking works
   - Admin account creation successful

3. **Admin Dashboard Exists**
   - Admin panel accessible at `/admin`
   - Dashboard page component exists
   - Widget rendering infrastructure in place

4. **Permission System Active**
   - Role-based access control functional
   - Admin role can manage all resources
   - RLS policies enforce security

### Business Assumptions

1. **User Expectations**
   - New installations should have default content
   - Administrators expect functional site immediately
   - Dashboard should show useful information

2. **Content Requirements**
   - Korean language primary (default)
   - Professional default appearance
   - Easy to customize/delete defaults

---

## Requirements

### [R1] Automatic Board Seeding

**Type:** Ubiquitous
**Priority:** Critical

**Requirement:**
The system **shall** automatically create three default board modules during installation completion.

**Default Boards:**
1. **Free Board (자유게시판)**
   - Module ID: `board`
   - Module Category: `board`
   - Browser Title: `자유게시판` (Korean) / `Free Board` (English)
   - Description: `자유롭게 글을 작성할 수 있는 게시판입니다.`
   - Skin: `default`
   - Permissions: All users can read/write

2. **Q&A Board (질문답변)**
   - Module ID: `qna`
   - Module Category: `board`
   - Browser Title: `질문답변` (Korean) / `Q&A` (English)
   - Description: `질문과 답변을 주고받을 수 있는 게시판입니다.`
   - Skin: `default`
   - Permissions: All users can read/write

3. **Notice Board (공지사항)**
   - Module ID: `notice`
   - Module Category: `board`
   - Browser Title: `공지사항` (Korean) / `Notice` (English)
   - Description: `공지사항을 확인하실 수 있습니다.`
   - Skin: `default`
   - Permissions: All users can read, admin only write

**Acceptance Criteria:**
- [ ] Three boards created in `boards` table
- [ ] Each board has unique `id` (UUID)
- [ ] Each board has correct `mid` (module ID)
- [ ] Board permissions configured correctly
- [ ] Boards accessible via `/board`, `/qna`, `/notice` URLs

**EARS Pattern:**
```
The system shall always create three default board modules during installation completion.
```

---

### [R2] Menu Structure Seeding

**Type:** Ubiquitous
**Priority:** Critical

**Requirement:**
The system **shall** create three default menu structures with hierarchical items during installation completion.

**Menu Structures:**

1. **GNB (Global Navigation Bar - Main Menu)**
   - Menu SRL: 1
   - Title: `Main Menu`
   - Items:
     - Welcome (WIDGET type, module_id: `index`)
     - Free Board (board type, module_id: `board`)
     - Q&A (board type, module_id: `qna`)
     - Notice (board type, module_id: `notice`)

2. **UNB (Utility Navigation Bar)**
   - Menu SRL: 2
   - Title: `Utility Menu`
   - Items:
     - Rhymix Official Site (shortcut, external link: `https://rhymix.org/`)
     - Rhymix GitHub (shortcut, external link: `https://github.com/rhymix`)

3. **FNB (Footer Navigation Bar)**
   - Menu SRL: 3
   - Title: `Footer Menu`
   - Items:
     - Terms of Service (ARTICLE type, module_id: `terms`)
     - Privacy Policy (ARTICLE type, module_id: `privacy`)

**Acceptance Criteria:**
- [ ] Three menu structures created in `menus` table
- [ ] All menu items created in `menu_items` table
- [ ] Parent-child relationships correct
- [ ] Menu items reference correct boards/pages
- [ ] Shortcuts have correct external URLs
- [ ] Navigation renders correctly in frontend

**EARS Pattern:**
```
The system shall always create three default menu structures with hierarchical items during installation completion.
```

---

### [R3] Layout Configuration Seeding

**Type:** Ubiquitous
**Priority:** Critical

**Requirement:**
The system **shall** create default PC and mobile layout configurations during installation completion.

**PC Layout:**
- Layout Name: `default`
- Layout Type: `P` (PC)
- Title: `Default Layout`
- Skin: `default`
- Extra Variables:
  - `use_demo`: `true`
  - `use_ncenter_widget`: `true`
  - `content_fixed_width`: `true`
  - `gnb_menu_srl`: (reference to GNB menu)
  - `unb_menu_srl`: (reference to UNB menu)
  - `fnb_menu_srl`: (reference to FNB menu)

**Mobile Layout:**
- Layout Name: `default`
- Layout Type: `M` (Mobile)
- Title: `Mobile Layout`
- Skin: `default`
- Extra Variables:
  - `main_menu_srl`: (reference to GNB menu)

**Acceptance Criteria:**
- [ ] Two layouts created in `layouts` table
- [ ] PC layout references all three menus
- [ ] Mobile layout references main menu
- [ ] Layouts applied to site design configuration
- [ ] Frontend renders with default layout

**EARS Pattern:**
```
The system shall always create default PC and mobile layout configurations during installation completion.
```

---

### [R4] Welcome Page Creation

**Type:** Ubiquitous
**Priority:** Critical

**Requirement:**
The system **shall** create a default welcome page as the site homepage during installation completion.

**Welcome Page Content:**
- Module ID: `index`
- Module Type: `WIDGET`
- Title: `Welcome to Rhymix` (Korean: `Rhymix에 오신 것을 환영합니다`)
- Content Type: Widget content with document reference
- Content includes:
  - Welcome message
  - Quick start guide
  - Feature highlights
  - Admin panel link
- Mobile Content: Separate mobile-optimized version

**Acceptance Criteria:**
- [ ] Welcome page created in `pages` table
- [ ] Page content stored in `documents` table
- [ ] Widget content reference correct
- [ ] Homepage (`/`) displays welcome content
- [ ] Mobile homepage displays mobile content
- [ ] Page accessible to all users

**EARS Pattern:**
```
The system shall always create a default welcome page as the site homepage during installation completion.
```

---

### [R5] Dashboard Widget Configuration

**Type:** State-Driven
**Priority:** High

**Requirement:**
**IF** the admin dashboard exists, **THEN** the system **shall** configure default dashboard widgets.

**Default Widgets:**

1. **Recent Comments Widget**
   - Widget Name: `recent_comments`
   - Widget Type: `dashboard`
   - Position: `sidebar` (right column)
   - Configuration:
     - `count`: 5
     - `show_author`: true
     - `show_date`: true
     - `enable_actions`: true (trash, delete)
   - Title: `최근 댓글` (Korean) / `Recent Comments` (English)

2. **Latest Documents Widget**
   - Widget Name: `latest_documents`
   - Widget Type: `dashboard`
   - Position: `main` (left column)
   - Configuration:
     - `count`: 5
     - `show_author`: true
     - `show_date`: true
     - `enable_actions`: true (trash, delete)
   - Title: `최신 게시물` (Korean) / `Latest Documents` (English)

3. **Member Statistics Widget**
   - Widget Name: `member_stats`
   - Widget Type: `dashboard`
   - Position: `sidebar` (right column)
   - Configuration:
     - `show_total`: true
     - `show_today`: true
     - `show_link`: true
   - Title: `회원` (Korean) / `Members` (English)

4. **Document Statistics Widget**
   - Widget Name: `document_stats`
   - Widget Type: `dashboard`
   - Position: `main` (left column)
   - Configuration:
     - `show_total`: true
     - `show_today`: true
     - `show_link`: true
   - Title: `문서` (Korean) / `Documents` (English)

**Acceptance Criteria:**
- [ ] Widget configurations created in `widgets` table
- [ ] Widget data retrieval functions implemented
- [ ] Dashboard displays all four widgets
- [ ] Widgets show real data from database
- [ ] Widget actions (trash, delete) functional
- [ ] Widget refresh updates data

**EARS Pattern:**
```
IF the admin dashboard exists THEN the system shall configure default dashboard widgets.
```

---

### [R6] Site Configuration Defaults

**Type:** Ubiquitous
**Priority:** High

**Requirement:**
The system **shall** populate site configuration with default values during installation completion.

**Default Configuration:**

| Key | Default Value | Category | Public | Description |
|-----|---------------|----------|--------|-------------|
| `site.name` | (from installation wizard) | general | true | Site display name |
| `site.description` | (from installation wizard) | general | true | Site description |
| `site.language` | `ko` | general | true | Default language |
| `site.timezone` | `Asia/Seoul` | general | true | Site timezone |
| `site.theme` | `default` | appearance | true | Active theme |
| `site.logo_url` | `null` | appearance | true | Logo URL |
| `site.favicon_url` | `null` | appearance | true | Favicon URL |
| `seo.meta_keywords` | `[]` | seo | true | Meta keywords |
| `seo.google_analytics_id` | `null` | seo | false | Analytics ID |
| `auth.allow_registration` | `true` | security | false | Allow registration |
| `auth.require_email_verification` | `true` | security | false | Email verification |
| `auth.allow_social_login` | `false` | security | false | Social login |
| `email.smtp_enabled` | `false` | email | false | SMTP enabled |
| `features.allow_file_upload` | `true` | features | false | File uploads |
| `features.max_file_size` | `10485760` | features | false | Max file size (10MB) |
| `modules.board.skin` | `default` | appearance | true | Board skin |
| `modules.editor.skin` | `ckeditor` | appearance | true | Editor skin |

**Acceptance Criteria:**
- [ ] All configuration keys present in `site_config` table
- [ ] Values match installation wizard input
- [ ] Default values applied for non-user-specified keys
- [ ] Configuration accessible via API
- [ ] Admin can modify configuration
- [ ] Public configs accessible without auth

**EARS Pattern:**
```
The system shall always populate site configuration with default values during installation completion.
```

---

### [R7] Seeding Transaction Integrity

**Type:** State-Driven
**Priority:** Critical

**Requirement:**
**IF** any seeding operation fails, **THEN** the system **shall** rollback all seeding changes and report the error.

**Transaction Requirements:**
- All seeding operations wrapped in database transaction
- Transaction commits only if all operations succeed
- Transaction rolls back if any operation fails
- Error details logged for debugging
- Installation status updated to reflect failure
- User notified of failure with actionable message

**Rollback Scope:**
- Board seeding
- Menu seeding
- Layout seeding
- Page seeding
- Widget seeding
- Configuration seeding

**Acceptance Criteria:**
- [ ] Seeding uses database transaction
- [ ] Partial seeding rolls back completely
- [ ] Error messages include failure details
- [ ] Installation status reflects seeding state
- [ ] Retry mechanism available
- [ ] No orphaned data after rollback

**EARS Pattern:**
```
IF any seeding operation fails THEN the system shall rollback all seeding changes and report the error.
```

---

### [R8] Installation Wizard Integration

**Type:** Event-Driven
**Priority:** Critical

**Requirement:**
**WHEN** the installation wizard reaches step 6 (completion), **THEN** the system **shall** execute the data seeding process.

**Integration Points:**
- Step 5: Database schema creation completes
- Step 5.5: Data seeding executes (NEW)
- Step 6: Installation marked complete

**Seeding Process:**
1. Verify database schema exists
2. Start database transaction
3. Seed default boards
4. Seed menu structures
5. Seed layouts
6. Seed welcome page
7. Seed dashboard widgets
8. Seed site configuration
9. Verify all seeds successful
10. Commit transaction
11. Update installation status

**Acceptance Criteria:**
- [ ] Seeding executes automatically at correct step
- [ ] User sees seeding progress indicator
- [ ] Seeding errors halt installation
- [ ] Successful seeding continues to completion
- [ ] Seeding duration displayed
- [ ] User can review seeded content

**EARS Pattern:**
```
WHEN the installation wizard reaches step 6 completion THEN the system shall execute the data seeding process.
```

---

### [R9] Seeding Idempotency

**Type:** State-Driven
**Priority:** High

**Requirement:**
**IF** seeding has already been executed, **THEN** the system **shall** skip seeding without error.

**Idempotency Requirements:**
- Check for existing seeded data before seeding
- Use `ON CONFLICT DO NOTHING` for INSERT operations
- Log skipped seeding operations
- Installation completes successfully even if data exists
- No duplicate data created

**Idempotency Checks:**
- Boards: Check if `mid` already exists
- Menus: Check if `menu_srl` already exists
- Layouts: Check if `layout_name` + `layout_type` exists
- Pages: Check if `mid` already exists
- Widgets: Check if `widget_name` already exists
- Config: Check if `key` already exists

**Acceptance Criteria:**
- [ ] Re-running seeding doesn't create duplicates
- [ ] Existing data preserved
- [ ] No errors on re-seed
- [ ] Installation idempotent
- [ ] Log shows skipped operations

**EARS Pattern:**
```
IF seeding has already been executed THEN the system shall skip seeding without error.
```

---

### [R10] Admin Dashboard Widget Data API

**Type:** Event-Driven
**Priority:** High

**Requirement:**
**WHEN** the admin dashboard loads, **THEN** the system **shall** provide API endpoints for widget data retrieval.

**API Endpoints:**

1. **Dashboard Statistics**
   - Endpoint: `GET /api/admin/dashboard/stats`
   - Response:
     ```typescript
     {
       members: { total: number, today: number };
       documents: { total: number, today: number };
       comments: { total: number, today: number };
     }
     ```
   - Auth: Admin role required

2. **Recent Comments**
   - Endpoint: `GET /api/admin/dashboard/recent-comments?limit=5`
   - Response:
     ```typescript
     Array<{
       comment_srl: string;
       document_srl: string;
       content: string;
       nick_name: string;
       member_srl: string;
       regdate: string;
     }>
     ```
   - Auth: Admin role required

3. **Latest Documents**
   - Endpoint: `GET /api/admin/dashboard/latest-documents?limit=5`
   - Response:
     ```typescript
     Array<{
       document_srl: string;
       module_srl: string;
       title: string;
       nick_name: string;
       member_srl: string;
       regdate: string;
     }>
     ```
   - Auth: Admin role required

**Acceptance Criteria:**
- [ ] API endpoints return correct data
- [ ] Admin authentication enforced
- [ ] Rate limiting applied
- [ ] Response time under 200ms
- [ ] Error handling graceful
- [ ] API documented

**EARS Pattern:**
```
WHEN the admin dashboard loads THEN the system shall provide API endpoints for widget data retrieval.
```

---

### [R11] Seeding Performance

**Type:** State-Driven
**Priority:** Medium

**Requirement:**
**IF** the seeding process executes, **THEN** the system **shall** complete all seeding operations within 5 seconds.

**Performance Requirements:**
- Total seeding time: < 5 seconds
- Individual seed operation: < 1 second
- Database queries: < 50ms each
- Memory usage: < 100MB
- No timeout errors

**Optimization Strategies:**
- Batch INSERT operations
- Use prepared statements
- Minimize round trips
- Parallel independent operations
- Cache references

**Acceptance Criteria:**
- [ ] Seeding completes within 5 seconds
- [ ] No timeout errors
- [ ] Performance metrics logged
- [ ] User sees progress indicator
- [ ] System remains responsive

**EARS Pattern:**
```
IF the seeding process executes THEN the system shall complete all seeding operations within 5 seconds.
```

---

### [R12] Seeding Verification

**Type:** Event-Driven
**Priority:** High

**Requirement:**
**WHEN** seeding completes, **THEN** the system **shall** verify all seeded data integrity.

**Verification Checks:**
- All boards exist and accessible
- Menu hierarchy complete
- Layout configuration valid
- Welcome page displays
- Widgets functional
- Configuration complete
- No orphaned data
- Foreign key constraints satisfied

**Verification Process:**
1. Query each seeded table
2. Count expected records
3. Validate data structure
4. Test foreign key references
5. Check RLS policies
6. Verify public access

**Acceptance Criteria:**
- [ ] Verification executes automatically
- [ ] Verification results logged
- [ ] Failed verification triggers rollback
- [ ] User sees verification summary
- [ ] Installation status reflects verification

**EARS Pattern:**
```
WHEN seeding completes THEN the system shall verify all seeded data integrity.
```

---

## Specifications

### Technical Design

**Database Migration File:**
```
supabase/migrations/014_initial_data_seed.sql
```

**Server Action:**
```
app/actions/seed-initial-data.ts
```

**Installation Wizard Integration:**
```
app/(auth)/install/page.tsx (step 5.5 addition)
```

**Dashboard Widget Components:**
```
components/admin/DashboardWidgets.tsx
components/admin/widgets/RecentCommentsWidget.tsx
components/admin/widgets/LatestDocumentsWidget.tsx
components/admin/widgets/MemberStatsWidget.tsx
components/admin/widgets/DocumentStatsWidget.tsx
```

**API Endpoints:**
```
app/api/admin/dashboard/stats/route.ts
app/api/admin/dashboard/recent-comments/route.ts
app/api/admin/dashboard/latest-documents/route.ts
```

### Data Model

**Board Seeding:**
```sql
INSERT INTO boards (id, mid, module_category, browser_title, description, skin, permissions, created_at)
VALUES
  (gen_random_uuid(), 'board', 'board', '자유게시판', '자유롭게 글을 작성할 수 있는 게시판입니다.', 'default', '{"read": "all", "write": "all"}', NOW()),
  (gen_random_uuid(), 'qna', 'board', '질문답변', '질문과 답변을 주고받을 수 있는 게시판입니다.', 'default', '{"read": "all", "write": "all"}', NOW()),
  (gen_random_uuid(), 'notice', 'board', '공지사항', '공지사항을 확인하실 수 있습니다.', 'default', '{"read": "all", "write": "admin"}', NOW());
```

**Menu Seeding:**
```sql
-- Create menu structures
WITH gnb AS (
  INSERT INTO menus (id, menu_srl, title, created_at)
  VALUES (gen_random_uuid(), 1, 'Main Menu', NOW())
  RETURNING id
),
unb AS (
  INSERT INTO menus (id, menu_srl, title, created_at)
  VALUES (gen_random_uuid(), 2, 'Utility Menu', NOW())
  RETURNING id
),
fnb AS (
  INSERT INTO menus (id, menu_srl, title, created_at)
  VALUES (gen_random_uuid(), 3, 'Footer Menu', NOW())
  RETURNING id
)
-- Insert menu items with references
INSERT INTO menu_items (id, menu_id, parent_id, menu_name, module_type, module_id, url, is_shortcut, sort_order)
SELECT ... -- (Full INSERT statements for all menu items)
```

### Component Architecture

**Dashboard Widget Component:**
```typescript
interface DashboardWidgetProps {
  widgetId: string;
  config: WidgetConfig;
  position: 'main' | 'sidebar';
}

export async function DashboardWidget({ widgetId, config, position }: DashboardWidgetProps) {
  const data = await fetchWidgetData(widgetId, config);

  return (
    <section className={`widget widget-${widgetId} widget-${position}`}>
      <h2>{config.title}</h2>
      <WidgetContent data={data} config={config} />
      <WidgetActions config={config} />
    </section>
  );
}
```

**Seeding Server Action:**
```typescript
export async function seedInitialData(installationId: string): Promise<SeedResult> {
  const supabase = createClient();

  try {
    // Start transaction
    await supabase.rpc('begin_transaction');

    // Seed boards
    const boards = await seedBoards(supabase);

    // Seed menus
    const menus = await seedMenus(supabase);

    // Seed layouts
    const layouts = await seedLayouts(supabase, menus);

    // Seed welcome page
    const page = await seedWelcomePage(supabase);

    // Seed widgets
    const widgets = await seedWidgets(supabase);

    // Seed configuration
    await seedSiteConfig(supabase);

    // Verify seeding
    await verifySeeding(supabase);

    // Commit transaction
    await supabase.rpc('commit_transaction');

    return { success: true, data: { boards, menus, layouts, page, widgets } };
  } catch (error) {
    // Rollback transaction
    await supabase.rpc('rollback_transaction');
    return { success: false, error: error.message };
  }
}
```

### Error Handling

**Seeding Error Response:**
```typescript
interface SeedError {
  code: string;
  message: string;
  details: {
    operation: string;
    table: string;
    constraint?: string;
    hint?: string;
  };
}

// Example error
{
  code: 'SEED_BOARD_FAILED',
  message: 'Failed to create default board',
  details: {
    operation: 'INSERT',
    table: 'boards',
    constraint: 'boards_mid_unique',
    hint: 'Board with mid "board" already exists'
  }
}
```

---

## Traceability

**Related SPECs:**
- SPEC-RHYMIX-001: Rhymix Migration Overview
- SPEC-AUTH-001: Authentication System (if exists)
- SPEC-ADMIN-001: Admin Panel System (if exists)

**Dependencies:**
- Database schema migrations (001-013)
- Installation wizard (6 steps)
- User authentication system
- Admin role system
- RLS policy system

**Blocks:**
- None (this is a foundational feature)

**Blocked By:**
- Database schema completion
- Installation wizard completion
- Authentication system completion

---

## Acceptance Criteria Summary

**Functional:**
- [ ] 3 default boards created and accessible
- [ ] 3 menu structures with correct hierarchy
- [ ] PC and mobile layouts configured
- [ ] Welcome page displays as homepage
- [ ] Dashboard shows 4 widgets with real data
- [ ] Site configuration populated
- [ ] Navigation links functional

**Performance:**
- [ ] Seeding completes within 5 seconds
- [ ] No timeout errors
- [ ] API responses under 200ms
- [ ] Dashboard loads within 2 seconds

**Quality:**
- [ ] No orphaned data
- [ ] All foreign keys satisfied
- [ ] RLS policies applied
- [ ] Transaction integrity maintained
- [ ] Idempotent operations

**User Experience:**
- [ ] Installation wizard shows seeding progress
- [ ] Default content professional
- [ ] Easy to modify/delete defaults
- [ ] Clear error messages
- [ ] Retry mechanism available

---

## Definition of Done

- [ ] All requirements implemented
- [ ] All acceptance criteria met
- [ ] Unit tests passing (85%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] TRUST 5 quality gates passed

---

**SPEC Created:** 2026-02-28
**Last Updated:** 2026-02-28
**Next Review:** Implementation planning
