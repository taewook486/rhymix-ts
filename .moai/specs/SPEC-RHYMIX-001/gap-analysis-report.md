# ASIS vs TOBE Gap Analysis Report

**Analysis Date:** 2026-03-02 (Updated with Admin Menu Analysis)
**Analyst:** manager-spec agent
**Status:** Complete - Deep Analysis

---

## Executive Summary

This analysis compares **ASIS** (Rhymix PHP - 528 PHP files, 32 modules) with **TOBE** (Rhymix-TS Next.js - 177 actions, 116 components) to identify feature gaps and create an updated implementation roadmap.

**Overall Implementation Status: 55% Complete** (Updated from 70%)

### Key Statistics
- **ASIS Codebase:** 528 PHP module files, 37 class files, 8 addon files
- **TOBE Codebase:** 177 Server Actions, 116 React components, 40+ database tables
- **Modules Migrated:** 15/32 (100% complete)
- **Modules Partial:** 9/32 (20-90% complete)
- **Modules Missing:** 8/32 (0% complete)
- **Admin Menus:** 0/7 fully implemented (85% gap for admin features)

---

## Phase 2: Admin Menu Implementation Gap (NEW - 2026-03-02)

### Admin Menu Summary

| Metric | Value |
|--------|-------|
| Total Admin Menus | 7 |
| Fully Implemented | 0 |
| Partially Implemented | 3 (UI routes exist, no functionality) |
| Not Implemented | 4 (no routes) |
| Overall Admin Gap | ~85% |

### Detailed Admin Menu Gap Analysis

#### 1. Site Design Settings (dispMenuAdminSiteDesign)

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Layout Management | Full (visual preview) | None | 100% |
| Skin Selection | Full (per module) | None | 100% |
| PC/Mobile Toggle | Yes | No | 100% |
| Preview System | Yes | No | 100% |
| Permission Configuration | Yes | No | 100% |

**Form Elements:** 5 forms, 15+ inputs, 22 buttons
**Status:** NOT IMPLEMENTED - No `/admin/site-design` route

#### 2. Member Config (dispMemberAdminConfig) - 7 Tabs

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Member URL Settings | Yes | No | 100% |
| Registration Settings | Yes (3 modes) | No | 100% |
| Email Verification | Yes | No | 100% |
| Nickname Policies | Yes (5 fields) | No | 100% |
| Password Security | Yes (4 fields, 7 algorithms) | No | 100% |
| 6 Additional Tabs | Yes | No | 100% |

**Form Elements:** 3 forms, 30+ inputs, 3 selects, 9 buttons
**Tabs:** Basic Settings, Feature Settings, Terms Settings, Member Registration, Login, Design, Nickname Change History
**Status:** NOT IMPLEMENTED - No `/admin/member-config` route

#### 3. Member Groups (dispMemberAdminGroupList)

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Group CRUD | Full | None | 100% |
| Default Group Selection | Yes | No | 100% |
| Image Marks | Yes | No | 100% |
| Multilingual Support | Yes | No | 100% |
| Drag-and-drop Ordering | Yes | No | 100% |

**Form Elements:** 4 forms, 25+ inputs, 1 table, 22 buttons
**Status:** NOT IMPLEMENTED - No `/admin/member-groups` route
**Note:** Database tables `groups`, `user_groups`, `group_permissions` exist

#### 4. Point Config (dispPointAdminConfig) - 3 Tabs

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Point Module Toggle | Yes | No | 100% |
| Level System (30 levels) | Yes | No | 100% |
| Point Actions (17 types) | Yes | No | 100% |
| Group Integration | Yes | No | 100% |
| Daily Limits | Yes | No | 100% |
| Author Bonuses | Yes | No | 100% |

**Form Elements:** 3 forms, 80+ inputs, 3 selects, 2 tables, 21 buttons
**Tabs:** Basic Settings, Module Settings, Member Point List
**Status:** NOT IMPLEMENTED - No `/admin/point-config` route
**Note:** Database table `points` exists, but `point_config` and `point_levels` missing

#### 5-7. Partially Implemented (UI Routes Only)

| Route | Expected | Actual | Gap |
|-------|----------|--------|-----|
| `/admin/widgets` | Widget management UI | Login redirect | 100% (UI only) |
| `/admin/themes` | Theme management UI | Login redirect | 100% (UI only) |
| `/admin/permissions` | Permission management UI | Login redirect | 100% (UI only) |

