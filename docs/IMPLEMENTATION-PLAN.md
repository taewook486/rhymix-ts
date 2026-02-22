# Implementation Plan: Rhymix TS Conversion

## Overview

**Based on:** Analysis of C:\GitHub\rhymix (Original PHP CMS)
**Target:** C:\project\rhymix-ts (Next.js 16 + TypeScript + Supabase)
**Timeline:** 4 Phases (estimated 6-8 weeks)
**Team Structure:** Parallel development with 3-4 developers

---

## Phase 1: Complete Core Features (Week 1-2)

### Priority 1.1: Media Management ⚡ CRITICAL

**Current State:** UI complete, uploadFile/deleteFile are placeholder functions

**Tasks:**
1. Implement `uploadFile` Server Action
   - Validate file type and size
   - Generate unique filename
   - Upload to Supabase Storage
   - Save metadata to files table
   - Return file URL

2. Implement `deleteFile` Server Action
   - Verify user permissions
   - Delete from Supabase Storage
   - Update files table (soft delete: status = 'deleted')

3. Create Media Management Components
   - FileBrowser component (grid/list view)
   - FileUploader component (drag & drop)
   - FilePreview component (image/video/pdf)
   - FileSelector component (for post/page editor)

4. Media Library Features
   - Folder organization
   - Search and filter
   - Bulk operations (delete, move)
   - CDN URL generation

**Files to Create/Modify:**
- `app/actions/media.ts` (new)
- `components/admin/MediaBrowser.tsx` (new)
- `components/admin/MediaUploader.tsx` (new)
- `app/(admin)/admin/media/page.tsx` (modify - connect to real data)

**Database Changes:**
- Ensure files table has proper indexes
- Add file folders table if needed

**Acceptance Criteria:**
- [ ] Can upload image, video, PDF files
- [ ] Files appear in media library
- [ ] Can delete files with permission check
- [ ] File URLs work in posts/pages
- [ ] Storage quota enforced

---

### Priority 1.2: Editor Integration ⚡ CRITICAL

**Current State:** No editor integrated, content stored as plain text

**Tasks:**
1. Select WYSIWYG Editor
   - Options: Tiptap (recommended), Quill, TinyMCE
   - Evaluate based on: React support, TypeScript, file upload

2. Create Editor Components
   - RichTextEditor component
   - MarkdownEditor component (alternative)
   - Editor toolbar
   - File attachment button
   - Embed media button

3. Implement Editor Features
   - Bold, italic, underline, strikethrough
   - Headings (H1-H6)
   - Lists (ordered, unordered)
   - Links (auto-detect, manual)
   - Images (upload, resize, align)
   - Code blocks (syntax highlighting)
   - Tables
   - Embeds (YouTube, etc.)

4. Autosave Functionality
   - Create editor_autosave table
   - Implement auto-save every 30 seconds
   - Recover unsaved content
   - Conflict resolution

**Files to Create:**
- `components/editor/RichTextEditor.tsx` (new)
- `components/editor/EditorToolbar.tsx` (new)
- `app/actions/editor.ts` (new)
- `lib/editor/autosave.ts` (new)

**Database Changes:**
```sql
CREATE TABLE public.editor_autosave (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID,
  content TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
```

**Acceptance Criteria:**
- [ ] Can create formatted content
- [ ] Can insert images from media library
- [ ] Autosave works and recovers content
- [ ] Editor is responsive
- [ ] Content is sanitized (XSS protection)

---

### Priority 1.3: Menu System Completion ⚡ HIGH

**Current State:** menus and menu_items tables exist, UI incomplete

**Tasks:**
1. Complete Menu CRUD Operations
   - CreateMenu action
   - UpdateMenu action
   - DeleteMenu action
   - GetMenus query

2. Complete MenuItem CRUD Operations
   - CreateMenuItem action
   - UpdateMenuItem action
   - DeleteMenuItem action
   - GetMenuItems query
   - ReorderMenuItems action

3. Implement Menu Features
   - Drag-and-drop reordering
   - Nesting (parent-child relationships)
   - Menu item types: link, divider, header, action
   - Icon selection
   - Required role filtering

4. Create Menu Components
   - MenuEditor component (tree view)
   - MenuItemEditor component (edit form)
   - MenuPreview component (live preview)
   - MenuSelector component (for layout config)

**Files to Create/Modify:**
- `app/actions/menu.ts` (new)
- `components/admin/MenuEditor.tsx` (new)
- `components/admin/MenuItemEditor.tsx` (new)
- `components/layout/Navigation.tsx` (new - display menu)
- `app/(admin)/admin/menus/page.tsx` (modify)

