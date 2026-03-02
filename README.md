# Rhymix TS - Modern CMS

A modern React/Next.js conversion of the Rhymix PHP CMS.

## Project Overview

This project converts the Rhymix PHP CMS (a fork of XpressEngine) to a modern full-stack TypeScript application using React 19, Next.js 16, and Supabase.

### Tech Stack

- **Frontend**: React 19, Next.js 16 (App Router)
- **Language**: TypeScript 5.9+
- **Database**: Supabase (PostgreSQL 16)
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: Vercel
- **Testing**: Vitest + Playwright

## Project Structure

```
rhymix-ts/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication routes (login, signup, reset-password)
│   ├── (main)/                   # Main application routes
│   │   ├── board/               # Board module pages
│   │   ├── documents/           # Document module pages
│   │   ├── member/              # Member profile pages
│   │   ├── search/              # Search functionality
│   │   └── home/                # Home page
│   ├── (admin)/                 # Admin panel routes
│   │   ├── admin/               # Admin dashboard and management
│   │   │   ├── boards/          # Board management
│   │   │   ├── members/         # Member management
│   │   │   ├── media/           # Media library
│   │   │   ├── pages/           # Page management
│   │   │   ├── menus/           # Menu management
│   │   │   ├── groups/          # Group management
│   │   │   ├── permissions/     # Permission management
│   │   │   ├── modules/         # Module management
│   │   │   ├── translations/    # Translation management
│   │   │   ├── themes/          # Theme management
│   │   │   ├── widgets/         # Widget management
│   │   │   ├── points/          # Point management
│   │   │   ├── documents/       # Document management
│   │   │   ├── comments/        # Comment management
│   │   │   ├── editor/          # Editor configuration
│   │   │   ├── spam-filter/     # Spam filter settings
│   │   │   ├── trash/           # Trash management
│   │   │   ├── notifications/   # Mail/SMS/Push notifications
│   │   │   ├── notification-center/  # Notification center settings
│   │   │   ├── admin-setup/     # Admin configuration
│   │   │   ├── filebox/         # Filebox management
│   │   │   ├── easy-install/    # Easy installation module
│   │   │   ├── installed-layouts/   # Layout management
│   │   │   └── settings/        # Site settings
│   │   └── analytics/           # Analytics dashboard
│   ├── [locale]/                # Localized routes (i18n)
│   └── install/                 # Installation wizard
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── board/                   # Board module components
│   ├── comment/                 # Comment components
│   ├── document/                # Document components
│   ├── member/                  # Member components
│   ├── admin/                   # Admin panel components
│   ├── editor/                  # Rich text editor
│   ├── menu/                    # Menu components
│   ├── widgets/                 # Widget system
│   ├── polls/                   # Poll components
│   ├── captcha/                 # CAPTCHA components
│   ├── notifications/           # Notification components
│   ├── layouts/                 # Layout components
│   ├── layout/                  # Main layout components
│   ├── install/                 # Installation components
│   └── providers/               # React context providers
├── lib/                         # Utility functions and libraries
│   ├── supabase/                # Supabase client setup
│   ├── captcha/                 # CAPTCHA library
│   ├── realtime/                # Realtime subscription utilities
│   └── i18n/                    # Internationalization
├── hooks/                       # Custom React hooks
│   ├── useNotifications.ts      # Notification hook
│   └── useRealtime.ts           # Realtime hook
├── actions/                     # Server Actions
│   ├── auth.ts                  # Authentication actions
│   ├── board.ts                 # Board actions
│   ├── media.ts                 # Media upload/management
│   ├── search.ts                # Search functionality
│   ├── captcha.ts               # CAPTCHA verification
│   ├── groups.ts                # Group management
│   ├── permissions.ts           # Permission management
│   ├── pages.ts                 # Page management
│   ├── modules.ts               # Module management
│   ├── translations.ts          # Translation management
│   ├── seed.ts                  # Initial data seeding
│   ├── view-count.ts            # View counter
│   └── index.ts                 # Action exports
├── types/                       # TypeScript types
├── supabase/                    # Supabase configuration
│   └── migrations/              # Database migrations
├── tests/                       # Test files
│   ├── e2e/                     # E2E tests with Playwright
│   └── __tests__/               # Unit tests
└── .moai/                       # MoAI-ADK configuration
    ├── specs/                   # Specifications
    ├── docs/                    # Documentation
    └── config/                  # Configuration files
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Supabase project

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/rhymix-ts.git
cd rhymix-ts

# Install dependencies
pnpm install

# Copy environment variables
cp .env.local.example .env.local

# Set up Supabase
# 1. Create a Supabase project at https://supabase.com
# 2. Run the migration file: supabase/migrations/001_initial_schema.sql
# 3. Add your Supabase credentials to .env.local

# Run development server
pnpm dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Development

```bash
# Development server
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# Build for production
pnpm build
```

## Modules

### Board Module
- Forum/board system
- Categories and tags
- Full-text search
- Pagination
- Post management

### Member Module
- User authentication
- Profile management
- Permission system
- Role-based access control

### Document Module
- Document content management
- Version history
- Draft support
- Multi-language support

### Comment Module
- Nested comments
- Threading support
- Real-time updates

## Admin Menu System

The admin panel features a comprehensive 7-category menu system (SPEC-ADMIN-MENU-001):

### Menu Categories

1. **Dashboard** (`/admin`) - Main dashboard overview
2. **Site** (`/admin/menus`) - Site structure management
   - Menus, Widgets, Layouts, Themes
3. **Members** (`/admin/members`) - User management
   - All Members, Groups, Permissions, Points
4. **Content** (`/admin/boards`) - Content management
   - Boards, Pages, Documents, Comments, Media Library, Polls, Editor, Spam Filter, Trash
5. **Notifications** (`/admin/notifications`) - Communication management
   - Mail/SMS/Push, Notification Center
6. **Configuration** (`/admin/settings`) - System configuration
   - General, Admin Setup, Filebox, Translations, Modules, Analytics
7. **Advanced** (`/admin/easy-install`) - Advanced tools
   - Easy Install, Installed Layouts
8. **Logs** (`/admin/logs`) - System logs

### Features

- **Multi-language Support**: All menu items include Korean and English labels
- **Permission-based Access**: Each menu item requires specific permissions
- **Mobile Responsive**: Collapsible sidebar with overlay
- **Locale-aware Routing**: Automatic locale prefix handling

## Initial Setup System

The project includes an automated initial data seeding system (SPEC-SETUP-001):

### Default Data Seeded

**Boards (3)**:
- Free Board (자유게시판) - General discussion
- Q&A (질문답변) - Question and answer
- Notice (공지사항) - Site announcements

**Menus (3)**:
- GNB (Global Navigation Bar) - Main site navigation
- UNB (Utility Navigation Bar) - External links
- FNB (Footer Navigation Bar) - Footer links

**Pages (3)**:
- Welcome page - Site homepage
- Terms of Service - Legal terms
- Privacy Policy - Privacy policy

**Layouts (2)**:
- PC Layout - Desktop layout
- Mobile Layout - Mobile layout

**Widgets (4)**:
- Recent Comments - Latest comments widget
- Latest Documents - Recent posts widget
- Member Statistics - Member stats widget
- Document Statistics - Document stats widget

**Site Configuration (17 keys)**:
- Theme settings (logo, favicon, default theme)
- SEO settings (keywords, Google Analytics)
- Authentication settings (registration, email verification, social login)
- Email settings (SMTP)
- Feature settings (file upload, max file size)
- Module settings (board skin, editor skin)

### Seeding Features

- **Idempotent**: Safe to run multiple times
- **Transaction Integrity**: All-or-nothing execution
- **Status Checking**: Verify seeding completion
- **Verification Functions**: Built-in verification tools

### Server Actions

```typescript
// Check seeding status
await checkSeedingStatus()

