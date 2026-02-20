# SPEC-RHYMIX-001: Rhymix PHP CMS to React/Next.js Conversion

## TAG BLOCK

```
SPEC-ID: SPEC-RHYMIX-001
TITLE: Rhymix PHP CMS to React/Next.js Conversion
STATUS: Planned
PRIORITY: High
DOMAIN: RHYMIX-CONVERSION
CREATED: 2026-02-20
ASSIGNED: manager-ddd
RELATED: None
EPIC: Platform Modernization
```

## Environment

### Source System (Rhymix PHP CMS)

**Location:** C:\GitHub\rhymix

**Technology Stack:**
- Language: PHP 7.4+
- Database: MySQL/MariaDB
- License: GPL v2
- Architecture: MVC Pattern (Model-View-Controller-API)
- Fork Origin: XpressEngine 1.8

**Core Structure:**
- `modules/` - Core modules (board, member, document, comment, file, menu, page, editor, etc.)
- `classes/` - Core classes (Context, DB, Cache, Display, ModuleHandler, etc.)
- `common/` - Common framework, functions, libraries
- `layouts/`, `m.layouts/` - PC and mobile layouts
- `addons/`, `widgets/` - Extension system
- `config/` - Configuration management

**Key Modules:**
1. **board** - Forum/board system with skins, categories, lists, search
2. **member** - User management (join, login, profile, permissions)
3. **document** - Content/document management
4. **comment** - Comment system
5. **file** - File upload/management
6. **menu** - Navigation/menu system
7. **page** - Static page creation
8. **layout** - Layout management
9. **editor** - WYSIWYG editor integration
10. **addon/widget** - Extension system

**Key Features:**
- Multi-language (i18n) support
- Permission system with role-based access control
- Caching mechanism
- Trash/soft delete functionality
- Anonymous posting support
- Categories and tags
- Full-text search
- Mobile responsive design

### Target System (Modern React/Next.js Application)

**Technology Stack:**
- Frontend: React 19, Next.js 16 (App Router)
- Language: TypeScript 5.9+
- Database: Supabase (PostgreSQL 16)
- Hosting: Vercel
- Styling: Tailwind CSS + shadcn/ui
- State Management: React Context + Server Components
- Authentication: Supabase Auth
- Storage: Supabase Storage
- Realtime: Supabase Realtime

**Architecture Principles:**
- Next.js 16 App Router with Server Components as default
- React Server Actions for mutations
- Supabase client for database queries
- Proper TypeScript typing throughout
- TRUST 5 quality gates (Tested, Readable, Unified, Secured, Trackable)

## Assumptions

### Assumption Analysis

| Assumption | Confidence | Evidence Basis | Risk if Wrong | Validation Method |
|------------|------------|----------------|---------------|-------------------|
| Source Rhymix code is fully accessible at C:\GitHub\rhymix | High | User provided source location | Incomplete feature mapping | Verify directory access and module structure |
| User has valid Supabase project credentials | Medium | Standard modern stack requirement | Authentication setup failure | Request confirmation before Phase 2 |
| Target deployment is Vercel | High | Industry standard for Next.js | CI/CD configuration mismatch | Confirm deployment preferences |
| GPL v2 license is acceptable for target project | Medium | Source uses GPL v2 | License compliance issues | Confirm license requirements |
| Existing data migration is required | High | CMS conversion typically needs data | Data schema mapping complexity | Confirm migration scope |

### Root Cause Analysis (Five Whys)

**Surface Problem:** Need to convert Rhymix PHP CMS to React/Next.js

1. **First Why:** PHP architecture is outdated and difficult to maintain
2. **Second Why:** Modern development ecosystem has moved to JavaScript/TypeScript
3. **Third Why:** Need better developer experience, performance, and deployment options
4. **Fourth Why:** Business requires faster iteration and modern feature capabilities
5. **Root Cause:** Legacy PHP stack no longer aligns with technical and business goals

