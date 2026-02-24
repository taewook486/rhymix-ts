# ASIS vs TOBE Gap Analysis Report

**Analysis Date:** 2026-02-24
**Analyst:** MoAI Codebase Analysis System
**Status:** Complete

---

## Executive Summary

This analysis compares **ASIS** (Rhymix PHP - 32 modules) with **TOBE** (Rhymix-TS Next.js) to identify feature gaps and create an updated implementation roadmap.

**Overall Implementation Status: 70% Complete**

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

## 6. Database Schema Additions

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

## 7. Success Criteria

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

**Next Steps:** Review this gap analysis and proceed to Phase 1 implementation.
