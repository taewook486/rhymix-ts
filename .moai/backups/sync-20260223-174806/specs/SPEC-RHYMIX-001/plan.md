# Implementation Plan: Rhymix PHP CMS to React/Next.js Conversion

**SPEC Reference:** SPEC-RHYMIX-001
**Document Version:** 1.0.0
**Last Updated:** 2026-02-20

## Overview

This plan outlines the phased implementation strategy for converting Rhymix PHP CMS to a modern React/Next.js application. The conversion prioritizes core functionality preservation while leveraging modern web technologies for improved performance, developer experience, and deployment capabilities.

**TAG BLOCK Traceability:**
```
SPEC-ID: SPEC-RHYMIX-001
DOCUMENT: plan.md
VERSION: 1.0.0
RELATED: spec.md, acceptance.md
PHASES: 5 (Foundation, Architecture, Core Modules, Advanced Features, Deployment)
```

## Development Methodology

**Selected Methodology:** Hybrid (TDD for new, DDD for legacy)

**Rationale:**
- **TDD for New Code:** All new React/Next.js components and Server Actions follow RED-GREEN-REFACTOR cycle
- **DDD for Legacy Analysis:** Existing Rhymix PHP modules analyzed with ANALYZE-PRESERVE-IMPROVE before conversion
- **Coverage Target:** 85% for new code, characterization tests for legacy analysis

**Success Criteria:**
- All SPEC requirements implemented
- New code has TDD-level coverage (85%+)
- Legacy analysis documented with characterization tests
- TRUST 5 quality gates passed

---

## Phase 1: Foundation Setup (Priority High)

### Milestone 1.1: Project Initialization

**Objectives:**
- Initialize Next.js 16 project with App Router
- Configure TypeScript 5.9+ strict mode
- Set up Tailwind CSS and shadcn/ui
- Configure ESLint and Prettier

**Technical Approach:**
1. Create Next.js project: `npx create-next-app@latest --typescript --tailwind --app`
2. Verify versions: Next.js 16+, React 19, TypeScript 5.9+
3. Initialize shadcn/ui: `npx shadcn-ui@latest init`
4. Configure ESLint with Next.js and TypeScript rules
5. Configure Prettier with Tailwind plugin
6. Create Git repository and initial commit

**Dependencies:**
- None (foundation phase)

**Estimated Files:**
- next.config.ts
- tailwind.config.ts
- tsconfig.json
- package.json
- .eslintrc.json
- .prettierrc

**Risk Assessment:**
- Risk: Version conflicts between Next.js 16 and React 19
- Mitigation: Verify compatibility matrix before initialization

### Milestone 1.2: Supabase Integration

**Objectives:**
- Create Supabase project
- Configure environment variables
- Set up Supabase client (server and browser)
- Implement authentication utilities