### Constraints

**Technical Constraints:**
- Must use Next.js 16 App Router (not Pages Router)
- Must use TypeScript 5.9+ with strict mode
- Must use Supabase for database and authentication
- Must preserve Rhymix core functionality (board, member, document, comment)
- Must maintain data integrity during migration

**Business Constraints:**
- GPL v2 license compliance required
- Existing user base must be supported during transition
- Feature parity with core Rhymix modules required
- Mobile responsiveness must be maintained or improved

**Performance Constraints:**
- Target P50 page load time: < 1s
- Target P95 page load time: < 2s
- Target Time to Interactive (TTI): < 3s
- Support for 10,000+ concurrent users

**Security Constraints:**
- OWASP Top 10 compliance
- Row-Level Security (RLS) for multi-tenancy
- Input validation on all forms
- CSRF protection for all mutations

## Requirements

### EARS Format Requirements

#### Phase 1: Foundation Setup Requirements

**REQ-F-001 (Ubiquitous):** The system shall use Next.js 16 with App Router for all routing.

**REQ-F-002 (Ubiquitous):** The system shall use TypeScript 5.9+ in strict mode for all source files.

**REQ-F-003 (Ubiquitous):** The system shall use Tailwind CSS with shadcn/ui component library for styling.

**REQ-F-004 (Event-Driven):** WHEN the application initializes, THEN the system shall establish Supabase client connection with environment variables.

**REQ-F-005 (Ubiquitous):** The system shall use ESLint and Prettier for code quality enforcement.

**REQ-F-006 (State-Driven):** IF environment variables are missing, THEN the system shall prevent application startup and display clear error messages.

#### Phase 2: Core Architecture Requirements

**REQ-A-001 (Ubiquitous):** The system shall use Supabase PostgreSQL 16 as the primary database.

**REQ-A-002 (Ubiquitous):** The system shall implement Row-Level Security (RLS) policies for all multi-tenant data.

**REQ-A-003 (Event-Driven):** WHEN a user signs in, THEN the system shall establish authenticated Supabase session.

**REQ-A-004 (Event-Driven):** WHEN authentication state changes, THEN the system shall update UI components reactively.

**REQ-A-005 (State-Driven):** IF a user attempts to access protected resources, THEN the system shall verify authentication and authorization before granting access.

**REQ-A-006 (Ubiquitous):** The system shall use Server Actions for all data mutations.

**REQ-A-007 (Event-Driven):** WHEN a file is uploaded, THEN the system shall store files in Supabase Storage with proper access controls.

#### Phase 3: Board Module Requirements

**REQ-B-001 (Event-Driven):** WHEN a user creates a new board post, THEN the system shall store the post in Supabase with author, timestamp, and category.

**REQ-B-002 (Event-Driven):** WHEN a user views a board list, THEN the system shall display posts with pagination, categories, and search functionality.

**REQ-B-003 (State-Driven):** IF a board is configured to require authentication, THEN the system shall redirect unauthenticated users to login page.

**REQ-B-004 (Event-Driven):** WHEN a user edits their own post, THEN the system shall verify ownership and update the post.

**REQ-B-005 (Unwanted):** The system shall not allow users to edit or delete posts they do not own.

**REQ-B-006 (Event-Driven):** WHEN an admin deletes a post, THEN the system shall soft delete the post (move to trash) rather than permanent deletion.

**REQ-B-007 (Event-Driven):** WHEN a user searches for posts, THEN the system shall use Supabase full-text search with relevance ranking.

**REQ-B-008 (Optional):** WHERE the board supports anonymous posting, the system shall allow non-authenticated users to create posts with captcha verification.

#### Phase 4: Member Module Requirements

**REQ-M-001 (Event-Driven):** WHEN a new user registers, THEN the system shall validate email format, check for duplicates, and create user record in Supabase Auth.

**REQ-M-002 (Event-Driven):** WHEN a user logs in, THEN the system shall authenticate via Supabase Auth and establish session.

