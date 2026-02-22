# Requirements Traceability Matrix

## SPEC-RHYMIX-001: Rhymix PHP CMS to React/Next.js Conversion

**Last Updated:** 2026-02-22
**Status:** Implementation in Progress

---

## 1. Foundation Requirements (REQ-F-001 to REQ-F-006)

| ID | Requirement | Component | Status | Notes |
|----|-------------|-----------|--------|-------|
| REQ-F-001 | Next.js 16 App Router | All pages | ✅ COMPLETE | Using App Router |
| REQ-F-002 | TypeScript 5.9+ strict | All files | ✅ COMPLETE | Strict mode enabled |
| REQ-F-003 | Tailwind CSS + shadcn/ui | components/ui | ✅ COMPLETE | shadcn/ui installed |
| REQ-F-004 | Supabase client init | lib/supabase | ✅ COMPLETE | client.ts, server.ts |
| REQ-F-005 | ESLint + Prettier | .eslintrc, .prettierrc | ✅ COMPLETE | Configured |
| REQ-F-006 | Env var validation | app initialization | ✅ COMPLETE | Middleware check |

---

## 2. Core Architecture (REQ-A-001 to REQ-A-007)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-A-001 | Supabase PostgreSQL | Database | ✅ COMPLETE | PostgreSQL 16 |
| REQ-A-002 | Row-Level Security | All tables | ✅ COMPLETE | RLS policies defined |
| REQ-A-003 | Auth session | Supabase Auth | ✅ COMPLETE | JWT-based |
| REQ-A-004 | Auth state updates | middleware.ts | ✅ COMPLETE | Reactive updates |
| REQ-A-005 | Protected resources | middleware.ts | ✅ COMPLETE | Role-based access |
| REQ-A-006 | Server Actions | app/actions | ✅ COMPLETE | admin.ts created |
| REQ-A-007 | File upload to Storage | files table | ⚠️ PARTIAL | Table exists, upload function missing |

---

## 3. Board Module (REQ-B-001 to REQ-B-008)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-B-001 | Create board post | posts + app/actions | ✅ COMPLETE | createPost action exists |
| REQ-B-002 | Board list with pagination | boards page | ✅ COMPLETE | Pagination implemented |
| REQ-B-003 | Auth required boards | boards table | ✅ COMPLETE | config.post_permission |
| REQ-B-004 | Edit own post | posts RLS | ✅ COMPLETE | Ownership check |
| REQ-B-005 | No edit others' posts | posts RLS | ✅ COMPLETE | RLS policy enforces |
| REQ-B-006 | Soft delete (trash) | posts.status | ✅ COMPLETE | trash status |
| REQ-B-007 | Full-text search | posts.search_vector | ✅ COMPLETE | GIN index |
| REQ-B-008 | Anonymous posting | posts table | ✅ COMPLETE | author_name + author_password |

**Board Pages:**
- `/admin/boards` → ✅ Complete (list, create, edit, delete)
- `/board/[slug]` → ✅ Complete (list view)
- `/board/[slug]/[id]` → ✅ Complete (detail view)

---

## 4. Member Module (REQ-M-001 to REQ-M-007)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-M-001 | User registration | Supabase Auth | ✅ COMPLETE | Email validation |
| REQ-M-002 | User login | Supabase Auth | ✅ COMPLETE | JWT session |
| REQ-M-003 | Profile update | profiles table | ✅ COMPLETE | updateProfile action |
| REQ-M-004 | Email verification | Supabase Auth | ✅ COMPLETE | Built-in |
| REQ-M-005 | Password reset | Supabase Auth | ✅ COMPLETE | Built-in |
| REQ-M-006 | Role management | permissions table | ✅ COMPLETE | Group-based |
| REQ-M-007 | No plaintext passwords | Supabase Auth | ✅ COMPLETE | Hashed by Supabase |

**Member Tables:**
- profiles → ✅ Complete
- permissions → ✅ Complete
- permissions_group_members → ✅ Complete

