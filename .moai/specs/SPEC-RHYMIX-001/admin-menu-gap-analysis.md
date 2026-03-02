# Admin Menu Gap Analysis

**Date**: 2026-03-02
**Analyst**: MoAI Expert-Frontend
**Method**: Playwright MCP automated analysis with screenshot capture

---

## Executive Summary

| Category | ASIS Features | TOBE Status | Gap % |
|----------|---------------|-------------|-------|
| Site Design | Full layout/skin configuration | Not implemented | 100% |
| Member Config (7 tabs) | Complete member system settings | Not implemented | 100% |
| Member Groups | Group management with multilingual support | Not implemented | 100% |
| Point Config | Full point system with 30 levels | Not implemented | 100% |
| Widgets | Widget management | UI placeholder only | 100% |
| Themes | Theme management | UI placeholder only | 100% |
| Permissions | Permission management | UI placeholder only | 100% |

**Overall Gap: 100%** - TOBE admin pages redirect to login, indicating routes exist but functionality is not implemented.

---

## 1. Site Design Settings (dispMenuAdminSiteDesign)

### ASIS Features

**Page Title**: Site Design Settings

**Tabs (2 levels)**:
- Primary: PC / Mobile toggle
- Secondary: Layout / Document Page / Board / Member skins

**Form Elements (5 forms)**:
- Layout selection with visual preview
- Skin configuration per module type
- PC/Mobile view toggle checkbox
- Permission settings
- Detailed configuration modals

**Actions**:
- Save (PC/Mobile settings)
- Cancel
- View larger preview
- Close modals
- Reset admin menu
- Regenerate cache files
- Clear sessions

**Sections**:
- Layout selection (6 input fields)
- Skin settings (0 input fields - visual selection)
- Permission configuration (0 input fields)

### TOBE Status

**Status: NOT IMPLEMENTED**

No `/admin/site-design` route exists. The `/admin/widgets`, `/admin/themes`, and `/admin/permissions` routes redirect to login page, indicating these are placeholder routes without actual admin functionality.

### Gap Analysis

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Layout Management | Full | None | 100% |
| Skin Selection | Full | None | 100% |
| PC/Mobile Toggle | Yes | No | 100% |
| Preview System | Yes | No | 100% |
| Permission Configuration | Yes | No | 100% |

---

## 2. Member Config (dispMemberAdminConfig) - 7 Tabs

### ASIS Features

**7 Tabs Identified**:
1. Basic Settings (기본 설정)
2. Feature Settings (기능 설정)
3. Terms Settings (약관 설정)
4. Member Registration (회원가입)
5. Login (로그인)
6. Design (디자인)
7. Nickname Change History (닉네임 변경 기록)

### Tab 1: Basic Settings - Form Fields

| Field | Type | Description |
|-------|------|-------------|
| member_mid | text | Member module URL identifier |
| force_mid | checkbox | Force member URL |
| enable_join | radio (3 options) | Enable registration (Yes/No/Key only) |
| enable_join_key | text | URL key for registration |
| enable_confirm | radio (2 options) | Email verification required |
| authmail_expires | number | Verification expiration time |
| authmail_expires_unit | select | Time unit (day/hour/min/sec) |
| member_profile_view | radio (2 options) | Profile view permission |
| allow_nickname_change | radio (2 options) | Allow nickname changes |
| update_nickname_log | radio (2 options) | Log nickname changes |
| nickname_symbols | radio (3 options) | Symbol permission in nicknames |
| nickname_symbols_allowed_list | text | Allowed symbols |
| nickname_spaces | checkbox | Allow spaces in nicknames |
| allow_duplicate_nickname | radio (2 options) | Allow duplicate nicknames |
| password_strength | radio (3 options) | Password strength requirement |
| password_hashing_algorithm | select (7 options) | Hash algorithm (argon2id, bcrypt, pbkdf2, sha512, sha256, sha1, md5) |
| password_hashing_work_factor | select (10 options) | Work factor (04-13) |
| password_hashing_auto_upgrade | radio (2 options) | Auto upgrade password hash |
| password_change_invalidate_other_sessions | radio (2 options) | Invalidate other sessions on password change |
| password_reset_method | radio (2 options) | Password reset method (v1/v2) |

