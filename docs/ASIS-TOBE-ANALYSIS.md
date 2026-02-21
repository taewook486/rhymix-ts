# ASIS-TOBE Analysis: Rhymix PHP → Rhymix TS

**Date**: 2026-02-21
**Purpose**: Map ASIS (Rhymix PHP) structure to TOBE (Rhymix TS/Next.js) implementation

---

## ASIS: Rhymix PHP CMS

### Overview
- **Language**: PHP 7.4+
- **Database**: MySQL/MariaDB
- **License**: GNU GPL v2+
- **Origin**: Fork of XpressEngine 1.8 (NAVER)
- **Official**: https://rhymix.org
- **GitHub**: https://github.com/rhymix/rhymix

### Extension Architecture

Rhymix uses a modular extension system:

| Type | Purpose | Location |
|------|---------|----------|
| **Module** | Core functionality features | `/modules/{name}/` |
| **Widget** | Reusable UI components | `/widgets/{name}/` |
| **Skin** | Visual templates for modules | `/modules/{module}/skins/{skin}/` |
| **Layout** | Page layout templates | `/layouts/{name}/` |
| **Addon** | Hook-based extensions | `/addons/{name}/` |

### Module Structure

```
modules/{module_name}/
├── conf/                    # Configuration
│   ├── info.xml            # Module metadata
│   └── module.xml          # Module definition
├── queries/                # SQL queries
│   └── {query}.xml         # Named query definitions
├── schemas/                # DB schemas
├── skins/                  # Visual templates
│   └── {skin}/
│       └── skin.xml        # Skin metadata
├── tpl/                    # Template files
│   └── *.html              # HTML templates
├── lang/                   # Language files
│   └── {lang}.php
├── lib/                    # PHP classes
└── {module}.class.php      # Main module class
```

### Core Modules

| Module | Purpose |
|--------|---------|
| **board** | Forum/discussion board |
| **page** | Static pages |
| **member** | User management |
| **file** | File management |
| **comment** | Comment system |
| **editor** | WYSIWYG editor (SmartEditor, etc.) |
| **menu** | Navigation menus |
| **widget** | Widget management |
| **layout** | Layout management |
| **addon** | Addon management |
| **communication** | Messages/notifications |
| **spamfilter** | Spam protection |
| **counter** | Page view counter |
| **document** | Document model |

### Admin Panel Structure

```
modules/module/
├── admin/                  # Admin views
│   └── tpl/
│       └── *.html
├── conf/
│   └── info.xml
└── queries/
```

---

## TOBE: Rhymix TS (Next.js/Supabase)

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript 5.9+
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **UI**: shadcn/ui, Tailwind CSS
- **State**: React Server Components, Server Actions

### Architecture Mapping

| ASIS (PHP) | TOBE (TS) | Implementation |
|------------|-----------|----------------|
| Module | Route Group | `app/(admin)/`, `app/(main)/` |
| Widget | React Component | `components/widgets/` |
| Skin | UI Variant | Theme variants, prop-based styles |
| Layout | Root Layout | `app/layout.tsx`, nested layouts |
| Addon | Middleware/Hook | `middleware.ts`, custom hooks |

### Directory Structure Mapping

```
ASIS                          TOBE
─────────────────────────────────────────────────
/modules/board/          →    app/(main)/board/
/modules/page/           →    app/(main)/pages/
/modules/member/         →    app/(main)/member/
/modules/admin/          →    app/(admin)/
/widgets/                →    components/widgets/
/layouts/                →    app/ layout files
/addons/                 →    middleware.ts, hooks/
/queries/*.xml           →    lib/db/ queries.ts
/conf/info.xml           →    Module config, types
/skins/                  →    UI variants, themes
/lang/                   →    i18n/ messages/{lang}.json
```

### Data Layer Mapping

| ASIS | TOBE |
|------|------|
| MySQL queries in XML | Supabase client, Postgres functions |
| `DB::getInstance()->query()` | `supabase.from('table').select()` |
| Trigger-based hooks | Supabase RLS, Webhooks |
| Session management | Supabase Auth |
| File uploads | Supabase Storage |

---

## Implementation Progress

### ✅ Completed

| Feature | ASIS Reference | TOBE Implementation |
|---------|----------------|-------------------|
| Authentication | module/member | Supabase Auth, profiles table |
| Installation | install wizard | `/install` route with multi-step |
| Admin Dashboard | module/module/admin | `/admin` with stats and navigation |
| Navigation | module/menu | Navigation component with auth state |
| Board System | module/board | `/board/[boardId]` routes |
| User Profiles | module/member | `/member/[username]` profiles |