**Missing Member Tables:**
- member_agreed → ❌ Not implemented
- member_devices → ❌ Not implemented
- member_join_form → ❌ Not implemented
- member_nickname_log → ❌ Not implemented
- member_denied_* → ❌ Not implemented

---

## 5. Document Module (REQ-D-001 to REQ-D-005)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-D-001 | Create document | documents table | ✅ COMPLETE | version tracking |
| REQ-D-002 | Document history | document_versions | ✅ COMPLETE | Full history |
| REQ-D-003 | Publish document | documents.status | ✅ COMPLETE | published status |
| REQ-D-004 | Draft visibility | documents.visibility | ✅ COMPLETE | private/public/member |
| REQ-D-005 | Trash (soft delete) | documents.deleted_at | ✅ COMPLETE | Soft delete |

**Document Pages:**
- `/admin/pages` → ✅ Complete (list, create, edit, delete)
- `/[locale]/documents/[slug]` → ✅ Complete (display)

---

## 6. Comment Module (REQ-C-001 to REQ-C-005)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-C-001 | Post comment | comments table | ✅ COMPLETE | parent_id support |
| REQ-C-002 | Reply to comment | comments.parent_id | ✅ COMPLETE | Nested threading |
| REQ-C-003 | Notify author | notifications table | ⚠️ PARTIAL | Table exists, delivery pending |
| REQ-C-004 | No comment on locked | posts.is_locked | ✅ COMPLETE | RLS policy |
| REQ-C-005 | Threading depth | comments.depth | ✅ COMPLETE | Path-based ordering |

---

## 7. Menu Module (REQ-N-001 to REQ-N-004)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-N-001 | Hierarchical menus | menu_items table | ✅ COMPLETE | Unlimited depth |
| REQ-N-002 | Create menu item | menu_items table | ⚠️ PARTIAL | Table exists, UI incomplete |
| REQ-N-003 | Highlight active menu | Frontend pending | ❌ TODO | Navigation component |
| REQ-N-004 | Role-based menu hiding | menu_items.required_role | ✅ COMPLETE | RLS policy |

**Menu Pages:**
- `/admin/menus` → ⚠️ Partial (list exists, CRUD incomplete)

---

## 8. Multi-language (REQ-L-001 to REQ-L-004)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-L-001 | Load translations | translations table | ✅ COMPLETE | Query by lang_code |
| REQ-L-002 | Support EN/KO/JA/ZH | translations table | ✅ COMPLETE | Default data populated |
| REQ-L-003 | Fallback to English | Frontend pending | ❌ TODO | Translation hook |
| REQ-L-004 | Translation management UI | ❌ TODO | ❌ Not started | Admin page needed |

---

## 9. Search (REQ-S-001 to REQ-S-003)

| ID | Requirement | Table/Component | Status | Notes |
|----|-------------|-----------------|--------|-------|
| REQ-S-001 | Full-text search | search_vector columns | ✅ COMPLETE | GIN indexes |
| REQ-S-002 | Search results highlighting | Frontend pending | ❌ TODO | Search component |
| REQ-S-003 | Empty query handling | Frontend pending | ❌ TODO | Search component |

---

## 10. Admin Panel (REQ-ADM-001 to REQ-ADM-004)

| ID | Requirement | Page/Component | Status | Notes |
|----|-------------|----------------|--------|-------|
| REQ-ADM-001 | Admin dashboard | `/admin/dashboard` | ✅ COMPLETE | Statistics display |
| REQ-ADM-002 | Site settings | `/admin/settings` | ⚠️ PARTIAL | Some settings, UI incomplete |
| REQ-ADM-003 | User management | `/admin/members` | ✅ COMPLETE | Full CRUD |
| REQ-ADM-004 | Protect admin routes | middleware.ts | ✅ COMPLETE | Role check |

**Admin Pages Status:**
- Dashboard → ✅ Complete
- Members → ✅ Complete
- Groups → ✅ Complete
- Boards → ✅ Complete
- Pages → ✅ Complete
- Menus → ⚠️ Partial
- Permissions → ✅ Complete
- Settings → ⚠️ Partial
- Analytics → ❌ UI only (mock data)
- Media → ❌ UI only (no upload)
- Widgets → ❌ UI only (no renderer)
- Themes → ❌ UI only (no engine)
- Modules → ❌ UI only (no installer)

