# Rhymix Original System Analysis

## Analysis Overview

**Date:** 2026-02-22
**Source:** C:\GitHub\rhymix (Original PHP CMS)
**Target:** C:\project\rhymix-ts (Next.js 16 + TypeScript + Supabase)
**Purpose:** Comprehensive analysis of original Rhymix modules for TypeScript conversion

---

## 1. Module Inventory

### Core Modules (33 Total)

| Module | Purpose | Schema Count | Priority | Status |
|--------|---------|--------------|----------|--------|
| **member** | User management, authentication | 17 | CRITICAL | ✅ Migrated |
| **document** | Content/document management | 11 | CRITICAL | ✅ Migrated |
| **comment** | Comment system | 1 | CRITICAL | ✅ Migrated |
| **board** | Forum/board system | 0* | CRITICAL | ✅ Migrated |
| **file** | File upload/management | 1 | HIGH | ✅ Migrated |
| **menu** | Navigation/menu system | 2 | HIGH | ✅ Migrated |
| **page** | Static page creation | 0 | MEDIUM | ✅ Migrated |
| **layout** | Layout management | 1 | MEDIUM | ⚠️ Partial |
| **editor** | WYSIWYG editor integration | 3 | HIGH | ❌ Not Started |
| **addon** | Extension system | 2 | LOW | ❌ Not Started |
| **widget** | Widget system | 0 | MEDIUM | ❌ UI Only |
| **point** | User points/rewards | 1 | LOW | ✅ Migrated |
| **poll** | Poll/survey system | 4 | LOW | ❌ Not Started |
| **tag** | Tag system | 1 | MEDIUM | ✅ Migrated |
| **rss** | RSS feed generation | 0 | LOW | ❌ Not Started |
| **spamfilter** | Spam filtering | 0 | LOW | ❌ Not Started |
| **trash** | Trash/soft delete | 0 | MEDIUM | ⚠️ Partial |
| **counter** | Visit counter | 0 | LOW | ❌ Not Started |
| **communication** | Messaging/notifications | 0 | MEDIUM | ⚠️ Partial |
| **ncenterlite** | Notification center | 0 | MEDIUM | ⚠️ Partial |
| **session** | Session management | 0 | CRITICAL | ✅ Supabase Auth |
| **install** | Installation wizard | 0 | ONE-TIME | ✅ Completed |

**Note:** Board module doesn't have separate schema files - it uses `documents` table with `module_srl` filtering.

---

## 2. Database Schema Analysis

### 2.1 Member Module (17 Tables)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **member** | User accounts | ✅ profiles | Extended auth.users |
| **member_agreed** | Agreement tracking | ❌ | Requires new table |
| **member_auth_mail** | Email verification | ❌ | Requires new table |
| **member_auth_sms** | SMS verification | ❌ | Requires new table |
| **member_autologin** | Auto-login tokens | ❌ | Supabase handles this |
| **member_count_history** | Point history | ✅ points | Implemented as points table |
| **member_denied_nick_name** | Banned nicknames | ❌ | Requires new table |
| **member_denied_user_id** | Banned user IDs | ❌ | Requires new table |
| **member_devices** | Device management | ❌ | Requires new table |
| **member_group** | User groups | ✅ permissions | Implemented as groups |
| **member_group_member** | Group membership | ✅ permissions_group_members | Migrated |
| **member_join_form** | Custom join fields | ❌ | Requires new table |
| **member_login_count** | Login statistics | ❌ | Requires new table |
| **member_managed_email_hosts** | Email domain restrictions | ❌ | Requires new table |
| **member_nickname_log** | Nickname change history | ❌ | Requires new table |
| **member_scrap** | Scraps/bookmarks | ✅ scraps | Migrated |
| **member_scrap_folders** | Scrap organization | ✅ scrap_folders | Migrated |

**Key Fields from member table:**
- member_srl (PK) → id (UUID)
- user_id (unique) → email (from auth.users)
- password → handled by Supabase Auth
- email_address → email (from auth.users)
- nick_name → display_name
- status (APPROVED/DENIED/UNAUTHED/SUSPENDED/DELETED) → status + banned_at
- is_admin → role (admin/moderator/user/guest)
- list_order → order_index