**Note:** These routes exist but redirect to login, indicating placeholder routes without admin functionality.

### Admin Menu Complexity Metrics

| Page | Forms | Inputs | Selects | Tables | Buttons | Total Elements |
|------|-------|--------|--------|--------|---------|----------------|
| Site Design | 5 | 15+ | 0 | 0 | 22 | 42+ |
| Member Config | 3 | 30+ | 3 | 0 | 9 | 45+ |
| Member Groups | 4 | 25+ | 0 | 1 | 22 | 52+ |
| Point Config | 3 | 80+ | 3 | 2 | 21 | 109+ |
| **Total** | **15** | **150+** | **6** | **3** | **74** | **248+** |

### Admin Menu Implementation Recommendations

#### Phase 1: Core Admin Infrastructure (Priority: Critical)

1. **Admin Layout Component**
   - Sidebar navigation
   - Header with user info
   - Breadcrumb navigation
   - Responsive design

2. **Admin Route Protection**
   - Middleware for admin-only access
   - Role-based permissions
   - Session management

#### Phase 2: Member System (Priority: High)

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

#### Phase 3: Design System (Priority: Medium)

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

#### Phase 4: Permissions (Priority: Medium)

1. **Permission Matrix**
   - Role-based permissions
   - Module-level access
   - Action-level permissions

---

## Database Schema Status (Admin Features)

### Existing Tables (35+)

| Category | Tables | Status |
|----------|--------|--------|
| Member Settings | profiles, site_config | Partial (need member_config) |
| Member Groups | groups, user_groups, group_permissions | Complete |
| Point System | points | Partial (need point_config, point_levels) |
| Widgets | site_widgets, layout_widgets | Complete |
| Themes | site_themes | Partial (need theme_skins) |
| Permissions | permissions, group_permissions | Complete |
| Layouts | layouts, layout_columns, layout_widgets | Complete |
| Menus | menus, menu_items | Complete |
| Activity | activity_log | Complete |

### Missing Tables (6)

| Table Name | Purpose | Priority |
|------------|---------|----------|
| `member_config` | Member module configuration | High |
| `point_config` | Point reward configuration | High |
| `point_levels` | Point-based user levels (30 levels) | Medium |
| `group_images` | Group badges/icons | Medium |
| `theme_skins` | Theme skin variants | Low |
| `editor_config` | Editor settings (optional) | Low |

### Migration Scripts Required

1. **015_member_config.sql** - Member configuration table with default values
2. **016_point_config.sql** - Point reward configuration with action types
3. **017_point_levels.sql** - 30-level system with icons and thresholds

---

## 1. Fully Implemented Modules (15 modules)

| Module | ASIS | TOBE Database | TOBE Actions | Status |
|--------|------|---------------|--------------|--------|
| board | board | boards, posts, categories | 40+ | 100% |
| document | document | documents, versions | 20+ | 100% |
| comment | comment | comments | 15+ | 100% |
| member | member | profiles | 15+ | 90% |
| page | page | pages | 15+ | 100% |
| menu | menu | menus, menu_items | 10+ | 100% |
| poll | poll | polls, items, logs | 10+ | 100% |
| widget | widget | site_widgets | 10+ | 100% |
| file | file | files | 10+ | 90% |
| tag | tag | tags | 5+ | 80% |
| rss | rss | - | 5+ | 80% |
| spamfilter | spamfilter | - | 5+ | 70% |
| point | point | points | 5+ | 80% |
| scrap | scrap | scraps, folders | 5+ | 80% |
| install | install | installation_status | 5+ | 100% |

---

## 2. Partially Implemented Modules (9 modules) - P1 Priority

| Module | Missing Features | Priority | Est. Time |
|--------|------------------|----------|-----------|
| **communication** | Messages UI, inbox/outbox, friends | P1 | 5-7 days |
| **message** | Private messaging system | P1 | (included above) |
| **ncenterlite** | Notification center UI | P1 | 3-5 days |
| **editor** | WYSIWYG component (TipTap/ProseMirror) | P1 | 3-5 days |
| **layout** | Layout builder UI | P1 | 5-7 days |
| **trash** | Soft delete/restore UI | P1 | 2-3 days |
| **trackback** | Trackback send/receive | P2 | 2-3 days |
| **counter** | View count tracking | P2 | 1-2 days |
| **theme** | Theme switcher UI | P2 | 2-3 days |