### 🚧 In Progress

| Feature | ASIS Reference | TOBE Implementation |
|---------|----------------|-------------------|
| Admin Panel | module/module/admin | Dashboard, members, settings |
| Content Management | module/page, module/board | Pages, boards CRUD |
| Menu Management | module/menu | Menu builder UI |
| Widget System | module/widget | Widget components |
| Theme/Skin System | skins/ | UI variants system |

### 📋 Planned

| Feature | ASIS Reference | TOBE Implementation |
|---------|----------------|-------------------|
| Comments | module/comment | Comment system with threads |
| File Manager | module/file | Supabase Storage integration |
| Editor | module/editor | Tiptap or Lexical editor |
| Notifications | module/communication | Real-time notifications |
| Addons | addons/ | Plugin system |
| Spam Filter | module/spamfilter | Content moderation |
| Counter | module/counter | Page view analytics |

---

## Module-by-Module Analysis

### Board (module/board)

**ASIS Features:**
- Categories, tags, lists
- Post CRUD with permissions
- Comment threads
- File attachments
- Search, pagination
- Latest posts, notices

**TOBE Implementation:**
- ✅ `app/(main)/board/[boardId]/page.tsx`
- ✅ `app/(main)/board/[boardId]/new/page.tsx`
- ✅ `app/(main)/board/[boardId]/post/[postId]/page.tsx`
- ✅ Database: `boards`, `posts`, `comments` tables
- 🚧 Admin: `/admin/boards` CRUD

### Member (module/member)

**ASIS Features:**
- User registration, login
- Profile management
- Groups, permissions
- Avatar upload
- Signature, bio
- Join form fields

**TOBE Implementation:**
- ✅ Supabase Auth for authentication
- ✅ `profiles` table with role, display_name
- ✅ `/signin`, `/signup` routes
- ✅ Profile pages `/member/[username]`
- 🚧 Group management `/admin/groups`
- 🚧 Permission system `/admin/permissions`

### Page (module/page)

**ASIS Features:**
- Static page content
- WYSIWYG editor
- Menu linking
- Permission per page

**TOBE Implementation:**
- 📋 Pages database table
- 📋 `/admin/pages` CRUD
- 📋 Rich text editor integration
- 📋 Page routing `app/(main)/pages/[slug]`

### Menu (module/menu)

**ASIS Features:**
- Menu tree structure
- Menu items (links, separators)
- Menu images, descriptions
- Multiple menus

**TOBE Implementation:**
- 📋 Menu builder UI `/admin/menus`
- 📋 `menus`, `menu_items` tables
- 📋 Navigation component integration

### Widget (module/widget)

**ASIS Features:**
- Widget placement (content, sidebar)
- Widget pages
- Widget skins
- Common widgets: latest posts, login form, etc.

**TOBE Implementation:**
- 📋 Widget components `components/widgets/`
- 📋 Widget placement system
- 📋 Widget page builder

---

## Configuration System

### ASIS: conf/info.xml

```xml
<module>
  <title>Board</title>
  <author>Rhymix</author>
  <version>1.0</version>
  <permissions>
    <permission action="view" target="guest" />
    <permission action="write" target="member" />
    <permission action="manage" target="admin" />
  </permissions>
</module>
```

### TOBE: Module Config

```typescript
// config/board.config.ts
export const boardConfig = {
  title: 'Board',
  version: '1.0.0',
  permissions: {
    view: ['guest', 'member', 'admin'],
    write: ['member', 'admin'],
    manage: ['admin'],
  },
}
```

---

## Sources

- [Rhymix GitHub](https://github.com/rhymix/rhymix)
- [Rhymix Official](https://rhymix.org)
- [Rhymix Docs](https://github.com/rhymix/rhymix-docs)
- [Rhymix GitHub Topics](https://github.com/topics/rhymix)
- [module-da_reaction (Unofficial Guide)](https://github.com/topics/rhymix)

---

## Next Steps

1. **Complete Admin Panel**
   - `/admin/members` - Member management
   - `/admin/boards` - Board CRUD
   - `/admin/pages` - Page management
   - `/admin/menus` - Menu builder
   - `/admin/settings` - Site configuration

2. **Implement Core Modules**
   - Comments system
   - File manager (Supabase Storage)
   - Rich text editor (Tiptap)
   - Notification system

3. **Refactor Installation**
   - Auto-configuration detection
   - Migration runner
   - Sample data seeding

4. **Theme System**
   - Theme variants
   - Custom CSS support
   - Layout builder