**REQ-M-003 (Event-Driven):** WHEN a user updates their profile, THEN the system shall validate permissions and update profile data.

**REQ-M-004 (State-Driven):** IF email verification is required, THEN the system shall send verification email and restrict access until verified.

**REQ-M-005 (Event-Driven):** WHEN a user requests password reset, THEN the system shall send reset link via email.

**REQ-M-006 (Event-Driven):** WHEN an admin changes user permissions, THEN the system shall update user role and apply to all authorization checks.

**REQ-M-007 (Unwanted):** The system shall not store plaintext passwords or password hashes client-side.

#### Phase 5: Document Module Requirements

**REQ-D-001 (Event-Driven):** WHEN a user creates a document, THEN the system shall store content with version history.

**REQ-D-002 (Event-Driven):** WHEN a user views document history, THEN the system shall display version timeline with diff capability.

**REQ-D-003 (Event-Driven):** WHEN a document is published, THEN the system shall set published timestamp and make visible to authorized users.

**REQ-D-004 (State-Driven):** IF a document is draft, THEN the system shall only display to author and admins.

**REQ-D-005 (Event-Driven):** WHEN a document is deleted, THEN the system shall move to trash for potential recovery.

#### Phase 6: Comment Module Requirements

**REQ-C-001 (Event-Driven):** WHEN a user posts a comment, THEN the system shall store comment with parent post reference and timestamp.

**REQ-C-002 (Event-Driven):** WHEN a user replies to a comment, THEN the system shall store reply as nested comment with parent reference.

**REQ-C-003 (Event-Driven):** WHEN a comment is posted, THEN the system shall notify document/post author via Supabase Realtime.

**REQ-C-004 (Unwanted):** The system shall not allow comment posting on archived or locked posts.

**REQ-C-005 (Optional):** WHERE comment threading is enabled, THEN the system shall display nested replies up to configurable depth.

#### Phase 7: Menu Module Requirements

**REQ-N-001 (Ubiquitous):** The system shall support hierarchical menu structure with unlimited depth.

**REQ-N-002 (Event-Driven):** WHEN an admin creates menu item, THEN the system shall store menu structure in Supabase.

**REQ-N-003 (Event-Driven):** WHEN a user navigates, THEN the system shall highlight active menu item and expand parent menus.

**REQ-N-004 (State-Driven):** IF a menu item is restricted to specific roles, THEN the system shall hide menu from unauthorized users.

#### Phase 8: Multi-language Requirements

**REQ-L-001 (Event-Driven):** WHEN a user selects language, THEN the system shall load translations from Supabase.

**REQ-L-002 (Ubiquitous):** The system shall support English, Korean, Japanese, and Chinese by default.

**REQ-L-003 (Event-Driven):** WHEN a translation is missing, THEN the system shall fallback to English with translation indicator.

**REQ-L-004 (Optional):** WHERE admin interface is available, THEN the system shall provide translation management UI.

#### Phase 9: Search Requirements

**REQ-S-001 (Event-Driven):** WHEN a user performs search, THEN the system shall query Supabase full-text search across documents, comments, and posts.

**REQ-S-002 (Event-Driven):** WHEN search results are displayed, THEN the system shall show relevance score and highlighted excerpts.

**REQ-S-003 (State-Driven):** IF search query is empty, THEN the system shall not execute search and display search form.

#### Phase 10: Admin Panel Requirements

**REQ-ADM-001 (Event-Driven):** WHEN an admin accesses admin panel, THEN the system shall verify admin role and display admin dashboard.

**REQ-ADM-002 (Event-Driven):** WHEN an admin configures site settings, THEN the system shall update settings in Supabase and apply immediately.

**REQ-ADM-003 (Event-Driven):** WHEN an admin manages users, THEN the system shall display user list with search, filter, and bulk operations.

**REQ-ADM-004 (Unwanted):** The system shall not allow non-admin users to access admin panel routes.