**Technical Approach:**
1. Create Supabase project at https://supabase.com
2. Get project URL and anon keys
3. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`
4. Create lib/supabase/client.ts for browser client
5. Create lib/supabase/server.ts for server client
6. Create lib/supabase/admin.ts for admin operations
7. Configure .env.local with Supabase credentials

**Dependencies:**
- Milestone 1.1 completion
- Valid Supabase account and project

**Estimated Files:**
- lib/supabase/client.ts
- lib/supabase/server.ts
- lib/supabase/admin.ts
- lib/supabase/auth.ts
- .env.local
- .env.example

**Risk Assessment:**
- Risk: Credential exposure in version control
- Mitigation: Add .env.local to .gitignore, use .env.example template

### Milestone 1.3: Development Environment

**Objectives:**
- Set up development database
- Configure TypeScript path aliases
- Set up testing infrastructure
- Configure Git hooks

**Technical Approach:**
1. Create Supabase local development environment
2. Configure tsconfig.json with path aliases (@/components, @/lib, @/actions)
3. Set up Vitest for unit testing
4. Set up React Testing Library for component testing
5. Set up Playwright for E2E testing
6. Configure Husky for Git hooks (pre-commit, pre-push)

**Dependencies:**
- Milestone 1.2 completion

**Estimated Files:**
- vitest.config.ts
- playwright.config.ts
- .husky/pre-commit
- .husky/pre-push

**Risk Assessment:**
- Risk: Local environment divergence from production
- Mitigation: Use Docker for consistency, document environment setup

---

## Phase 2: Core Architecture (Priority High)

### Milestone 2.1: Database Schema Design

**Objectives:**
- Design Supabase PostgreSQL schema
- Create all required tables
- Implement Row-Level Security (RLS) policies
- Set up database functions and triggers

**Technical Approach:**
1. Analyze Rhymix MySQL schema from C:\GitHub\rhymix
2. Design equivalent PostgreSQL schema for Supabase
3. Create migration files for:
   - profiles (extends auth.users)
   - boards
   - posts
   - comments
   - categories
   - menus
   - documents
   - document_versions
   - translations
4. Implement RLS policies for each table
5. Create database functions (increment_view_count, etc.)
6. Create triggers for updated_at timestamps
7. Set up full-text search indexes

**Dependencies:**
- Milestone 1.2 completion
- Rhymix schema analysis completed

**Estimated Files:**
- supabase/migrations/001_initial_schema.sql
- supabase/migrations/002_rls_policies.sql
- supabase/migrations/003_functions_triggers.sql
- supabase/migrations/004_search_indexes.sql

**Risk Assessment:**
- Risk: Data loss during migration
- Mitigation: Create migration rollback scripts, test on staging first

### Milestone 2.2: Authentication System

**Objectives:**
- Implement Supabase Auth integration
- Create authentication UI components
- Implement protected route middleware
- Set up session management

**Technical Approach:**
1. Create login page: app/(auth)/login/page.tsx
2. Create signup page: app/(auth)/signup/page.tsx
3. Create auth layout with shared components
4. Implement login Server Action
5. Implement signup Server Action
6. Implement logout Server Action
7. Create auth layout for protected routes
8. Implement middleware.ts for route protection
9. Create useAuth hook for client-side auth state

**Dependencies:**
- Milestone 1.3 completion
- Milestone 2.1 completion (profiles table)

**Estimated Files:**
- app/(auth)/login/page.tsx
- app/(auth)/signup/page.tsx
- app/(auth)/layout.tsx
- actions/auth.ts
- middleware.ts
- hooks/use-auth.ts

**Risk Assessment:**
- Risk: Session leakage or CSRF vulnerabilities
- Mitigation: Follow OWASP guidelines, use Supabase built-in security

### Milestone 2.3: Authorization & Permissions

**Objectives:**
- Implement role-based access control (RBAC)
- Create permission checking utilities
- Implement admin-only routes
- Set up permission-based UI rendering

**Technical Approach:**
1. Define role types: admin, user, guest
2. Create permission checking Server Actions
3. Implement hasPermission utility function
4. Create admin layout with role verification
5. Implement permission-based component rendering
6. Set up RLS policies based on roles

**Dependencies:**
- Milestone 2.2 completion

**Estimated Files:**
- lib/permissions.ts
- lib/rbac.ts
- app/admin/layout.tsx
- components/auth/permission-guard.tsx

**Risk Assessment:**
- Risk: Privilege escalation vulnerabilities
- Mitigation: Server-side verification for all sensitive operations, never trust client state

### Milestone 2.4: File Upload & Storage

**Objectives:**
- Set up Supabase Storage buckets
- Implement file upload Server Actions
- Create file upload UI components
- Implement image optimization

**Technical Approach:**
1. Create Supabase Storage buckets (avatars, attachments)
2. Implement upload Server Action with validation
3. Create file upload component with progress
4. Implement image optimization with Next.js Image
5. Set up file deletion and cleanup
6. Configure CDN caching for uploaded files

**Dependencies:**
- Milestone 1.2 completion

**Estimated Files:**
- actions/file.ts
- components/file/file-upload.tsx
- lib/storage.ts

**Risk Assessment:**
- Risk: Malicious file upload vulnerabilities
- Mitigation: File type validation, size limits, virus scanning

---

## Phase 3: Core Modules (Priority High)

### Milestone 3.1: Board Module

**Objectives:**
- Implement board listing and detail pages
- Create post CRUD operations
- Implement pagination
- Add category filtering

**Technical Approach:**
1. Create board index page: app/(main)/board/page.tsx
2. Create board list page: app/(main)/board/[slug]/page.tsx
3. Create post detail page: app/(main)/board/[slug]/[id]/page.tsx
4. Implement create/edit post pages
5. Create post list Server Component with pagination
6. Create post detail Server Component
7. Implement board Server Actions (createPost, updatePost, deletePost)
8. Create post form components with validation
9. Implement category filtering
10. Add search functionality

**Dependencies:**
- Milestone 2.1 completion (boards, posts, categories tables)
- Milestone 2.2 completion (authentication)
- Milestone 2.3 completion (authorization)

**Estimated Files:**
- app/(main)/board/page.tsx
- app/(main)/board/[slug]/page.tsx
- app/(main)/board/[slug]/[id]/page.tsx
- app/(main)/board/[slug]/new/page.tsx
- app/(main)/board/[slug]/[id]/edit/page.tsx
- actions/board.ts
- components/board/board-list.tsx
- components/board/post-card.tsx
- components/board/post-form.tsx
- components/board/category-filter.tsx

**Risk Assessment:**
- Risk: Performance issues with large post lists
- Mitigation: Implement pagination, caching, and database indexing

### Milestone 3.2: Member Module

**Objectives:**
- Implement user profile pages
- Create profile editing functionality
- Implement user list (for admins)
- Add user management (admin only)

**Technical Approach:**
1. Create profile page: app/(main)/profile/page.tsx
2. Create user profile page: app/(main)/user/[id]/page.tsx
3. Create settings page: app/(main)/settings/page.tsx
4. Implement profile update Server Actions
5. Create admin user management page
6. Implement user CRUD operations (admin)
7. Add avatar upload functionality
8. Implement password change functionality

**Dependencies:**
- Milestone 2.2 completion
- Milestone 2.4 completion (file upload)

**Estimated Files:**
- app/(main)/profile/page.tsx
- app/(main)/user/[id]/page.tsx
- app/(main)/settings/page.tsx
- app/admin/users/page.tsx
- actions/member.ts
- components/member/profile-card.tsx
- components/member/user-form.tsx
- components/member/avatar-upload.tsx

**Risk Assessment:**
- Risk: Privacy violations from profile data exposure
- Mitigation: Implement granular privacy controls, RLS policies

### Milestone 3.3: Document Module

**Object Questions:**
- Implement document CRUD operations
- Create version history tracking
- Add draft/published workflow
- Implement document search

**Technical Approach:**
1. Create document list page: app/(main)/documents/page.tsx
2. Create document detail page: app/(main)/documents/[id]/page.tsx
3. Create document editor page: app/(main)/documents/new/page.tsx
4. Implement document Server Actions
5. Create version history tracking
6. Implement document versions table
7. Add draft/published status workflow
8. Create document history viewer
9. Implement document search with full-text

**Dependencies:**
- Milestone 2.1 completion (documents, document_versions tables)
- Milestone 3.2 completion (author tracking)

**Estimated Files:**
- app/(main)/documents/page.tsx
- app/(main)/documents/[id]/page.tsx
- app/(main)/documents/new/page.tsx
- app/(main)/documents/[id]/edit/page.tsx
- actions/document.ts
- components/document/document-list.tsx
- components/document/document-editor.tsx
- components/document/version-history.tsx

**Risk Assessment:**
- Risk: Data loss from concurrent edits
- Mitigation: Implement optimistic locking or conflict resolution

### Milestone 3.4: Comment Module

**Objectives:**
- Implement comment creation and display
- Add nested comment threading
- Implement comment moderation
- Add real-time comment updates

**Technical Approach:**
1. Create comment list component
2. Implement comment creation Server Action
3. Add nested comment threading support
4. Implement comment edit/delete (own comments)
5. Add comment moderation (admin)
6. Set up Supabase Realtime for live comments
7. Create comment notification system
8. Add comment pagination

**Dependencies:**
- Milestone 2.1 completion (comments table)
- Milestone 2.2 completion (authentication)
- Supabase Realtime enabled

**Estimated Files:**
- components/comment/comment-list.tsx
- components/comment/comment-item.tsx
- components/comment/comment-form.tsx
- actions/comment.ts
- hooks/use-realtime-comments.ts

**Risk Assessment:**
- Risk: Spam or abusive comments
- Mitigation: Implement rate limiting, moderation tools, spam filtering

### Milestone 3.5: Menu/Navigation Module

**Objectives:**
- Implement hierarchical menu system
- Create menu management UI (admin)
- Add menu item editing
- Implement active state highlighting

**Technical Approach:**
1. Create navigation component
2. Implement menu Server Component
3. Create admin menu management page
4. Implement menu CRUD Server Actions
5. Add drag-and-drop menu ordering
6. Implement menu item linking
7. Add menu permission filtering

**Dependencies:**
- Milestone 2.1 completion (menus table)
- Milestone 2.3 completion (permissions)

**Estimated Files:**
- components/layout/navigation.tsx
- components/layout/footer.tsx
- app/admin/menus/page.tsx
- actions/menu.ts
- components/menu/menu-editor.tsx

**Risk Assessment:**
- Risk: Circular menu references causing infinite loops
- Mitigation: Validate menu structure, implement depth limits

---

## Phase 4: Advanced Features (Priority Medium)

### Milestone 4.1: Multi-language Support

**Objectives:**
- Implement i18n system
- Create translation management UI
- Add language detection
- Implement language switching

**Technical Approach:**
1. Create translations table in Supabase
2. Implement translation loading Server Action
3. Create language detection middleware
4. Add language switcher component
5. Create translation management UI (admin)
6. Implement translation export/import
7. Add RTL language support (if needed)

**Dependencies:**
- Milestone 2.1 completion (translations table)
- Milestone 3.5 completion (navigation integration)

**Estimated Files:**
- lib/i18n.ts
- components/i18n/language-switcher.tsx
- app/admin/translations/page.tsx
- actions/translation.ts

**Risk Assessment:**
- Risk: Incomplete translations causing UI issues
- Mitigation: Implement fallback to English, translate missing indicators

### Milestone 4.2: Mobile Responsive Design

**Objectives:**
- Ensure all pages are mobile-responsive
- Implement mobile navigation
- Add touch-friendly interactions
- Optimize for mobile performance

**Technical Approach:**
1. Audit all pages for mobile responsiveness
2. Implement responsive breakpoints
3. Create mobile navigation drawer
4. Add touch-friendly form inputs
5. Optimize images for mobile
6. Implement lazy loading for mobile
7. Test on actual mobile devices

**Dependencies:**
- Phase 3 core modules completion

**Estimated Files:**
- components/layout/mobile-nav.tsx
- tailwind.config.ts (responsive breakpoints)
- Various component updates for responsiveness

**Risk Assessment:**
- Risk: Poor mobile UX from desktop-first design
- Mitigation: Mobile-first design approach, regular mobile testing

### Milestone 4.3: Search Functionality

**Objectives:**
- Implement full-text search
- Add search UI
- Implement search filters
- Add search analytics

**Technical Approach:**
1. Create search page: app/(main)/search/page.tsx
2. Implement search Server Action using Supabase full-text
3. Add search result highlighting
4. Implement search filters (type, date, author)
5. Add search analytics tracking
6. Implement search suggestions/autocomplete
7. Add search result pagination

**Dependencies:**
- Milestone 2.1 completion (search indexes)
- Phase 3 core modules completion

**Estimated Files:**
- app/(main)/search/page.tsx
- actions/search.ts
- components/search/search-bar.tsx
- components/search/search-results.tsx
- components/search/search-filters.tsx

**Risk Assessment:**
- Risk: Slow search performance
- Mitigation: Database indexing, caching, pagination

### Milestone 4.4: Admin Panel

**Objectives:**
- Create comprehensive admin dashboard
- Implement site configuration management
- Add analytics dashboard
- Create user management interface

**Technical Approach:**
1. Create admin dashboard: app/admin/page.tsx
2. Implement site settings page
3. Create analytics dashboard with charts
4. Implement content management interface
5. Add system health monitoring
6. Create admin activity log
7. Implement bulk operations

**Dependencies:**
- Milestone 2.3 completion (admin authorization)
- Phase 3 core modules completion
- Phase 4 advanced features (search, analytics)

**Estimated Files:**
- app/admin/page.tsx
- app/admin/settings/page.tsx
- app/admin/analytics/page.tsx
- app/admin/content/page.tsx
- components/admin/dashboard.tsx
- components/admin/analytics-chart.tsx

**Risk Assessment:**
- Risk: Admin operations breaking production data
- Mitigation: Confirmation dialogs, soft delete, audit logging

### Milestone 4.5: Theme/Skin System

**Objectives:**
- Implement theme switching
- Create theme customization UI
- Add dark mode support
- Implement theme presets

**Technical Approach:**
1. Implement theme provider context
2. Create dark/light theme variants
3. Add theme switcher component
4. Implement theme persistence
5. Create theme customization UI (admin)
6. Add theme export/import

**Dependencies:**
- Tailwind CSS setup (Milestone 1.1)
- shadcn/ui theming support

**Estimated Files:**
- components/theme/theme-provider.tsx
- components/theme/theme-switcher.tsx
- app/admin/appearance/page.tsx
- lib/theme.ts

**Risk Assessment:**
- Risk: Theme inconsistencies across components
- Mitigation: Design system documentation, component theming standards

---

## Phase 5: Deployment & Migration (Priority High)

### Milestone 5.1: Data Migration

**Objectives:**
- Create migration scripts from MySQL to Supabase
- Migrate user data
- Migrate content (posts, comments, documents)
- Verify data integrity

**Technical Approach:**
1. Analyze Rhymix MySQL schema and data
2. Create migration scripts (TypeScript/Node.js)
3. Implement data transformation logic
4. Migrate users with password hashes
5. Migrate boards, posts, comments
6. Migrate documents and versions
7. Migrate categories and menus
8. Verify data integrity
9. Create rollback capability

**Dependencies:**
- Milestone 2.1 completion (target schema)
- Access to source Rhymix database

**Estimated Files:**
- scripts/migrate/users.ts
- scripts/migrate/boards.ts
- scripts/migrate/posts.ts
- scripts/migrate/comments.ts
- scripts/migrate/documents.ts
- scripts/migrate/verify.ts
- scripts/migrate/rollback.ts

**Risk Assessment:**
- Risk: Data corruption or loss during migration
- Mitigation: Backup source database, test migration on staging, verify integrity

### Milestone 5.2: Vercel Deployment Configuration

**Objectives:**
- Configure Vercel deployment
- Set up environment variables
- Configure custom domain (if applicable)
- Set up preview deployments

**Technical Approach:**
1. Connect GitHub repository to Vercel
2. Configure build settings (Next.js 16)
3. Set up environment variables in Vercel
4. Configure custom domain
5. Enable preview deployments for PRs
6. Set up deployment protections
7. Configure CDN caching

**Dependencies:**
- Phase 1-4 completion
- Vercel account

**Estimated Files:**
- vercel.json
- .env.production.example

**Risk Assessment:**
- Risk: Deployment failures or environment issues
- Mitigation: Staging environment first, deployment testing, rollback plan

### Milestone 5.3: CI/CD Pipeline

**Objectives:**
- Set up automated testing
- Configure linting and type checking
- Set up automated deployments
- Add deployment notifications

**Technical Approach:**
1. Configure GitHub Actions workflows
2. Run tests on every PR
3. Run linter and type checker
4. Set up automated deployment on merge
5. Add deployment status notifications
6. Configure branch protection rules
7. Set up staging environment

**Dependencies:**
- Milestone 1.3 completion (testing infrastructure)
- Milestone 5.2 completion (Vercel integration)

**Estimated Files:**
- .github/workflows/ci.yml
- .github/workflows/deploy.yml

**Risk Assessment:**
- Risk: Broken code deployed to production
- Mitigation: Required status checks, staging environment, manual approval

---

## Technical Approach Summary

### Architecture Patterns

**Component Architecture:**
- Server Components by default for data fetching
- Client Components for interactivity (forms, realtime)
- Server Actions for all mutations
- React Context for global state (auth, theme)

**Database Access Patterns:**
- Server Components: Use supabaseServer client
- Server Actions: Use supabaseAdmin for elevated privileges
- Client Components: Use supabaseBrowser with RLS
- Realtime: Use Supabase Realtime subscriptions

**Authentication Flow:**
1. User signs in via Supabase Auth
2. Middleware verifies session on protected routes
3. Server Components verify auth server-side
4. Client components use useAuth hook for UI state

**Authorization Flow:**
1. User role stored in profiles table
2. RLS policies enforce database-level security
3. Server Actions verify permissions before mutations
4. UI components conditionally render based on role

### Technology Stack Justification

**Next.js 16 App Router:**
- Industry standard for React applications
- Server Components reduce client JavaScript
- Built-in optimization (Image, Font, routing)
- Vercel deployment integration

**Supabase:**
- PostgreSQL 16 with modern features
- Built-in authentication (OAuth, magic links)
- Row-Level Security for multi-tenancy
- Realtime and Storage included
- Generous free tier

**Tailwind CSS + shadcn/ui:**
- Rapid UI development
- Consistent design system
- Accessible components by default
- Easy customization

**TypeScript 5.9+:**
- Type safety prevents runtime errors
- Better IDE support
- Improved developer experience

### Risk Mitigation Strategies

**Performance Risks:**
- Implement pagination for all lists
- Use Next.js Image optimization
- Implement aggressive caching
- Monitor Core Web Vitals

**Security Risks:**
- RLS policies for all tables
- Input validation with Zod
- CSRF protection via Server Actions
- Regular security audits

**Data Integrity Risks:**
- Comprehensive migration testing
- Data verification scripts
- Rollback capability
- Staging environment validation

**Deployment Risks:**
- Blue-green deployment strategy
- Staging environment testing
- Automated rollback on failure
- Monitoring and alerting

---

## Dependencies & Timeline

**Phase Dependencies:**
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion
- Phase 4 can start after Phase 3 Milestone 3.1
- Phase 5 depends on Phase 1-4 completion

**External Dependencies:**
- Supabase project availability
- Vercel account setup
- Source Rhymix database access
- Domain configuration (for custom domain)

**Recommended Sequence:**
1. Foundation Setup (Phase 1) - Must be first
2. Core Architecture (Phase 2) - Must be second
3. Core Modules (Phase 3) - Can be partially parallelized per module
4. Advanced Features (Phase 4) - Can be parallelized with Phase 3
5. Deployment & Migration (Phase 5) - Must be last

---

## Success Metrics

**Technical Metrics:**
- 85%+ code coverage
- Zero TypeScript errors
- Zero ESLint warnings
- P50 page load < 1s
- P95 page load < 2s
- TTI < 3s

**Quality Metrics:**
- All TRUST 5 gates passed
- Zero critical security vulnerabilities
- Zero high-priority bugs
- 100% requirement coverage

**User Metrics:**
- Feature parity with Rhymix core modules
- Improved performance over legacy PHP
- Mobile-responsive design
- Accessible (WCAG 2.1 AA)

---

## Next Steps

**Immediate Actions:**
1. Review and approve this plan
2. Set up development environment
3. Create Supabase project
4. Begin Phase 1: Foundation Setup

**After Plan Approval:**
1. Execute `/moai:2-run SPEC-RHYMIX-001` to begin implementation
2. Follow DDD/TDD hybrid methodology
3. Regular progress updates
4. Quality gate validation at each milestone

**Documentation:**
- Refer to `spec.md` for detailed requirements
- Refer to `acceptance.md` for acceptance criteria
- All implementation traceable to SPEC-RHYMIX-001

---

**TAG BLOCK Traceability:**
```
SPEC-ID: SPEC-RHYMIX-001
DOCUMENT: plan.md
TRACEABILITY-TO: spec.md (requirements), acceptance.md (criteria)
NEXT-PHASE: /moai:2-run SPEC-RHYMIX-001
```
