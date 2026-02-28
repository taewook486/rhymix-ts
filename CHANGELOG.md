# Changelog

All notable changes to the Rhymix-TS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2026-02-28

#### SPEC-ADMIN-MENU-001: Admin Menu System

**Component Updates:**
- Updated `components/admin/AdminSidebar.tsx` with 7-category menu structure
- Implemented multi-language support (Korean/English) for all menu items
- Added permission-based access control for each menu item
- Implemented mobile-responsive collapsible sidebar

**New Admin Route Pages (12):**
- `/admin/points` - Point management system
- `/admin/documents` - Document management
- `/admin/comments` - Comment management
- `/admin/editor` - Editor configuration
- `/admin/spam-filter` - Spam filter settings
- `/admin/trash` - Trash management
- `/admin/notifications` - Mail/SMS/Push notifications
- `/admin/notification-center` - Notification center settings
- `/admin/admin-setup` - Admin configuration
- `/admin/filebox` - Filebox management
- `/admin/easy-install` - Easy installation module
- `/admin/installed-layouts` - Layout management

**Features:**
- 8 main menu categories: Dashboard, Site, Members, Content, Notifications, Configuration, Advanced, Logs
- 30+ total menu items matching ASIS Rhymix structure
- Locale-aware navigation with automatic prefix handling
- Mobile-first responsive design with overlay

#### SPEC-SETUP-001: Initial Setup System

**Database Migration:**
- Created `supabase/migrations/014_initial_data_seed.sql` with comprehensive default data

**Server Actions:**
- Created `app/actions/seed.ts` with seeding functions:
  - `checkSeedingStatus()` - Check if seeding is complete
  - `seedDefaultData()` - Execute initial data seeding
  - `verifySeeding()` - Verify seeding integrity

**Default Data Seeded:**
- **3 Default Boards**: Free Board, Q&A, Notice
- **3 Menu Structures**: GNB, UNB, FNB with 8 menu items
- **2 Layouts**: PC and Mobile layouts
- **3 Pages**: Welcome, Terms, Privacy
- **4 Dashboard Widgets**: Recent Comments, Latest Documents, Member Stats, Document Stats
- **17 Site Configuration Keys**: Theme, SEO, Authentication, Email, Features, Modules

**Features:**
- Idempotent seeding - safe to run multiple times
- Transaction integrity - all-or-nothing execution
- Built-in verification functions
- Helper functions for status checking

### Changed

- Updated project structure documentation in README.md
- Enhanced admin navigation with hierarchical menu system
- Improved mobile responsiveness of admin sidebar

### Technical Details

**Admin Menu Architecture:**
- Centralized menu definition in `AdminSidebar.tsx`
- TypeScript interfaces for type-safe menu configuration
- Permission strings for role-based access control
- Icon mapping using lucide-react

**Seed Data System:**
- SQL-level idempotency using `ON CONFLICT DO NOTHING`
- Server action integration with Supabase client
- JSONB configuration storage for flexible settings
- Verification functions for integrity checking

**Migration Features:**
- Helper functions: `verify_initial_seed()`, `is_seeding_complete()`
- Permission grants for anon and authenticated roles
- Comprehensive inline documentation with @MX tags

---

## [0.1.0] - 2026-02-24

### Added

#### Phase 1: Project Setup
- Initial Next.js 16 project with App Router
- TypeScript 5.9+ configuration
- Supabase integration
- Tailwind CSS + shadcn/ui setup
- Vitest + Playwright testing setup

#### Phase 2: Database Schema
- PostgreSQL 16 schema via Supabase
- Row-Level Security (RLS) policies
- Core tables: users, boards, documents, comments, pages, menus
- Authentication system

#### Phase 3: Admin Panel Core
- Basic admin dashboard
- Board management interface
- Member management interface
- Media library
- Page management
- Menu management
- Group management
- Permission system

#### Phase 4: Features
- WYSIWYG editor integration
- Messaging system
- Notification system
- Layout system
- Draft support
- Admin logs
- CI/CD pipeline
- MySQL to PostgreSQL migration

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