**Database Changes:**
- Ensure menu_items path and depth are updated on insert/update
- Add trigger for path generation

**Acceptance Criteria:**
- [ ] Can create nested menu structure
- [ ] Drag-and-drop reordering works
- [ ] Menu displays correctly on frontend
- [ ] Can assign roles to menu items
- [ ] Can link to pages, boards, external URLs

---

## Phase 2: Enhance Existing Features (Week 3-4)

### Priority 2.1: Widget System

**Current State:** UI only, no widget renderer

**Tasks:**
1. Create site_widgets Table
```sql
CREATE TABLE public.site_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  position TEXT NOT NULL,
  content TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Create Widget Renderer Engine
   - WidgetRegistry class
   - WidgetRenderer component
   - WidgetConfig component

3. Implement Built-in Widgets
   - Latest Posts widget
   - Popular Posts widget
   - Login Form widget
   - Calendar widget
   - Banner widget

4. Widget Management UI
   - Widget selector
   - Widget configuration form
   - Widget preview
   - Position editor

**Files to Create:**
- `lib/widgets/WidgetRegistry.ts` (new)
- `components/widgets/WidgetRenderer.tsx` (new)
- `components/widgets/widgets/LatestPosts.tsx` (new)
- `components/widgets/widgets/LoginForm.tsx` (new)
- `app/actions/widget.ts` (new)
- `app/(admin)/admin/widgets/page.tsx` (modify)

**Acceptance Criteria:**
- [ ] Can create and configure widgets
- [ ] Widgets render in assigned positions
- [ ] Can reorder widgets
- [ ] Can enable/disable widgets
- [ ] Widget system is extensible

---

### Priority 2.2: Theme System

**Current State:** UI only, no theme engine

**Tasks:**
1. Create site_themes Table
```sql
CREATE TABLE public.site_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  screenshot_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  is_responsive BOOLEAN DEFAULT TRUE,
  supports_dark_mode BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Create Theme Engine
   - ThemeProvider component
   - ThemeContext
   - ThemeSwitcher component
   - useTheme hook

3. Implement Theme Features
   - Theme selection
   - Theme configuration
   - Dark mode toggle
   - Custom CSS variables
   - Component overrides

4. Default Themes
   - Default theme (light)
   - Dark theme
   - Simple theme

**Files to Create:**
- `lib/themes/ThemeEngine.ts` (new)
- `lib/themes/ThemeProvider.tsx` (new)
- `lib/themes/themes/default.ts` (new)
- `lib/themes/themes/dark.ts` (new)
- `components/admin/ThemeCard.tsx` (modify - connect to real data)
- `app/actions/theme.ts` (new)
- `app/(admin)/admin/themes/page.tsx` (modify)

**Acceptance Criteria:**
- [ ] Can switch between themes
- [ ] Dark mode toggle works
- [ ] Theme configuration persists
- [ ] Can create custom themes
- [ ] Theme preview works

---

### Priority 2.3: Layout System

**Current State:** layouts table exists, no layout engine

**Tasks:**
1. Implement Layout Engine
   - LayoutProvider component
   - LayoutContext
   - LayoutSelector component

2. Create Layout Components
   - DefaultLayout (header, content, footer)
   - SidebarLayout (with sidebar)
   - FullWidthLayout (no margins)
   - BlankLayout (minimal)

3. Layout Configuration
   - Position configuration
   - Widget assignment to positions
   - Template selection

**Files to Create:**
- `lib/layouts/LayoutEngine.ts` (new)
- `lib/layouts/layouts/DefaultLayout.tsx` (new)
- `lib/layouts/layouts/SidebarLayout.tsx` (new)
- `components/admin/LayoutSelector.tsx` (new)
- `app/actions/layout.ts` (new)

**Acceptance Criteria:**
- [ ] Can select layout per page
- [ ] Can assign widgets to positions
- [ ] Layout is responsive
- [ ] Can create custom layouts

---

## Phase 3: Additional Features (Week 5)

### Priority 3.1: Poll System