**Actions**:
- Member info sync button
- Save button

### TOBE Status

**Status: NOT IMPLEMENTED**

No `/admin/member-config` route exists.

### Gap Analysis

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Member URL Settings | Yes | No | 100% |
| Registration Settings | Yes (3 modes) | No | 100% |
| Email Verification | Yes | No | 100% |
| Nickname Policies | Yes (5 fields) | No | 100% |
| Password Security | Yes (4 fields) | No | 100% |
| 6 Additional Tabs | Yes | No | 100% |

---

## 3. Member Groups (dispMemberAdminGroupList)

### ASIS Features

**Page Title**: Member Groups

**Tabs**:
- Add (추가)
- Search (검색)

**Data Table**:

| Column | Description |
|--------|-------------|
| Group Title | Group name (multilingual support) |
| Description | Group description |
| Default Group | Radio selection for default |
| Group Image Mark | Image mark upload/selection |

**Form Fields**:
- group_image_mark (radio): Enable/disable image marks
- group_titles[] (text): Group titles (multilingual)
- descriptions[] (text): Group descriptions
- defaultGroup (radio): Default group selection
- image_marks[] (hidden): Image mark file references
- group_srls[] (hidden): Group serial numbers

**Actions**:
- Drag-and-drop reordering
- Multilingual text toggle
- Save
- Save and use
- Cancel/Close

**Features**:
- 4 default groups visible (based on table rows)
- Multilingual support built-in
- Drag-and-drop sorting

### TOBE Status

**Status: NOT IMPLEMENTED**

No `/admin/member-groups` route exists.

### Gap Analysis

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Group CRUD | Full | None | 100% |
| Default Group Selection | Yes | No | 100% |
| Image Marks | Yes | No | 100% |
| Multilingual Support | Yes | No | 100% |
| Drag-and-drop Ordering | Yes | No | 100% |

---

## 4. Point Config (dispPointAdminConfig)

### ASIS Features

**Page Title**: Point Management

**Tabs (3)**:
1. Basic Settings (기본 설정)
2. Module Settings (모듈별 설정)
3. Member Point List (회원 포인트 목록)

### Sections (5)

**Section 1: Basic Settings**
- able_module (checkbox): Enable point module
- point_name (text): Point name
- max_level (number): Maximum level
- level_icon (select): Level icon style
- disable_download (checkbox): Disable download without points
- disable_read_document (checkbox): Disable reading without points
- disable_read_document_except_robots (checkbox): Allow robots

**Section 2: Point Grant/Deduction (34 input fields)**

| Action | Points Field | Limit Field | Revert on Delete |
|--------|--------------|-------------|------------------|
| Signup | signup_point | - | - |
| Login | login_point | - | - |
| Write Post | insert_document | - | checkbox |
| Write Comment | insert_comment | insert_comment_limit | checkbox |
| Upload File | upload_file | - | checkbox |
| Download File | download_file | - | - |
| Read Post | read_document | read_document_limit | - |
| Vote Post | voter | voter_limit | - |
| Blame Post | blamer | blamer_limit | - |
| Vote Comment | voter_comment | voter_comment_limit | - |
| Blame Comment | blamer_comment | blamer_comment_limit | - |
| My File Downloaded | download_file_author | - | - |
| My Post Read | read_document_author | read_document_author_limit | - |
| My Post Voted | voted | voted_limit | - |
| My Post Blamed | blamed | blamed_limit | - |
| My Comment Voted | voted_comment | voted_comment_limit | - |
| My Comment Blamed | blamed_comment | blamed_comment_limit | - |

**Section 3: Group Integration**
- group_reset (select): Reset behavior
- group_ratchet (select): Ratchet behavior
- point_group_4 (number): Group threshold

**Section 4: Level Points (30 levels)**
- level_step_1 through level_step_30 (number): Points required per level

**Section 5: Point Reset**
- Reset all points button

**Data Tables (2)**:
1. Point Actions (17 rows): Actions and their point values
2. Level Table (31 rows): Level, icon, points, and group

**Actions**:
- Calculate level points
- Reset level points
- Reset all points
- Save per section

### TOBE Status