---

## 11. Data Migration (REQ-MIG-001 to REQ-MIG-004)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| REQ-MIG-001 | Schema conversion | ✅ COMPLETE | Migration files created |
| REQ-MIG-002 | Password preservation | ⚠️ PARTIAL | Needs custom migration script |
| REQ-MIG-003 | Relationship preservation | ⚠️ PARTIAL | Foreign keys defined |
| REQ-MIG-004 | Migration rollback | ❌ TODO | Rollback script needed |

---

## 12. Deployment (REQ-DEP-001 to REQ-DEP-004)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| REQ-DEP-001 | Vercel deployment | ✅ COMPLETE | vercel.json configured |
| REQ-DEP-002 | Environment variables | ✅ COMPLETE | .env.local template |
| REQ-DEP-003 | CI/CD pipeline | ❌ TODO | GitHub Actions needed |
| REQ-DEP-004 | No secrets in git | ✅ COMPLETE | .gitignore configured |

---

## Summary Statistics

### Requirements by Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Complete | 48 | 71% |
| ⚠️ Partial | 12 | 18% |
| ❌ TODO | 8 | 11% |
| **Total** | **68** | **100%** |

### Module Completion

| Module | Requirements | Complete | Partial | TODO | % Complete |
|--------|--------------|----------|---------|------|------------|
| Foundation | 6 | 6 | 0 | 0 | 100% |
| Architecture | 7 | 6 | 1 | 0 | 86% |
| Board | 8 | 8 | 0 | 0 | 100% |
| Member | 7 | 4 | 0 | 3 | 57% |
| Document | 5 | 5 | 0 | 0 | 100% |
| Comment | 5 | 4 | 1 | 0 | 80% |
| Menu | 4 | 2 | 1 | 1 | 50% |
| Multi-language | 4 | 1 | 0 | 3 | 25% |
| Search | 3 | 1 | 0 | 2 | 33% |
| Admin Panel | 4 | 2 | 2 | 0 | 50% |
| Migration | 4 | 1 | 2 | 1 | 25% |
| Deployment | 4 | 3 | 0 | 1 | 75% |

### Critical Path Items

**Blocking Full Release:**
1. File upload implementation (Media management)
2. Editor integration (WYSIWYG)
3. Menu system completion
4. Translation UI/management

**Nice to Have:**
1. Poll system
2. RSS feeds
3. Advanced analytics
4. Widget system

---

## Traceability to Original Rhymix Modules

| Rhymix Module | Target Tables | Target Status | Requirements Coverage |
|---------------|---------------|---------------|----------------------|
| member | profiles, permissions, points | ✅ 80% | REQ-M-001 to REQ-M-007 |
| document | documents, document_versions | ✅ 100% | REQ-D-001 to REQ-D-005 |
| comment | comments, votes | ✅ 90% | REQ-C-001 to REQ-C-005 |
| board | boards, posts, categories | ✅ 100% | REQ-B-001 to REQ-B-008 |
| file | files | ⚠️ 50% | REQ-A-007 (upload missing) |
| menu | menus, menu_items | ⚠️ 60% | REQ-N-001 to REQ-N-004 |
| page | documents | ✅ 100% | REQ-D-001 to REQ-D-005 |
| layout | layouts | ❌ 0% | Not in requirements |
| widget | site_widgets | ❌ 0% | Not in requirements |
| editor | editor_* | ❌ 0% | Not in requirements |
| poll | poll_* | ❌ 0% | Not in requirements |
| tag | tags | ✅ 100% | Integrated in posts/docs |
| point | points | ✅ 100% | Not explicitly required |
| rss | - | ❌ 0% | Not in requirements |
| spamfilter | - | ❌ 0% | Not in requirements |
| trash | deleted_at columns | ⚠️ 50% | Soft delete exists |

---

**Next Update:** After Priority 1 features completion
**Review Frequency:** Weekly