### 2.2 Document Module (11 Tables)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **documents** | Content items | ✅ documents + posts | Split into two tables |
| **document_aliases** | URL aliases | ❌ | Requires new table |
| **document_categories** | Categories | ✅ categories | Unified with board categories |
| **document_declared** | Reported content | ✅ posts (is_blind) | Integrated |
| **document_declared_log** | Report history | ❌ | Requires new table |
| **document_extra_keys** | Extra field definitions | ❌ | Requires new table |
| **document_extra_vars** | Extra field values | ✅ metadata (JSONB) | Simplified |
| **document_histories** | Edit history | ✅ document_versions | Migrated |
| **document_readed_log** | Read tracking | ❌ | Requires new table |
| **document_trash** | Trash storage | ✅ deleted_at | Soft delete |
| **document_update_log** | Update tracking | ❌ | Requires new table |
| **document_voted_log** | Vote history | ✅ votes | Migrated |

**Key Fields from documents table:**
- document_srl (PK) → id (UUID)
- module_srl → module (text) + board_id (UUID)
- category_srl → category_id (UUID)
- is_notice → is_notice (boolean)
- title → title (text)
- content → content (text)
- readed_count → view_count (integer)
- voted_count → vote_count (integer)
- blamed_count → blamed_count (integer)
- comment_count → comment_count (integer)
- status (PUBLIC/SECRET/TEMP) → status (published/draft/trash/secret)
- comment_status (ALLOW/DISABLE) → allow_comment (boolean)
- extra_vars → metadata (JSONB)

### 2.3 Comment Module (1 Table)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **comments** | Comments | ✅ comments | Enhanced with threading |

**Key Fields:**
- comment_srl (PK) → id (UUID)
- document_srl → post_id (UUID)
- parent_srl → parent_id (UUID) for threading
- is_secret → is_secret (boolean)
- content → content (text)
- voted_count → vote_count (integer)
- blamed_count → blamed_count (integer)
- status (1=visible, 0=hidden) → status (visible/hidden/trash)
- uploaded_count → attached_count (integer)

### 2.4 File Module (1 Table)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **files** | File attachments | ✅ files | Enhanced with metadata |

**Key Fields:**
- file_srl (PK) → id (UUID)
- upload_target_srl → target_type + target_id (UUID)
- module_srl → removed (use target_type)
- member_srl → author_id (UUID)
- download_count → download_count (integer)
- source_filename → original_filename (text)
- uploaded_filename → storage_path (text)
- thumbnail_filename → thumbnail_path (text)
- file_size → file_size (bigint)
- mime_type → mime_type (text)
- width/height/duration → same
- isvalid → status (active/trash/deleted)
- cover_image → is_cover_image (boolean)
- regdate → created_at (timestamptz)
- ipaddress → ip_address (text)

### 2.5 Menu Module (2 Tables)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **menu** | Menu containers | ✅ menus | Enhanced |
| **menu_items** | Menu items | ✅ menu_items | Enhanced with hierarchy |

**Key Fields from menu table:**
- menu_srl (PK) → id (UUID)
- site_srl → removed (single-site architecture)
- title → title (text)
- listorder → order_index (integer)
- regdate → created_at (timestamptz)

**menu_items table needs to be created in Rhymix:**
- Original structure uses serialized data
- New structure: id, menu_id, parent_id, title, url, type, depth, path, order_index

### 2.6 Poll Module (4 Tables)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **poll** | Polls | ❌ | Not implemented |
| **poll_item** | Poll options | ❌ | Not implemented |
| **poll_title** | Poll questions | ❌ | Not implemented |
| **poll_log** | Poll responses | ❌ | Not implemented |

### 2.7 Tag Module (1 Table)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **tags** | Tags | ✅ tags | Enhanced with centralized management |

