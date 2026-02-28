# Initial Setup System - Deep Research Analysis

**SPEC ID:** SPEC-SETUP-001
**Research Date:** 2026-02-28
**Analyst:** manager-spec agent
**Purpose:** Analyze ASIS (Rhymix PHP) initial setup system and identify gaps in TOBE implementation

---

## Executive Summary

This research reveals that the ASIS Rhymix PHP system includes comprehensive automatic initialization during installation that creates:

1. **3 Default Boards** (Free Board, Q&A, Notice)
2. **3 Menu Structures** (GNB - Main Menu, UNB - Utility Menu, FNB - Footer Menu)
3. **2 Layouts** (PC and Mobile)
4. **1 Welcome Page** with widget content
5. **Admin Dashboard Widgets** (Recent Comments, Latest Documents)
6. **Site Configuration** with default settings

**Critical Finding:** TOBE currently lacks ALL automatic initial data seeding functionality, representing a significant feature gap.

---

## ASIS Initial Setup Analysis

### 1. Installation Script Execution Flow

**File:** `C:\project\rhymix\modules\install\script\ko.install.php`

**Execution Context:**
- Runs during `procInstall()` method in `install.controller.php`
- Executed after all module tables are created
- Has access to logged-in admin user context
- Uses MenuAdminController, LayoutAdminController, ModuleController

**Key Dependencies:**
```php
$oMenuAdminController = getAdminController('menu');
$oLayoutAdminController = getAdminController('layout');
$oModuleController = getController('module');
$oDocumentController = getController('document');
```

### 2. Default Board Creation

**Boards Created:**

| Board ID | Menu Name | Module Type | Purpose |
|----------|-----------|-------------|---------|
| `board` | Free Board (자유게시판) | board | General community discussions |
| `qna` | Q&A (질문답변) | board | Question and answer forum |
| `notice` | Notice (공지사항) | board | Official announcements |

**Creation Method:**
```php
// Board creation happens via menu item insertion
Context::set('module_type', 'board', TRUE);
Context::set('module_id', 'board', TRUE);
$output = $oMenuAdminController->procMenuAdminInsertItem();
```

**Technical Details:**
- Boards are created as menu items with `module_type = 'board'`
- Each board gets unique `module_srl` (sequence number)
- Board mid (module ID) is set: 'board', 'qna', 'notice'
- No explicit board configuration (uses defaults)

### 3. Default Menu Structure

**Menu Hierarchy:**

```
GNB (Global Navigation Bar - Main Menu)
├── Welcome (WIDGET - index page)
├── Free Board (board module - 'board')
├── Q&A (board module - 'qna')
└── Notice (board module - 'notice')

UNB (Utility Navigation Bar)
├── Rhymix Official Site (shortcut - external link)
└── Rhymix GitHub (shortcut - external link)

FNB (Footer Navigation Bar)
├── Terms of Service (ARTICLE page - 'terms')
└── Privacy Policy (ARTICLE page - 'privacy')
```

**Menu Creation Algorithm:**

```php
function __makeMenu(&$list, $parent_srl) {
    foreach($list as $idx => &$item) {
        Context::set('parent_srl', $parent_srl, TRUE);
        Context::set('menu_name', $item['menu_name'], TRUE);
        Context::set('module_type', $item['module_type'], TRUE);
        Context::set('module_id', $item['module_id'], TRUE);
        if($item['is_shortcut'] === 'Y') {
            Context::set('is_shortcut', 'Y', TRUE);
            Context::set('shortcut_target', $item['shortcut_target'], TRUE);
        }
        $output = $oMenuAdminController->procMenuAdminInsertItem();
        $menu_srl = $oMenuAdminController->get('menu_item_srl');
        $item['menu_srl'] = $menu_srl;
        if($item['list']) __makeMenu($item['list'], $menu_srl);
    }
}
```

### 4. Layout Configuration

**PC Layout:**
- **Layout Name:** XEDITION
- **Layout Type:** P (PC)
- **Skin:** xedition
- **Configuration:**
  - `use_demo`: Y
  - `use_ncenter_widget`: Y
  - `content_fixed_width`: Y
  - GNB menu reference
  - UNB menu reference
  - FNB menu reference

**Mobile Layout:**
- **Layout Name:** default
- **Layout Type:** M (Mobile)
- **Skin:** default
- **Configuration:**
  - main_menu: GNB menu reference

**Design Configuration:**
```php
$designInfo->layout_srl = $layout_srl;
$designInfo->mlayout_srl = $mlayout_srl;
$designInfo->module->board->skin = 'xedition';
$designInfo->module->editor->skin = 'ckeditor';
```