---

## 3. Missing Modules (8 modules) - P2 Priority

| Module | Description | Priority | Alternative |
|--------|-------------|----------|-------------|
| **addon** | Extension system | P2 | Use npm packages |
| **autoinstall** | Auto-install from repo | P2 | Use npm/yarn |
| **extravar** | Extra variables | P2 | Use JSONB metadata |
| **krzip** | Korean address search | P2 | Use Daum/Google Maps |
| **integration_search** | Unified search | P1 | Implement in Phase 2 |
| **adminlogging** | Admin audit log | P1 | activity_log table exists, add UI |
| **importer** | Data import tools | P2 | Separate migration script |
| **module** | Module management | - | Already implemented |

---

## 4. Updated Requirements

### Phase 13: Messaging System (NEW - P1)

**REQ-MSG-001 (Event-Driven):** WHEN a user sends a private message, THEN the system shall store message with sender, recipient, timestamp, and read status.

**REQ-MSG-002 (Event-Driven):** WHEN a user receives a message, THEN the system shall send notification via Supabase Realtime.

**REQ-MSG-003 (State-Driven):** IF a recipient has blocked the sender, THEN the system shall not deliver the message.

**REQ-MSG-004 (Event-Driven):** WHEN a user reads a message, THEN the system shall update read status and timestamp.

### Phase 14: WYSIWYG Editor (NEW - P1)

**REQ-EDT-001 (Ubiquitous):** The system shall provide WYSIWYG editor for content creation using TipTap or ProseMirror.

**REQ-EDT-002 (Event-Driven):** WHEN user inserts image, THEN the system shall upload to Supabase Storage and insert markdown/image tag.

**REQ-EDT-003 (Event-Driven):** WHEN user types content, THEN the system shall autosave to editor_autosave table every 30 seconds.

**REQ-EDT-004 (Optional):** WHERE code highlighting is enabled, THEN the system shall syntax-highlight code blocks.

### Phase 15: Layout Builder (NEW - P1)

**REQ-LAY-001 (Ubiquitous):** The system shall provide drag-and-drop layout builder for widget placement.

**REQ-LAY-002 (Event-Driven):** WHEN admin creates layout, THEN the system shall store widget positions in site_widgets table.

**REQ-LAY-003 (State-Driven):** IF layout has multiple columns, THEN the system shall render widgets in specified positions.

**REQ-LAY-004 (Event-Driven):** WHEN widget is moved, THEN the system shall update position and refresh layout.

### Phase 16: Notification Center UI (NEW - P1)

**REQ-NTF-001 (Event-Driven):** WHEN user has unread notifications, THEN the system shall display notification count badge.

**REQ-NTF-002 (Event-Driven):** WHEN user clicks notification, THEN the system shall mark as read and navigate to related content.

**REQ-NTF-003 (State-Driven):** IF user disables notification type, THEN the system shall not create notifications for that type.

**REQ-NTF-004 (Optional):** WHERE email notifications are enabled, THEN the system shall send email digest for unread notifications.

### Phase 17: Admin Logging UI (NEW - P1)

**REQ-LOG-001 (Event-Driven):** WHEN admin performs sensitive action, THEN the system shall log to activity_log table.

**REQ-LOG-002 (Event-Driven):** WHEN admin views logs, THEN the system shall display filtered log list with pagination.

**REQ-LOG-003 (State-Driven):** IF log export is requested, THEN the system shall generate CSV file with date range.

### Phase 18: Unified Search (NEW - P1)

**REQ-USR-001 (Event-Driven):** WHEN user performs search, THEN the system shall query across posts, documents, comments, and pages.

**REQ-USR-002 (Event-Driven):** WHEN search results display, THEN the system shall show results grouped by content type.

**REQ-USR-003 (Optional):** WHERE search suggestions are enabled, THEN the system shall display autocomplete suggestions.

---

## 5. Updated Implementation Roadmap

### Phase 1: Critical Features (P0/P1) - 3-4 weeks