#### Phase 11: Data Migration Requirements

**REQ-MIG-001 (Event-Driven):** WHEN migration is executed, THEN the system shall convert MySQL schema to Supabase PostgreSQL schema.

**REQ-MIG-002 (Event-Driven):** WHEN user data is migrated, THEN the system shall preserve passwords using secure hash verification.

**REQ-MIG-003 (Event-Driven):** WHEN content is migrated, THEN the system shall preserve all relationships, categories, and metadata.

**REQ-MIG-004 (State-Driven):** IF migration fails, THEN the system shall rollback changes and provide detailed error logs.

#### Phase 12: Deployment Requirements

**REQ-DEP-001 (Event-Driven):** WHEN code is deployed to Vercel, THEN the system shall automatically detect Next.js configuration and build for production.

**REQ-DEP-002 (Ubiquitous):** The system shall use environment variables for all configuration (Supabase URL, keys, app URL).

**REQ-DEP-003 (Event-Driven):** WHEN pull request is created, THEN CI/CD pipeline shall run tests, linter, and type checking.

**REQ-DEP-004 (Unwanted):** The system shall not commit sensitive credentials to version control.

## Specifications

### Technical Specifications

#### Database Schema (Supabase/PostgreSQL 16)

**Users Table (extends Supabase Auth):**
```sql
-- Public profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**Boards Table:**
```sql
CREATE TABLE public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);
```

**Posts Table:**
```sql
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'trash')),
  category_id UUID REFERENCES public.categories(id),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Full-text search
CREATE INDEX posts_search_idx ON public.posts USING gin(to_tsvector('english', title || ' ' || content));

-- RLS Policies
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts FOR SELECT USING (status = 'published');

CREATE POLICY "Authors can view own posts"
  ON public.posts FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can create posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins can do anything"
  ON public.posts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**Comments Table:**
```sql
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'trash')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies similar to posts
```

**Categories Table:**
```sql
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  UNIQUE(board_id, slug)
);
```

**Menus Table:**
```sql
CREATE TABLE public.menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL, -- 'header', 'footer', 'sidebar'
  items JSONB DEFAULT '[]', -- Nested menu structure
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Documents Table:**
```sql
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'trash')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Document versions
CREATE TABLE public.document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);
```

**Translations Table:**
```sql
CREATE TABLE public.translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lang_code TEXT NOT NULL, -- 'en', 'ko', 'ja', 'zh'
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(lang_code, key)
);
```

#### File Structure

```
rhymix-ts/
├── app/                          # Next.js 16 App Router
│   ├── (auth)/                  # Auth route group
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── (main)/                  # Main app route group
│   │   ├── board/
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx     # Board list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Post detail
│   │   │   └── page.tsx         # Board index
│   │   ├── admin/               # Admin panel
│   │   │   └── layout.tsx       # Admin layout with auth check
│   │   ├── page.tsx             # Home
│   │   └── layout.tsx           # Root layout
│   ├── api/                     # API routes (if needed)
│   └── globals.css
├── components/                  # React components
│   ├── ui/                      # shadcn/ui components
│   ├── board/                   # Board components
│   ├── member/                  # Member components
│   └── layout/                  # Layout components
├── lib/                         # Utilities
│   ├── supabase/                # Supabase client
│   │   ├── client.ts            # Client-side Supabase
│   │   ├── server.ts            # Server-side Supabase
│   │   └── admin.ts             # Admin client with service role
│   ├── utils.ts                 # Utility functions
│   └── validations.ts           # Zod schemas
├── actions/                     # Server Actions
│   ├── board.ts                 # Board mutations
│   ├── member.ts                # Member mutations
│   └── post.ts                  # Post mutations
├── types/                       # TypeScript types
│   ├── board.ts
│   ├── member.ts
│   └── index.ts
├── hooks/                       # Custom React hooks
│   ├── use-auth.ts
│   ├── use-board.ts
│   └── use-pagination.ts
├── middleware.ts                # Next.js middleware (auth)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