**Key Changes:**
- Original: module_srl + document_srl + tag (varchar)
- New: Centralized tags table with count, and array tags[] on posts/documents

### 2.8 Point Module (1 Table)

| Table | Purpose | Migrated | Notes |
|-------|---------|----------|-------|
| **point** | User points | ✅ points | Enhanced with history |

**Key Changes:**
- Original: member_srl (PK) + point (single value)
- New: Transaction history with id, user_id, point, reason, target_type, target_id

---

## 3. Feature Comparison

### 3.1 Implemented Features ✅

| Feature | Original | Target | Notes |
|---------|----------|--------|-------|
| User Authentication | member module | Supabase Auth | Enhanced security |
| User Profiles | member table | profiles table | Extended fields |
| Groups/Permissions | member_group + groups | permissions + permissions_group_members | Migrated |
| Boards | board + documents | boards + posts | Split structure |
| Posts | documents table | posts table | Enhanced with metadata |
| Comments | comments table | comments table | Threading support |
| Categories | document_categories | categories table | Hierarchical |
| Files | files table | files table | Supabase Storage |
| Menus | menu table | menus + menu_items | Hierarchical structure |
| Pages | page module | documents table | Unified |
| Tags | tags table | tags table | Centralized |
| Points | point table | points table | Transaction history |
| Scraps | member_scrap | scraps table | Enhanced |
| Notifications | ncenterlite | notifications table | Unified |
| Votes | document_voted_log | votes table | Unified |
| Search | Full-text search | PostgreSQL GIN | Enhanced |
| Multi-language | lang code | translations table | Enhanced |

### 3.2 Partially Implemented Features ⚠️

| Feature | Status | Missing | Priority |
|---------|--------|---------|----------|
| **Media Management** | UI only | uploadFile/deleteFile functions | HIGH |
| **Widgets** | UI only | Widget renderer, site_widgets table | MEDIUM |
| **Themes** | UI only | Theme engine, site_themes table | MEDIUM |
| **Layouts** | Partial | Layout engine implementation | MEDIUM |
| **Trash/Soft Delete** | Partial | Trash management UI | LOW |
| **Editor** | Partial | WYSIWYG editor integration | HIGH |
| **Notifications** | Partial | Real-time delivery | MEDIUM |
| **Communication** | Partial | Messaging system | LOW |

### 3.3 Not Implemented Features ❌

| Feature | Original Module | Priority | Effort |
|---------|----------------|----------|--------|
| **Polls** | poll module | LOW | Medium |
| **RSS Feeds** | rss module | LOW | Low |
| **Spam Filter** | spamfilter module | MEDIUM | High |
| **Addons** | addon module | LOW | High |
| **Autoinstall** | autoinstall module | LOW | Medium |
| **Importer** | importer module | LOW | High |
| **Counter** | counter module | LOW | Low |
| **Advanced Mailer** | advanced_mailer module | LOW | Medium |
| **Korean ZIP** | krzip module | LOW | Medium |
| **Session Management** | session module | CRITICAL | ✅ Supabase Auth |

---

## 4. Architecture Changes

### 4.1 Data Model Changes

**Before (Rhymix PHP):**
- Sequential integer IDs (xxx_srl)
- Separate tables for similar concepts (documents vs posts)
- Serialized data for complex structures (menu items, config)
- MyISAM/InnoDB storage

**After (rhymix-ts):**
- UUID primary keys
- Unified tables with type fields (documents for all content)
- JSONB for complex data (metadata, config)
- PostgreSQL with extensions (uuid-ossp, pg_trgm, btree_gin)

### 4.2 Authentication Changes

**Before:**
- Custom session handling
- Password hashing in database
- Manual token management

**After:**
- Supabase Auth (JWT-based)
- Passwords never stored in application DB
- Built-in session management

### 4.3 File Storage Changes

**Before:**
- Local file system
- Relative paths in database

**After:**
- Supabase Storage
- CDN URLs
- Separate bucket for uploads

---

## 5. Implementation Status by Admin Page