| Week | Feature | Files | Est. Time |
|------|---------|-------|-----------|
| 1 | WYSIWYG Editor (TipTap) | components/editor/* | 3-5 days |
| 1-2 | Autosave UI | app/actions/editor.ts | 2-3 days |
| 2 | Admin Logging UI | app/admin/logs/* | 2-3 days |
| 2-3 | Private Messaging | app/messages/*, actions/message.ts | 5-7 days |
| 3 | Notification Center UI | components/notifications/* | 3-5 days |
| 3-4 | Temporary Save/Drafts | app/actions/draft.ts | 2-3 days |

### Phase 2: Important Features (P1) - 3-4 weeks

| Week | Feature | Files | Est. Time |
|------|---------|-------|-----------|
| 1-2 | Layout Builder | app/admin/layout/* | 5-7 days |
| 2 | Unified Search | app/search/*, actions/search.ts | 3-5 days |
| 2-3 | Member List/Browse | app/members/* | 3-5 days |
| 3 | Trash/Restore UI | app/admin/trash/* | 2-3 days |
| 3-4 | Advanced Profile Fields | app/member/profile/* | 2-3 days |

### Phase 3: Nice-to-Have (P2) - 2-3 weeks

| Week | Feature | Files | Est. Time |
|------|---------|-------|-----------|
| 1 | Theme Switcher | app/admin/theme/* | 2-3 days |
| 1-2 | View Count Tracking | app/actions/stats.ts | 1-2 days |
| 2 | Content Scheduling | app/actions/schedule.ts | 2-3 days |
| 2-3 | Dashboard Analytics | app/admin/analytics/* | 3-5 days |
| 3 | File Manager UI | app/admin/files/* | 3-5 days |

---

## 6. Browser-Based Visual Comparison Findings (NEW - 2026-03-01)

### Critical Missing Features (P0) - Immediate Action Required

| ID | Feature | ASIS Status | TOBE Status | Impact |
|----|---------|-------------|-------------|--------|
| P0-01 | Board List Page | Working | 404 Error | Core feature blocked |
| P0-02 | Login Page Routing | /board/login | /ko/members/login 404 | User auth blocked |
| P0-03 | Navigation Menu | 4 menus active | Empty | Page navigation blocked |
| P0-04 | Homepage Visual Slider | 4 slides with Swiper | Missing | Major visual element missing |

### High Priority Missing Features (P1)

| ID | Feature | ASIS Status | TOBE Status | Impact |
|----|---------|-------------|-------------|--------|
| P1-01 | Welcome Guide Section | 10 guide items | Missing | Site introduction absent |
| P1-02 | Recent Posts Display | Homepage widget | Not displayed | Content exposure limited |
| P1-03 | Notice Display | Homepage widget | Not displayed | Information delivery limited |
| P1-04 | Board Write Button | Present | Missing | Content creation blocked |
| P1-05 | Board Search | Present | Missing | Content search blocked |
| P1-06 | Board Sorting | Date/View count sort | Missing | List management limited |

### Medium Priority Missing Features (P2)

| ID | Feature | ASIS Status | TOBE Status | Impact |
|----|---------|-------------|-------------|--------|
| P2-01 | Tag System | Tag button present | Missing | Classification lacking |
| P2-02 | ID/PW Recovery | Separate page | Unconfirmed | Account recovery blocked |
| P2-03 | XEICON Integration | Icon system | Not used | Visual consistency lacking |
| P2-04 | Sub-header Background | Background image | Missing | Page title visual lacking |
| P2-05 | Remember Login | Checkbox option | Unconfirmed | Convenience feature missing |

### URL Structure Differences

| Feature | ASIS URL | TOBE URL | Status |
|---------|----------|----------|--------|
| Homepage | / | / | Partial |
| Free Board | /?mid=board | /ko/boards (404) | Missing |
| Q&A | /?mid=qna | - | Missing |
| Notice | /?mid=notice | - | Missing |
| Login | /board/login | /ko/signin | Different |
| Signup | /board/signup | - | Unconfirmed |
| Documents | /?mid=document (404) | /ko/documents | TOBE better |
| Admin | /?module=admin | /ko/admin | Redirect |

### UI/UX Visual Differences

| Element | ASIS (XEDITION) | TOBE (Tailwind + shadcn) |
|---------|-----------------|--------------------------|
| Design Language | Custom theme | Modern utility-first |
| Color System | CSS variables | HSL-based CSS variables |
| Typography | Open Sans webfont | Inter font |
| Icons | XEICON | None used |
| Shadow Effects | Custom | Tailwind shadow-sm |

### Homepage Structure Comparison

**ASIS Homepage:**
- Header: Logo | Navigation (4 items) | Search | Login/Signup
- Visual Slider: 4 Swiper slides
- Welcome Guide: 10 items (6 build guides + 4 community links)
- Login Widget: Sidebar with ID/PW fields
- Footer: Terms | Privacy Policy

**TOBE Homepage:**
- Header: Logo "Rhymix" | Navigation (empty) | Loading state
- Hero Section: Text only ("Welcome to Rhymix TS")
- Sidebar Cards: Quick Links, Member Area
- Missing: Slider, Welcome Guide, Login Widget

### Recommended Immediate Actions

1. **Fix Board Route**: Resolve /ko/boards 404 error
2. **Fix Login Route**: Add redirect /ko/members/login to /ko/signin
3. **Activate Navigation**: Add menu items to header component
4. **Add Visual Elements**: Implement hero slider or image section

---

## 8. Database Schema Additions

### New Tables Required

```sql
-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  subject TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drafts table (temporary save)
CREATE TABLE public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content_type TEXT, -- 'post', 'document', 'comment'
  content_id UUID, -- Reference to actual content when published
  title TEXT,
  content TEXT,
  autosave_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layout configurations
CREATE TABLE public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  layout_data JSONB NOT NULL, -- Widget positions, columns
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View counts
CREATE TABLE public.view_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'post', 'document', 'page'
  content_id UUID NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id)
);
```

---

## 9. Success Criteria

### Phase 1 Completion Criteria
- [ ] WYSIWYG editor functional with media upload
- [ ] Private messaging send/receive working
- [ ] Admin logs viewable and exportable
- [ ] Autosave indicators visible
- [ ] Notification center displays real-time updates

### Phase 2 Completion Criteria
- [ ] Layout builder can drag-and-drop widgets
- [ ] Unified search returns results from all content types
- [ ] Member list browseable with search/filter
- [ ] Trash/restore functionality working
- [ ] Advanced profile fields editable

### Overall Completion Criteria
- [ ] All P1 features implemented
- [ ] Unit tests passing (85%+ coverage)
- [ ] E2E tests passing for critical paths
- [ ] Performance targets met (P50 < 1s, P95 < 2s)
- [ ] Security audit passed

---

## 10. Updated Overall Completion Assessment

### Revised Completion Metrics

| Category | Previous Estimate | Updated Estimate | Reason |
|----------|-------------------|------------------|--------|
| Core Modules | 70% | 70% | Unchanged |
| Admin Menus | Assumed Complete | 15% | New analysis revealed gaps |
| Database Schema | 90% | 85% | 6 missing tables identified |
| **Overall Project** | **70%** | **55%** | Admin features significantly incomplete |

### Critical Path Items

1. **Admin Layout Infrastructure** - Required before any admin pages can function
2. **Member Config System** - 7 tabs, 30+ configuration fields
3. **Point System** - 30 levels, 17 action types, group integration
4. **Board List Route Fix** - Currently returning 404

### Implementation Priority Matrix

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| P0 | Admin Layout | Medium | Critical | None |
| P0 | Board Route Fix | Low | Critical | None |
| P1 | Member Config | High | High | Admin Layout |
| P1 | Member Groups | Medium | High | Admin Layout |
| P1 | Point Config | High | High | Admin Layout |
| P1 | WYSIWYG Editor | Medium | High | None |
| P2 | Site Design | High | Medium | Admin Layout |
| P2 | Theme Management | Medium | Medium | Admin Layout |
| P2 | Widget Management | Medium | Medium | Admin Layout |

### Estimated Implementation Effort

| Component | Form Fields | API Endpoints | Database Tables | Effort Days |
|-----------|-------------|---------------|-----------------|-------------|
| Admin Layout | 0 | 5 | 0 | 3-5 |
| Member Config | 30+ | 15 | 1 | 7-10 |
| Member Groups | 25+ | 10 | 0 (exists) | 5-7 |
| Point Config | 80+ | 20 | 2 | 10-14 |
| Site Design | 15+ | 10 | 0 (exists) | 5-7 |
| Themes | 10+ | 8 | 1 | 3-5 |
| Widgets | 10+ | 8 | 0 (exists) | 3-5 |
| Permissions | 5+ | 5 | 0 (exists) | 2-3 |
| **Total** | **175+** | **81+** | **4** | **38-56** |

---

**Next Steps:** Review this gap analysis and proceed to Phase 1 implementation focusing on Admin Layout infrastructure first.