### 5. Welcome Page Content

**Page Structure:**
- **Title:** "Welcome to Rhymix"
- **Type:** Widget content page
- **Template:** `modules/install/script/welcome_content/welcome_content.html`
- **Content Storage:** Document table with `document_srl`
- **Widget Rendering:**
  ```html
  <img hasContent="true" class="zbxe_widget_output"
       widget="widgetContent"
       document_srl="{$document_srl}" />
  ```

**Mobile Version:**
- **Title:** "Welcome to Mobile Rhymix"
- Separate mobile-optimized content

### 6. Admin Dashboard Widgets

**File:** `modules/admin/tpl/_dashboard_default.html`

**Widgets Implemented:**

1. **Recent Comments Widget:**
   - Title: Latest Comments (최근 댓글)
   - Data Source: `CommentModel::getNewestCommentList()`
   - List Count: 5 items
   - Display: Comment summary + author nickname
   - Actions: Trash, Delete

2. **Latest Documents Widget:**
   - Title: Latest Documents (최신 게시물)
   - Data Source: `DocumentModel::getDocumentList()`
   - List Count: 5 items
   - Display: Document title + author nickname
   - Actions: Trash, Delete

3. **Member Statistics Widget:**
   - Title: Members
   - Data Source: `MemberAdminModel::getMemberCountByDate()`
   - Display: Total count + today's count
   - Link: Member admin list

4. **Document Statistics Widget:**
   - Title: Documents
   - Data Source: `DocumentAdminModel::getDocumentCountByDate()`
   - Display: Total count + today's count
   - Link: Document admin list

**Dashboard Controller:**
- **File:** `modules/admin/controllers/Dashboard.php`
- **Main Method:** `dispAdminIndex()`
- **Statistics Gathering:**
  - Member count (total + today)
  - Document count (total + today)
  - Latest 5 documents
  - Latest 5 comments
  - Latest 5 members (if counter addon disabled)

### 7. Site Configuration Initialization

**Default Configuration Keys:**

```sql
-- From initialize_site_config() function
'site.name'
'site.description'
'site.language'
'site.timezone'
'site.admin_email'
'site.logo_url'
'site.favicon_url'
'site.theme'
'seo.meta_keywords'
'seo.google_analytics_id'
'auth.allow_registration'
'auth.require_email_verification'
'auth.allow_social_login'
'email.smtp_enabled'
'features.allow_file_upload'
'features.max_file_size'
```

**Default Values:**
- `site.language`: 'ko'
- `site.timezone`: 'Asia/Seoul'
- `auth.allow_registration`: true
- `auth.require_email_verification`: true
- `features.max_file_size`: 10485760 (10MB)

### 8. Module Skin Configuration

**Default Skins:**
```php
$designInfo->module->board->skin = 'xedition';
$designInfo->module->editor->skin = 'ckeditor';
```

**Skin Types:**
- PC Skins: `skins/` directory
- Mobile Skins: `m.skins/` directory

---

## TOBE Current State Analysis

### 1. Installation Status Table

**File:** `supabase/migrations/003_installation_status.sql`

**Status:** ✅ IMPLEMENTED

**Features:**
- Installation progress tracking (6 steps)
- Site configuration storage
- Error handling
- RLS policies

**Missing:**
- No default data seeding
- No board creation
- No menu creation
- No layout configuration

### 2. Boards Table

**File:** `supabase/migrations/009_boards_table.sql`

**Status:** ✅ TABLE EXISTS

**Missing:**
- No default boards seeded
- No automatic creation during installation

### 3. Widgets System

**File:** `supabase/migrations/010_widget_system.sql`

**Status:** ✅ TABLE EXISTS

**Missing:**
- No dashboard widgets defined
- No default widget configurations

### 4. Pages Table

**File:** `supabase/migrations/011_pages_table.sql`

**Status:** ✅ TABLE EXISTS

**Missing:**
- No welcome page seeded
- No default content templates

### 5. Layouts Table

**File:** `supabase/migrations/013_layouts_table.sql`

**Status:** ✅ TABLE EXISTS

**Missing:**
- No default layouts seeded
- No XEDITION layout configuration

### 6. Messages Table

**File:** `supabase/migrations/012_messages_table.sql`

**Status:** ✅ TABLE EXISTS

**Missing:**
- Not related to initial setup

---

## Gap Analysis Summary

### Critical Gaps (Must Implement)

1. **No Default Boards Seeding**
   - Missing: Free Board, Q&A, Notice
   - Impact: New installation has no content areas