| Admin Page | Backend | Frontend | Database | Notes |
|------------|---------|----------|----------|-------|
| Dashboard | ✅ | ✅ | ✅ | Statistics working |
| Members | ✅ | ✅ | ✅ | Full CRUD implemented |
| Groups | ✅ | ✅ | ✅ | Full CRUD implemented |
| Boards | ✅ | ✅ | ✅ | Full CRUD implemented |
| Pages | ✅ | ✅ | ✅ | Full CRUD implemented |
| Menus | ⚠️ | ⚠️ | ✅ | UI only, CRUD incomplete |
| Permissions | ✅ | ✅ | ✅ | Full CRUD implemented |
| Settings | ⚠️ | ⚠️ | ⚠️ | Partial implementation |
| Analytics | ❌ | ⚠️ | ❌ | UI only, mock data |
| Media | ❌ | ✅ | ❌ | UI only, no upload/delete |
| Widgets | ❌ | ✅ | ❌ | UI only, no renderer |
| Themes | ❌ | ✅ | ❌ | UI only, no theme engine |
| Modules | ❌ | ⚠️ | ❌ | UI only, module list |

---

## 6. Recommendations

### 6.1 Priority 1 - Complete Core Features

1. **Media Management** (HIGH)
   - Implement uploadFile/deleteFile Server Actions
   - Create site_files table or use existing files table
   - Integrate Supabase Storage

2. **Editor Integration** (HIGH)
   - Select and integrate WYSIWYG editor (Tiptap/Quill/TinyMCE)
   - Create editor_components table
   - Implement autosave feature

3. **Menu System Completion** (HIGH)
   - Complete menu_items CRUD operations
   - Implement drag-and-drop reordering
   - Add menu item types (link, divider, header, action)

### 6.2 Priority 2 - Enhance Existing Features

4. **Widget System** (MEDIUM)
   - Create site_widgets table
   - Implement widget renderer engine
   - Create widget position system

5. **Theme System** (MEDIUM)
   - Create site_themes table
   - Implement theme switching logic
   - Add theme configuration

6. **Layout System** (MEDIUM)
   - Complete layout engine
   - Implement layout selection
   - Add layout configuration

### 6.3 Priority 3 - Additional Features

7. **Poll System** (LOW)
   - Create poll tables (poll, poll_item, poll_title, poll_log)
   - Implement poll creation UI
   - Add poll display component

8. **RSS Feeds** (LOW)
   - Implement RSS generation
   - Add RSS endpoint
   - Create feed configuration

9. **Spam Filtering** (MEDIUM)
   - Implement spam detection
   - Add spam reporting
   - Create spam filter rules

### 6.4 Data Migration Considerations

**Critical Migration Paths:**
1. **member → profiles**: Map status values, handle password hashes
2. **documents → posts + documents**: Split by module type
3. **files → files**: Convert storage paths to Supabase Storage
4. **comments → comments**: Preserve threading structure
5. **menu → menus + menu_items**: Parse serialized data

**Migration Script Requirements:**
- MySQL to PostgreSQL converter
- Sequential ID to UUID mapping table
- Data validation and cleanup
- Rollback capability

---

## 7. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | CRITICAL | MEDIUM | Comprehensive backup, test migration |
| Feature parity gaps | HIGH | HIGH | Detailed feature mapping, user testing |
| Performance degradation | HIGH | LOW | Load testing, query optimization |
| Authentication issues | CRITICAL | LOW | Supabase Auth testing, fallback plans |
| Third-party dependency issues | MEDIUM | MEDIUM | Vendor assessment, alternative options |

---

## 8. Next Steps

1. ✅ **COMPLETE** - Analyze original Rhymix codebase
2. ✅ **COMPLETE** - Document database schema differences
3. **IN PROGRESS** - Create comprehensive implementation plan
4. **PENDING** - Update SPEC document with findings
5. **PENDING** - Create requirements traceability matrix
6. **PENDING** - Set up parallel team development structure

---

**Document Version:** 1.0
**Last Updated:** 2026-02-22
**Next Review:** After Phase 1 implementation