#### API Endpoints (Server Actions)

**Board Actions:**
```typescript
// actions/board.ts
'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { auth } from '@/lib/supabase/auth'

export async function createPost(data: CreatePostInput) {
  const user = await auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      board_id: data.boardId,
      title: data.title,
      content: data.content,
      author_id: user.id,
      status: 'published',
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/board/${data.boardSlug}`)
  return data
}

export async function updatePost(postId: string, data: UpdatePostInput) {
  const user = await auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify ownership
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single()

  if (!post || post.author_id !== user.id) {
    throw new Error('Forbidden')
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update({
      title: data.title,
      content: data.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/board/${data.boardSlug}/${postId}`)
  return data
}
```

**Member Actions:**
```typescript
// actions/member.ts
'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { auth } from '@/lib/supabase/auth'

export async function updateProfile(data: UpdateProfileInput) {
  const user = await auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      display_name: data.displayName,
      avatar_url: data.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/profile')
  return data
}
```

#### Component Architecture

**Board List Component (Server Component):**
```typescript
// components/board/board-list.tsx
import { supabaseServer } from '@/lib/supabase/server'
import { PostCard } from './post-card'

interface BoardListProps {
  boardSlug: string
  page: number
  category?: string
}

export async function BoardList({ boardSlug, page, category }: BoardListProps) {
  const supabase = supabaseServer()

  let query = supabase
    .from('posts')
    .select('*, author:profiles(*), category:categories(*)')
    .eq('board.slug', boardSlug)
    .eq('status', 'published')

  if (category) {
    query = query.eq('category.slug', category)
  }

  const { data: posts } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1)

  if (!posts || posts.length === 0) {
    return <div>No posts found</div>
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

**Post Detail Component (Server Component):**
```typescript
// components/board/post-detail.tsx
import { supabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CommentList } from '@/components/comment/comment-list'

interface PostDetailProps {
  boardSlug: string
  postId: string
}

export async function PostDetail({ boardSlug, postId }: PostDetailProps) {
  const supabase = supabaseServer()

  const { data: post } = await supabase
    .from('posts')
    .select('*, author:profiles(*), board:boards(*), category:categories(*)')
    .eq('id', postId)
    .eq('board.slug', boardSlug)
    .single()

  if (!post) {
    notFound()
  }

  // Increment view count
  await supabase.rpc('increment_view_count', { post_id: postId })

  return (
    <article className="prose max-w-none">
      <h1>{post.title}</h1>
      <div className="metadata">
        By {post.author.display_name} on {new Date(post.created_at).toLocaleString()}
      </div>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <CommentList postId={postId} />
    </article>
  )
}
```

#### Authentication Flow

**Middleware:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
        },
        remove(name: string, options: any) {
          request.cookies.delete(name)
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!data.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/board/:path*/post/:path*/edit'],
}
```

#### Realtime Features

**Realtime Comments:**
```typescript
// components/comment/comment-list.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface CommentListProps {
  postId: string
}

export function CommentList({ postId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    // Load initial comments
    loadComments()

    // Subscribe to new comments
    const channel: RealtimeChannel = supabaseBrowser
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as Comment])
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [postId])

  async function loadComments() {
    const { data } = await supabaseBrowser
      .from('comments')
      .select('*, author:profiles(*)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (data) setComments(data)
  }

  return (
    <div className="comments">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}
```

### Traceability

- **Source Analysis:** C:\GitHub\rhymix\modules, C:\GitHub\rhymix\classes
- **Tech Stack:** React 19, Next.js 16, TypeScript 5.9+, Supabase PostgreSQL 16
- **Documentation:** Rhymix README.md, module documentation
- **Related Skills:** moai-lang-typescript, moai-platform-database-cloud
- **Implementation Agent:** manager-ddd for DDD implementation cycle