2. **No Menu Structure Seeding**
   - Missing: GNB, UNB, FNB menu hierarchies
   - Impact: Navigation completely empty

3. **No Welcome Page Creation**
   - Missing: Index page with widget content
   - Impact: Homepage shows 404 or empty state

4. **No Layout Configuration**
   - Missing: Default PC and mobile layouts
   - Impact: No theme applied, broken appearance

5. **No Dashboard Widgets**
   - Missing: Recent comments, latest documents widgets
   - Impact: Admin dashboard empty, no quick overview

6. **No Site Configuration Seeding**
   - Missing: Default site settings
   - Impact: Configuration values undefined

### High Priority Gaps (Should Implement)

7. **No Default Skins Configuration**
   - Missing: Board skin, editor skin defaults
   - Impact: Modules use generic appearance

8. **No Admin Favorites**
   - Missing: Quick access to frequently used modules
   - Impact: Admin navigation less efficient

9. **No Terms/Privacy Pages**
   - Missing: Legal compliance pages
   - Impact: Site may lack required legal pages

### Medium Priority Gaps (Nice to Have)

10. **No External Shortcuts**
    - Missing: Links to Rhymix official resources
    - Impact: Less helpful for new administrators

11. **No Demo Content**
    - Missing: Sample posts in boards
    - Impact: Site appears completely empty

---

## Implementation Strategy

### Phase 1: Database Seeding (Priority: CRITICAL)

**Approach:** Create SQL migration file with default data

**Files to Create:**
1. `supabase/migrations/014_initial_data_seed.sql`

**Data to Seed:**
- 3 default boards
- 3 menu structures with items
- 2 layouts (PC + mobile)
- 1 welcome page
- Site configuration defaults
- Dashboard widget configurations

### Phase 2: Installation Wizard Enhancement (Priority: HIGH)

**Approach:** Enhance installation wizard to execute seeding

**Files to Modify:**
1. `app/(auth)/install/page.tsx` - Add seeding step
2. `app/actions/installation.ts` - Add seeding server action

**New Functionality:**
- Call seeding function after step 6 completion
- Verify seeding success before marking complete
- Display seeded content preview

### Phase 3: Dashboard Widget Implementation (Priority: HIGH)

**Approach:** Create dashboard widget components

**Files to Create:**
1. `components/admin/DashboardWidgets.tsx`
2. `components/admin/RecentCommentsWidget.tsx`
3. `components/admin/LatestDocumentsWidget.tsx`
4. `components/admin/MemberStatsWidget.tsx`

**API Endpoints:**
1. `app/api/admin/dashboard/stats/route.ts`
2. `app/api/admin/dashboard/recent-comments/route.ts`
3. `app/api/admin/dashboard/latest-documents/route.ts`

### Phase 4: Welcome Page Template (Priority: MEDIUM)

**Approach:** Create default welcome page template

**Files to Create:**
1. `templates/welcome-page.tsx`
2. `public/images/welcome/` - Placeholder images

**Content:**
- Welcome message
- Quick start guide
- Feature highlights
- Admin quick links

---

## Technical Specifications

### Seeding Migration Structure

```sql
-- File: 014_initial_data_seed.sql

-- Section 1: Default Boards
INSERT INTO boards (id, mid, module_category, browser_title, description, skin, created_at)
VALUES
  (gen_random_uuid(), 'board', 'board', '자유게시판', 'Free discussion board', 'default', NOW()),
  (gen_random_uuid(), 'qna', 'board', '질문답변', 'Q&A forum', 'default', NOW()),
  (gen_random_uuid(), 'notice', 'board', '공지사항', 'Official announcements', 'default', NOW());

-- Section 2: Menu Structures
INSERT INTO menus (id, title, menu_srl)
VALUES
  (gen_random_uuid(), 'Main Menu', 1),
  (gen_random_uuid(), 'Utility Menu', 2),
  (gen_random_uuid(), 'Footer Menu', 3);

-- Section 3: Menu Items
-- (Hierarchical menu items referencing boards and pages)

-- Section 4: Layouts
INSERT INTO layouts (id, layout_name, layout_type, title, extra_vars)
VALUES
  (gen_random_uuid(), 'default', 'P', 'Default Layout', '{"use_demo": true}'),
  (gen_random_uuid(), 'default', 'M', 'Mobile Layout', '{}');

-- Section 5: Welcome Page
INSERT INTO pages (id, mid, title, content, module_type)
VALUES (gen_random_uuid(), 'index', 'Welcome to Rhymix', '<welcome content>', 'WIDGET');

-- Section 6: Site Configuration
-- (Already handled by initialize_site_config() function)

-- Section 7: Dashboard Widgets
INSERT INTO widgets (id, widget_name, widget_type, position, config)
VALUES
  (gen_random_uuid(), 'recent_comments', 'dashboard', 'sidebar', '{"count": 5}'),
  (gen_random_uuid(), 'latest_documents', 'dashboard', 'main', '{"count": 5}');
```