// Execute seeding
await seedDefaultData()

// Verify seeding
await verifySeeding()
```

## Deployment

This project is configured for Vercel deployment:

```bash
# Deploy to Vercel
vercel deploy
```

## License

This project is a conversion of Rhymix (GPL v2). The original Rhymix is available at https://github.com/rhymix/rhymix

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## SPEC-RHYMIX-002: Advanced Settings System (Completed)

SPEC-RHYMIX-002는 ASIS Rhymix PHP CMS와 TOBE Next.js 시스템 간의 기능 격차를 분석하고 누락된 고급 설정 기능을 구현합니다. 모든 4개 스프린트와 4개 Phase가 완료되었습니다.

### Implementation Summary

**Total Stats:**
- 62 files created
- 18,945 lines of code added
- 8 Use Cases implemented (UC-001 ~ UC-008)
- 30+ WHW requirements fulfilled
- 110+ test cases (all passing)
- 9 new database tables
- Zero TypeScript errors in all SPEC-RHYMIX-002 files

### Sprint 1: Member Settings (UC-001, UC-002)

**WHW-001 ~ WHW-005: 회원 관리 고급 설정**
- 회원 가입 설정 (가입 허용, URL 키, 이메일 인증)
- 회원 필드 설정 (홈페이지, 블로그, 생년월일 등)
- 닉네임 설정 (변경 허용, 특수문자, 중복 등)
- 비밀번호 보안 설정 (강도, 해싱 알고리즘, 워크 팩터)
- 비밀번호 재설정 방식 (링크/임시 비밀번호)

**WHW-010 ~ WHW-011: 회원 추가/편집 폼**
- 회원 추가 폼 (모든 필수/선택 필드)
- 회원 편집 폼 (상태, 제한, 거부 사유 등)

**Database Tables:**
- `member_settings` - 회원 시스템 설정 (가입, 닉네임, 비밀번호 등)
- `profiles` 확장 - 포인트, 레벨 컬럼 추가

**Admin Pages:**
- `/admin/settings/member` - 회원 설정 페이지 (507 lines)

**Test Coverage:**
- `__tests__/actions/admin/member-settings.test.ts` - 429 lines, 13 tests

### Sprint 2: Board & Editor Settings (UC-003, UC-004)

**WHW-020 ~ WHW-023: 게시판 고급 설정**
- 게시판 기본 설정 (모듈 분류, 레이아웃, 스킨, 모바일 뷰)
- 게시판 콘텐츠 설정 (히스토리, 추천/비추천, 신고)
- 댓글 설정 (페이지당 댓글 수, 대댓글 깊이, 검증)
- 게시판 권한 설정 (9종 권한: 목록, 열람, 작성 등)

**WHW-030 ~ WHW-032: 에디터 설정**
- 에디터 기본 설정 (스킨, 컬러셋, 높이, 툴바)
- 폰트 설정 (20+ 폰트, 크기, 줄 간격, 문단 간격)
- 자동 저장 및 기능 (자동 저장, 다크 모드, HTML 허용, 미디어 삽입)

**Database Tables:**
- `boards` 확장 - 20+ 컬럼 추가 (콘텐츠, 댓글, 권한 설정 등)
- `editor_settings` - 에디터 설정 (스킨, 폰트, 자동 저장 등)

**Admin Pages:**
- `/admin/settings/editor` - 에디터 설정 페이지 (412 lines)

**Test Coverage:**
- `__tests__/actions/admin/board-settings.test.ts` - 474 lines, 14 tests
- `__tests__/actions/admin/editor-settings.test.ts` - 421 lines, 12 tests

### Sprint 3: Points System & Security Settings (UC-005, UC-006)

**WHW-040 ~ WHW-043: 포인트 시스템**
- 포인트 기본 설정 (모듈 활성화, 이름, 최고 레벨, 아이콘)
- 포인트 제한 (다운로드/열람 금지)
- 포인트 부여 규칙 (11종 규칙: 가입, 로그인, 글 작성 등)
- 레벨-그룹 연동 (연동 방식, 포인트 감소 처리, 레벨별 그룹)

**WHW-050 ~ WHW-052: 보안 설정**
- 미디어 필터 (허용 도메인, HTML class)
- 관리자 접근 제어 (허용/금지 IP, 로봇 user-agent)
- 세션 보안 (자동 로그인, SSL, CSRF, 쿠키 속성 등)

**Database Tables:**
- `point_settings` - 포인트 기본 설정
- `point_rules` - 포인트 부여 규칙 (11개 기본 규칙)
- `level_group_mapping` - 레벨별 그룹 연동 (1-30 레벨)
- `security_settings` - 보안 설정 (미디어 필터, 접근 제어, 세션)

**Admin Pages:**
- `/admin/settings/point` - 포인트 기본 설정 (332 lines)
- `/admin/points/rules` - 포인트 규칙 관리 (353 lines)
- `/admin/points/level-groups` - 레벨-그룹 연동 (376 lines)
- `/admin/settings/security` - 보안 설정 (461 lines)

**Test Coverage:**
- `__tests__/actions/admin/point-settings.test.ts` - 286 lines, 9 tests
- `__tests__/actions/admin/point-rules.test.ts` - 496 lines, 15 tests
- `__tests__/actions/admin/level-group-mapping.test.ts` - 457 lines, 14 tests
- `__tests__/actions/admin/security-settings.test.ts` - 349 lines, 11 tests

### Sprint 4: Notification System & Delivery Management (UC-007, UC-008)

**WHW-060 ~ WHW-062: 알림 시스템**
- 알림 유형 설정 (8가지: 댓글, 대댓글, 멘션, 추천, 스크랩, 쪽지, 관리자, 커스텀)
- 알림 채널 (4개: 웹, 메일, SMS, 푸시)
- 알림 표시 설정 (표시 여부, 항상 표시, 사용자 설정 허용 등)

**WHW-070 ~ WHW-071: 통합 메일/SMS/푸시 관리**
- 발송 설정 (SMTP, SMS API, 푸시 알림)
- 발송 내역 로그 (메일/SMS/푸시 발송 및 오류 내역)

**Database Tables:**
- `notification_settings` - 알림 유형/채널/표시 설정
- `notification_delivery_settings` - 발송 방법 설정 (SMTP, SMS, 푸시)
- `notification_logs` - 발송 내역 로그 (90일 보관)
- `user_notification_settings` - 사용자별 알림 선호도

**Views & Functions:**
- `notification_daily_stats` - 일별 발송 통계 (materialized view)
- `get_user_notification_stats()` - 사용자 통계 함수

**Admin Pages:**
- `/admin/settings/notification` - 알림 유형별 채널 설정 (125 lines)
- `/admin/notification/delivery` - SMTP, SMS, 푸시 설정 (89 lines)
- `/admin/notification/logs` - 발송 내역 조회

**Test Coverage:**
- `__tests__/actions/admin/notification-settings.test.ts` - 366 lines, 9 tests
- `__tests__/actions/admin/notification-delivery.test.ts` - 368 lines, 9 tests
- `__tests__/actions/admin/notification-logs.test.ts` - 354 lines, 8 tests

### Phase 3: Quality Improvements (Completed)

**Tasks Completed:**
- ✅ Sprint 4 server actions created (854 lines)
  - `app/actions/admin/notification-settings.ts` (242 lines)
  - `app/actions/admin/notification-delivery.ts` (253 lines)
  - `app/actions/admin/notification-logs.ts` (359 lines)
- ✅ All Sprint 4 test files fixed
- ✅ All Sprint 3 test files fixed
  - `__tests__/actions/admin/point-rules.test.ts` (7 fixes)
  - `__tests__/actions/admin/point-settings.test.ts` (3 fixes)
  - `__tests__/actions/admin/security-settings.test.ts` (4 fixes)
- ✅ Zero TypeScript errors in SPEC-RHYMIX-002 files

**Quality Metrics:**
- TRUST 5 framework compliance
- All server actions include Korean error messages
- Comprehensive Zod validation schemas
- RLS policies for database security
- Audit logging for sensitive operations

### Phase 4: Feature Expansion - SPEC-ADMIN-MENU-001 (Completed)

**Implementation:**
- ✅ Admin menu type definitions (`types/admin-menu.ts` - 68 lines)
- ✅ Context Provider (`providers/AdminMenuProvider.tsx` - 352 lines)
- ✅ Custom hook (`hooks/use-admin-menu.ts` - 22 lines)
- ✅ Updated `components/admin/AdminSidebar.tsx` with Korean titles and permission filtering
- ✅ Updated `app/(admin)/layout.tsx` with AdminMenuProvider wrapper

**Features:**
- 8 menu categories: Dashboard, Site, Members, Content, Notifications, Configuration, Advanced, Logs
- 30+ menu items matching ASIS Rhymix structure
- Multi-language support (Korean/English) for all menu items
- Permission-based access control for each menu item
- Mobile-responsive collapsible sidebar
- Locale-aware navigation with automatic prefix handling
- Auto-expansion of active menu group
- User permission fetching from Supabase

**Technical Details:**
- React Context API for state management
- Permission filtering based on user role
- Active path detection and highlighting
- Menu group expansion state management
- Type-safe navigation with TypeScript

### Key Features

**Database Schema:**
- 9 new tables with comprehensive RLS policies
- JSONB columns for flexible configuration storage
- Materialized views for statistics
- 90-day automatic retention policy for logs
- Indexes optimized for dashboard queries

**Validation & Security:**
- Zod schemas for all settings (80+ validation functions)
- Admin permission checks on all server actions
- Security-sensitive settings logged with warning severity
- Enum validation for all constraint columns

**UI/UX:**
- Auto-save with 500ms debounce
- Real-time validation feedback
- Consistent shadcn/ui components
- Mobile-responsive design
- Korean/English bilingual support

**Testing:**
- 110+ test cases covering all functionality
- All tests passing with comprehensive coverage
- Admin permission validation
- Input validation testing
- Audit logging verification

## Roadmap

- [x] Phase 1: Project Setup
- [x] Phase 2: Database Schema
- [x] Phase 3: Authentication
- [x] Phase 4: Core Modules (SPEC-RHYMIX-001)
- [x] Phase 5: Advanced Settings (SPEC-RHYMIX-002)
- [ ] Phase 6: Deployment

## Team

- **Lead**: MoAI Orchestrator
- **Backend**: team-backend-dev
- **Frontend**: team-frontend-dev
- **Architecture**: team-architect
- **Testing**: team-tester
#   r h y m i x - t s  
 