**Tasks:**
1. Create Poll Tables
```sql
CREATE TABLE public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  stop_date TIMESTAMPTZ,
  poll_type TEXT DEFAULT 'single',
  max_choices INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.poll_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0
);

CREATE TABLE public.poll_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  poll_item_id UUID REFERENCES public.poll_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Create Poll Components
   - PollCreator (admin)
   - PollDisplay (frontend)
   - PollResults (after voting)

**Acceptance Criteria:**
- [ ] Can create polls with multiple options
- [ ] Can vote (logged in users)
- [ ] Vote tracking works
- [ ] Can view results
- [ ] Can set expiration date

---

### Priority 3.2: RSS Feeds

**Tasks:**
1. Create RSS Generation
   - RSS feed for boards
   - RSS feed for pages
   - Configurable feed settings

2. Create RSS Endpoint
   - `/api/rss/[slug].xml`
   - Support for RSS 2.0

**Acceptance Criteria:**
- [ ] RSS feed generates valid XML
- [ ] Feed includes recent posts
- [ ] Feed updates automatically
- [ ] Can configure feed settings

---

### Priority 3.3: Spam Filtering

**Tasks:**
1. Implement Spam Detection
   - Link spam detection
   - Keyword filtering
   - Frequency limiting
   - CAPTCHA integration

2. Create Spam Management
   - Spam queue
   - Spam review interface
   - Auto-moderation rules

**Acceptance Criteria:**
- [ ] Spam comments are flagged
- [ ] Can review spam queue
- [ ] Can configure spam rules
- [ ] CAPTCHA works (optional)

---

## Phase 4: Polish & Deploy (Week 6)

### Tasks:

1. **Testing**
   - Unit tests (Jest)
   - Integration tests (Playwright)
   - E2E tests (critical user flows)
   - Performance testing

2. **Documentation**
   - API documentation
   - Component documentation
   - Deployment guide
   - User manual

3. **CI/CD**
   - GitHub Actions workflow
   - Automated testing
   - Automated deployment to Vercel
   - Environment variable management

4. **Data Migration**
   - Migration script development
   - Test migration (staging)
   - Production migration plan
   - Rollback procedures

5. **Launch Preparation**
   - Security audit
   - Performance optimization
   - SEO optimization
   - Analytics setup

---

## Parallel Development Strategy

### Team Structure (3-4 Developers)

**Team Lead (MoAI Orchestrator):**
- Coordinates work distribution
- Manages dependencies between tasks
- Handles merge conflicts
- Quality gate validation

**Developer 1 (Backend Focus):**
- Server Actions implementation
- Database schema changes
- API endpoints
- Migration scripts

**Developer 2 (Frontend Focus):**
- React components
- UI/UX implementation
- State management
- Client-side features

**Developer 3 (Full Stack):**
- Feature complete implementation
- Integration testing
- Bug fixes
- Documentation

**Developer 4 (Testing/DevOps):**
- Test development
- CI/CD pipeline
- Deployment automation
- Performance monitoring

### Work Distribution

**Week 1-2 (Phase 1):**
- Dev 1: Media upload/delete actions, Editor autosave
- Dev 2: MediaBrowser, RichTextEditor, MenuEditor UI
- Dev 3: Menu CRUD, MenuItem operations
- Dev 4: Test setup, CI/CD initial config

**Week 3-4 (Phase 2):**
- Dev 1: Widget renderer, Widget actions
- Dev 2: Widget UI components, Theme UI
- Dev 3: Theme engine, Layout system
- Dev 4: Integration tests, Performance testing

**Week 5 (Phase 3):**
- Dev 1: Poll tables and actions
- Dev 2: Poll components
- Dev 3: RSS generation, Spam filtering
- Dev 4: E2E tests, Documentation

**Week 6 (Phase 4):**
- All: Testing, Bug fixes, Documentation, Deployment prep

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Delay delivery | Strict feature prioritization |
| Merge conflicts | Lost work | Frequent merges, clear ownership |
| Performance issues | Poor UX | Load testing, query optimization |
| Security vulnerabilities | Data breach | Security audit, OWASP compliance |
| Data migration failure | Data loss | Test migrations, backups |

---

## Success Criteria

### Must Have (MVP):
- [ ] Media upload/management working
- [ ] WYSIWYG editor integrated
- [ ] Menu system complete
- [ ] All CRUD operations functional
- [ ] Authentication/authorization working
- [ ] Responsive design maintained

### Should Have:
- [ ] Widget system functional
- [ ] Theme switching working
- [ ] Layout system complete
- [ ] Poll system working
- [ ] RSS feeds generating

### Could Have:
- [ ] Spam filtering
- [ ] Advanced analytics
- [ ] Custom field types
- [ ] Advanced search UI

---

## Next Steps

1. ✅ **COMPLETE** - Analysis of original Rhymix
2. ✅ **COMPLETE** - Requirements traceability matrix
3. ✅ **COMPLETE** - Implementation plan
4. **READY TO START** - Set up team development structure
5. **READY TO START** - Begin Phase 1 implementation

---

**Document Version:** 1.0
**Last Updated:** 2026-02-22
**Status:** Ready for Execution