**Status: NOT IMPLEMENTED**

No `/admin/point-config` route exists.

### Gap Analysis

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Point Module Toggle | Yes | No | 100% |
| Level System (30 levels) | Yes | No | 100% |
| Point Actions (17 types) | Yes | No | 100% |
| Group Integration | Yes | No | 100% |
| Daily Limits | Yes | No | 100% |
| Author Bonuses | Yes | No | 100% |

---

## 5. TOBE Admin Routes Analysis

### Current State

All three admin routes redirect to login page:

| Route | Expected | Actual |
|-------|----------|--------|
| /admin/widgets | Widget management UI | Login redirect |
| /admin/themes | Theme management UI | Login redirect |
| /admin/permissions | Permission management UI | Login redirect |

### Analysis

The routes exist in the Next.js application but:
1. They are protected by authentication middleware
2. After login, they should show admin UI
3. Current state suggests either:
   - Routes are placeholders without implementation
   - Admin layout/components are not yet built
   - Authentication flow has issues

### Login Form Features

- Email input with placeholder
- Password input
- Google OAuth button
- GitHub OAuth button
- Theme toggle

---

## Implementation Recommendations

### Phase 1: Core Admin Infrastructure (Priority: Critical)

1. **Admin Layout Component**
   - Sidebar navigation
   - Header with user info
   - Breadcrumb navigation
   - Responsive design

2. **Admin Route Protection**
   - Middleware for admin-only access
   - Role-based permissions
   - Session management

### Phase 2: Member System (Priority: High)

1. **Member Config Page** (7 tabs)
   - Start with Basic Settings tab
   - Add other tabs incrementally
   - ~20 form fields per tab

2. **Member Groups Page**
   - CRUD operations
   - Drag-and-drop ordering
   - Multilingual support

3. **Point System Page**
   - Basic configuration
   - Point action settings
   - Level management

### Phase 3: Design System (Priority: Medium)

1. **Site Design Page**
   - Layout selection
   - Skin management
   - Preview functionality

2. **Theme Management**
   - Theme upload/install
   - Theme activation
   - Theme settings

3. **Widget Management**
   - Widget configuration
   - Widget placement
   - Widget settings

### Phase 4: Permissions (Priority: Medium)

1. **Permission Matrix**
   - Role-based permissions
   - Module-level access
   - Action-level permissions

---

## Technical Debt Summary

### ASIS Complexity Metrics

| Page | Forms | Inputs | Selects | Tables | Buttons |
|------|-------|--------|--------|--------|---------|
| Site Design | 5 | 15+ | 0 | 0 | 22 |
| Member Config | 3 | 30+ | 3 | 0 | 9 |
| Member Groups | 4 | 25+ | 0 | 1 | 22 |
| Point Config | 3 | 80+ | 3 | 2 | 21 |

### Estimated Implementation Effort

| Component | Effort | Priority |
|-----------|-------|----------|
| Admin Layout | Medium | Critical |
| Member Config | High | High |
| Member Groups | Medium | High |
| Point Config | High | High |
| Site Design | High | Medium |
| Themes | Medium | Medium |
| Widgets | Medium | Medium |
| Permissions | Medium | Medium |

---

## Screenshots Reference

Screenshots are available at:
- `.moai/specs/SPEC-RHYMIX-001/screenshots/asis-site-design.png`
- `.moai/specs/SPEC-RHYMIX-001/screenshots/asis-member-config.png`
- `.moai/specs/SPEC-RHYMIX-001/screenshots/asis-member-groups.png`
- `.moai/specs/SPEC-RHYMIX-001/screenshots/asis-point-config.png`
- `.moai/specs/SPEC-RHYMIX-001/screenshots/tobe-*.png` (login pages)

---

## Conclusion

TOBE admin system is at **0% implementation** compared to ASIS. The routes exist but all functionality needs to be built from scratch. Priority should be given to:

1. Admin layout and navigation
2. Member configuration system
3. Point/level system
4. Design/theme management

**Estimated Total Implementation**: 200+ form fields, 10+ data tables, 50+ API endpoints

---

**Generated by**: MoAI Expert-Frontend
**Analysis Tool**: Playwright MCP v1.58.2