### Installation Wizard Flow Update

```typescript
// Current Flow:
Step 1: Database Configuration
Step 2: Admin Account
Step 3: Site Settings
Step 4: Configuration Review
Step 5: Installation Progress
Step 6: Complete

// Updated Flow:
Step 1: Database Configuration
Step 2: Admin Account
Step 3: Site Settings
Step 4: Configuration Review
Step 5: Installation Progress
Step 5.5: Initial Data Seeding (NEW)
Step 6: Complete
```

---

## Risk Assessment

### High Risk

1. **Data Integrity**
   - Risk: Seeding fails partway through
   - Mitigation: Use database transactions
   - Rollback: Clean up partial seeds

2. **ID Conflicts**
   - Risk: Hardcoded UUIDs conflict with existing data
   - Mitigation: Use `gen_random_uuid()` dynamically
   - Validation: Check for conflicts before insert

3. **Permission Issues**
   - Risk: RLS policies block seeding
   - Mitigation: Temporarily disable RLS during seeding
   - Alternative: Use SECURITY DEFINER functions

### Medium Risk

4. **Performance Impact**
   - Risk: Large seed operations timeout
   - Mitigation: Batch inserts, optimize queries
   - Monitoring: Track seeding duration

5. **Template Compatibility**
   - Risk: Welcome page references missing assets
   - Mitigation: Include placeholder images
   - Fallback: Use text-only template

### Low Risk

6. **User Confusion**
   - Risk: Users don't understand default content
   - Mitigation: Clear documentation, easy deletion
   - Guidance: Show seeded content in admin panel

---

## Testing Strategy

### Unit Tests

1. **Seeding Functions**
   - Test each seeding function independently
   - Verify data integrity after insert
   - Test rollback on failure

2. **Default Data Validation**
   - Verify board creation
   - Verify menu hierarchy
   - Verify layout configuration

### Integration Tests

3. **Installation Flow**
   - Test complete installation from start to finish
   - Verify all default data present
   - Test with fresh database

4. **Dashboard Widgets**
   - Test widget data retrieval
   - Test widget display
   - Test widget actions (delete, trash)

### E2E Tests

5. **User Journey**
   - Install system as new user
   - Verify homepage displays correctly
   - Verify navigation works
   - Verify admin dashboard shows widgets

---

## Success Criteria

1. **Functional Requirements**
   - ✅ 3 default boards created and accessible
   - ✅ 3 menu structures with correct hierarchy
   - ✅ Homepage displays welcome content
   - ✅ Admin dashboard shows widgets
   - ✅ All navigation links functional

2. **Performance Requirements**
   - ✅ Seeding completes within 5 seconds
   - ✅ No timeout errors during installation
   - ✅ Homepage loads within 2 seconds

3. **Quality Requirements**
   - ✅ No orphaned data in database
   - ✅ All foreign key constraints satisfied
   - ✅ RLS policies properly applied

4. **User Experience Requirements**
   - ✅ Installation wizard clear and intuitive
   - ✅ Default content professional and helpful
   - ✅ Easy to modify/delete default content

---

## References

### ASIS Files Analyzed
- `modules/install/install.controller.php` - Installation controller
- `modules/install/script/ko.install.php` - Korean installation script
- `modules/admin/tpl/_dashboard_default.html` - Dashboard template
- `modules/admin/controllers/Dashboard.php` - Dashboard controller

### TOBE Files Analyzed
- `supabase/migrations/003_installation_status.sql` - Installation tracking
- `supabase/migrations/009_boards_table.sql` - Board schema
- `supabase/migrations/010_widget_system.sql` - Widget schema
- `supabase/migrations/011_pages_table.sql` - Page schema
- `supabase/migrations/013_layouts_table.sql` - Layout schema

### Related Documentation
- SPEC-RHYMIX-001 - Rhymix migration overview
- MoAI-ADK Documentation - SPEC creation workflow
- Supabase Documentation - Database seeding best practices

---

**Research Completed:** 2026-02-28
**Next Step:** Create SPEC document with EARS requirements
**Estimated Implementation Time:** 2-3 development cycles
