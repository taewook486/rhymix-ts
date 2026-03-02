# Changelog

All notable changes to the Rhymix-TS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-02

### Added - SPEC-RHYMIX-002: Advanced Settings System

SPEC-RHYMIX-002는 ASIS Rhymix PHP CMS의 누락된 고급 설정 기능을 모두 구현했습니다. 4개 스프린트, 8개 Use Case, 30+ WHW 요구사항이 완료되었습니다.

#### Sprint 1: Member Settings (UC-001, UC-002)

**Database Migrations:**
- `020_member_settings.sql` - 회원 설정 테이블 생성 (182 lines)
- `026_profiles_point_level.sql` - profiles 테이블 확장 (포인트, 레벨 컬럼)

**Server Actions:**
- `app/actions/admin/member-settings.ts` - 회원 설정 관리 (215 lines)

**Admin Pages:**
- `/admin/settings/member` - 회원 설정 페이지 (507 lines)

**Type Definitions:**
- 회원 가입 설정 (가입 허용, URL 키, 이메일 인증)
- 회원 필드 설정 (홈페이지, 블로그, 생년월일 등)
- 닉네임 설정 (변경 허용, 특수문자, 중복 등)
- 비밀번호 보안 설정 (강도, 해싱 알고리즘, 워크 팩터)
- 비밀번호 재설정 방식 (링크/임시 비밀번호)

**Validation Schemas:**
- `lib/validations/member-settings.ts` - 회원 설정 Zod 스키마 (53 lines)

**Tests:**
- `__tests__/actions/admin/member-settings.test.ts` - 13 tests (429 lines)

**Features (WHW-001 ~ WHW-011):**
- 회원 가입 설정 (가입 허용 여부, URL 키, 이메일 인증 필수, 만료 시간)
- 회원 필드 설정 (홈페이지 URL, 블로그 URL, 생년월일, 메일링 수신, 쪽지 수신)
- 닉네임 설정 (변경 허용, 변경 이력 기록, 특수문자 허용, 띄어쓰기 허용, 중복 허용)
- 비밀번호 보안 설정 (강도: 낮음/보통/높음, 해싱 알고리즘, 워크 팩터, 자동 업그레이드, 세션 무효화)
- 비밀번호 재설정 방식 (재설정 링크/임시 비밀번호)
- 회원 추가 폼 (모든 필수/선택 필드 포함)
- 회원 편집 폼 (상태, 제한, 거부 사유 등)

#### Sprint 2: Board & Editor Settings (UC-003, UC-004)

**Database Migrations:**
- `021_editor_settings.sql` - 에디터 설정 테이블 생성 (120 lines)

**Server Actions:**
- `app/actions/admin/board-settings.ts` - 게시판 설정 관리 (385 lines)
- `app/actions/admin/editor-settings.ts` - 에디터 설정 관리 (219 lines)

**Admin Pages:**
- `/admin/settings/editor` - 에디터 설정 페이지 (412 lines)

**Type Definitions:**
- `types/editor.ts` - 에디터 설정 타입 (245 lines)
- `types/board.ts` - 게시판 설정 타입 확장 (30 lines)

**Validation Schemas:**
- `lib/validations/editor-settings.ts` - 에디터 설정 Zod 스키마 (151 lines)
- `lib/validations/board-config.ts` - 게시판 설정 Zod 스키마 (223 lines)

**Tests:**
- `__tests__/actions/admin/board-settings.test.ts` - 14 tests (474 lines)
- `__tests__/actions/admin/editor-settings.test.ts` - 12 tests (421 lines)

**Features (WHW-020 ~ WHW-023, WHW-030 ~ WHW-032):**
- 게시판 기본 설정 (모듈 분류, 레이아웃, 스킨, 모바일 뷰, 모바일 레이아웃/스킨, 설명, 상단/하단 내용)
- 게시판 콘텐츠 설정 (히스토리 추적, 추천/비추천 기능, 동일 IP 추천 허용, 추천 취소, 비회원 추천, 신고 기능)
- 댓글 설정 (페이지당 댓글 수, 댓글 페이지 수, 대댓글 최대 깊이, 기본 페이지, 댓글 검증)
- 게시판 권한 설정 (9종 권한: 목록 보기, 글 열람, 글 작성, 댓글 작성, 추천인 보기, 수정 내역 보기, 상담글 열람, 접근 권한, 관리 권한)
- 에디터 기본 설정 (스킨: CKEditor/SimpleEditor/Textarea, 컬러셋, 높이, 툴바, 툴바 숨김)
- 폰트 설정 (본문 폰트: 20+ 옵션, 폰트 크기, 줄 간격, 문단 간격, 줄바꿈 방식)
- 자동 저장 및 기능 (자동 저장, 자동 다크 모드, HTML 허용, 미디어 자동 삽입, 삽입 위치)

#### Sprint 3: Points System & Security Settings (UC-005, UC-006)

**Database Migrations:**
- `022_point_settings.sql` - 포인트 설정 테이블 생성 (84 lines)
- `023_point_rules.sql` - 포인트 규칙 테이블 생성 (122 lines)
- `024_level_group_mapping.sql` - 레벨-그룹 연동 테이블 생성 (93 lines)
- `025_security_settings.sql` - 보안 설정 테이블 생성 (126 lines)

**Server Actions:**
- `app/actions/admin/point-settings.ts` - 포인트 설정 관리 (186 lines)
- `app/actions/admin/point-rules.ts` - 포인트 규칙 관리 (332 lines)
- `app/actions/admin/level-group-mapping.ts` - 레벨-그룹 연동 관리 (346 lines)
- `app/actions/admin/security-settings.ts` - 보안 설정 관리 (209 lines)

**Admin Pages:**
- `/admin/settings/point` - 포인트 기본 설정 페이지 (332 lines)
- `/admin/points/rules` - 포인트 규칙 관리 페이지 (353 lines)
- `/admin/points/level-groups` - 레벨-그룹 연동 페이지 (376 lines)
- `/admin/settings/security` - 보안 설정 페이지 (461 lines)

**Type Definitions:**
- `types/point-settings.ts` - 포인트 설정 타입 (158 lines)
- `types/security-settings.ts` - 보안 설정 타입 (79 lines)

**Validation Schemas:**
- `lib/validations/point-settings.ts` - 포인트 설정 Zod 스키마 (66 lines)
- `lib/validations/security-settings.ts` - 보안 설정 Zod 스키마 (97 lines)

**Tests:**
- `__tests__/actions/admin/point-settings.test.ts` - 9 tests (286 lines)
- `__tests__/actions/admin/point-rules.test.ts` - 15 tests (496 lines)
- `__tests__/actions/admin/level-group-mapping.test.ts` - 14 tests (457 lines)
- `__tests__/actions/admin/security-settings.test.ts` - 11 tests (349 lines)

**Features (WHW-040 ~ WHW-043, WHW-050 ~ WHW-052):**
- 포인트 기본 설정 (모듈 켜기/끄기, 포인트 이름, 최고 레벨, 레벨 아이콘)
- 포인트 제한 (다운로드 금지, 글 열람 금지)
- 포인트 부여 규칙 (11종: 회원가입, 로그인, 글 작성, 댓글 작성, 파일 업로드/다운로드, 글 열람, 추천/비추천 등)
- 레벨-그룹 연동 (연동 방식: 교체/추가, 포인트 감소 처리: 유지/강등, 레벨별 그룹 할당 1-30)
- 미디어 필터 (외부 멀티미디어 허용 도메인, 허용된 HTML class 목록)
- 관리자 접근 제어 (허용 IP, 금지 IP, 로봇 user-agent 목록)
- 세션 보안 (자동 로그인 유지 시간, 보안키 갱신, 세션 SSL, 쿠키 SSL, CSRF 토큰 검사, nofollow, HttpOnly, SameSite, X-Frame-Options, X-Content-Type-Options)

#### Sprint 4: Notification System & Delivery Management (UC-007, UC-008)

**Database Migrations:**
- `027_notification_settings.sql` - 알림 설정 테이블 생성 (222 lines)
- `028_notification_delivery_settings.sql` - 알림 발송 설정 테이블 생성 (194 lines)
- `029_notification_logs.sql` - 알림 로그 테이블 생성 (247 lines)

**Server Actions:**
- `app/actions/admin/notification-settings.ts` - 알림 설정 관리
- `app/actions/admin/notification-delivery.ts` - 알림 발송 설정 관리

**Admin Pages:**
- `/admin/settings/notification` - 알림 유형별 채널 설정 페이지 (125 lines)
- `/admin/notification/delivery` - SMTP, SMS, 푸시 설정 페이지 (89 lines)
- `/admin/notification/logs` - 발송 내역 조회 페이지

**Type Definitions:**
- `types/notification-settings.ts` - 알림 설정 타입 (284 lines)
- `types/notification-logs.ts` - 알림 로그 타입 (384 lines)

**Validation Schemas:**
- `lib/validations/notification-settings.ts` - 알림 설정 Zod 스키마 (235 lines)
- `lib/validations/notification-delivery.ts` - 알림 발송 Zod 스키마 (470 lines)

**Tests:**
- `__tests__/actions/admin/notification-settings.test.ts` - 9 tests (366 lines)
- `__tests__/actions/admin/notification-delivery.test.ts` - 9 tests (368 lines)
- `__tests__/actions/admin/notification-logs.test.ts` - 8 tests (354 lines)

**Features (WHW-060 ~ WHW-062, WHW-070 ~ WHW-071):**
- 알림 유형 설정 (8가지: 댓글, 대댓글, 멘션, 추천, 스크랩, 쪽지, 관리자 콘텐츠, 커스텀)
- 알림 채널 (4개: 웹, 메일, SMS, 푸시 - 각 유형별 32 조합)
- 알림 표시 설정 (표시 여부: 모두/없음/PC만/모바일만, 항상 표시, 사용자 설정 목록 표시, 사용자 알림 설정 허용, SMS 전 푸시 시도, 문서 열람 시 알림 삭제)
- 발송 설정 (기본 발송 방법, 보낸이 정보, SMTP 설정: 호스트, 포트, 보안, 인증, SMS API: Twilio/Nexmo 등, 푸시: FCM/APNS/OneSignal, 웹: VAPID 키)
- 발송 내역 로그 (메일/SMS/푸시 발송 및 오류 내역, 6가지 상태: pending, sending, sent, failed, bounced, rejected, 참조 추적, 재시도 추적, 90일 보관 정책)

**Database Objects:**
- `notification_settings` - 알림 유형/채널/표시 설정 (JSONB 컬럼)
- `notification_delivery_settings` - 발송 방법 설정 (SMTP, SMS, 푸시, 웹)
- `notification_logs` - 발송 내역 로그 (상태, 참조, 재시도, 90일 보관)
- `user_notification_settings` - 사용자별 알림 선호도
- `notification_daily_stats` - 일별 발송 통계 (materialized view)
- `get_user_notification_stats()` - 사용자 통계 함수

### Phase 3: Quality Improvements (2026-03-02)

**Server Actions Created:**
- `app/actions/admin/notification-settings.ts` - 알림 설정 관리 (242 lines)
- `app/actions/admin/notification-delivery.ts` - 알림 발송 설정 관리 (253 lines)
- `app/actions/admin/notification-logs.ts` - 알림 로그 관리 (359 lines)

**Test Files Fixed:**
- Sprint 4: `notification-settings.test.ts`, `notification-delivery.test.ts`, `notification-logs.test.ts`
- Sprint 3: `point-rules.test.ts` (7 fixes), `point-settings.test.ts` (3 fixes), `security-settings.test.ts` (4 fixes)

**Quality Improvements:**
- Zero TypeScript errors in all SPEC-RHYMIX-002 files
- TRUST 5 framework compliance maintained
- All server actions include Korean error messages
- Comprehensive Zod validation schemas
- RLS policies for database security
- Audit logging for sensitive operations

### Phase 4: Feature Expansion - SPEC-ADMIN-MENU-001 (2026-03-02)

**New Files Created:**
- `types/admin-menu.ts` - 관리자 메뉴 타입 정의 (68 lines)
- `providers/AdminMenuProvider.tsx` - Context Provider (352 lines)
- `hooks/use-admin-menu.ts` - Custom Hook (22 lines)

**Files Modified:**
- `components/admin/AdminSidebar.tsx` - 한국어 타이틀, 권한 필터링, Context 통합
- `app/(admin)/layout.tsx` - AdminMenuProvider 래퍼 추가

**Features Implemented:**
- 8개 메뉴 카테고리: Dashboard, Site, Members, Content, Notifications, Configuration, Advanced, Logs
- 30+ 메뉴 아이템 (ASIS Rhymix 구조와 일치)
- 다국어 지원 (한국어/영어) - 모든 메뉴 아이템
- 권한 기반 접근 제어 - 각 메뉴 아이템별
- 모바일 반응형 사이드바 - 접힘/펼침 기능
- 로케일 인식 네비게이션 - 자동 접두사 처리
- 활성 메뉴 그룹 자동 확장
- Supabase에서 사용자 권한 가져오기

### Technical Details

**Database Schema:**
- 9 new tables: member_settings, editor_settings, point_settings, point_rules, level_group_mapping, security_settings, notification_settings, notification_delivery_settings, notification_logs
- profiles 테이블 확장 (point, level 컬럼)
- boards 테이블 확장 (20+ 컬럼: 콘텐츠, 댓글, 권한 설정)
- JSONB 컬럼을 통한 유연한 설정 저장
- Materialized views for dashboard statistics
- 90-day automatic retention policy for notification logs
- Comprehensive indexes for query optimization

**Code Quality:**
- 62 files created
- 18,945 lines of code added
- 110+ test cases (all passing)
- Zod validation schemas for all settings (80+ validation functions)
- Admin permission checks on all server actions
- Security-sensitive settings logged with warning severity
- Enum validation for all constraint columns
- TRUST 5 framework compliance

**UI/UX Features:**
- Auto-save with 500ms debounce
- Real-time validation feedback
- Consistent shadcn/ui components
- Mobile-responsive design
- Korean/English bilingual support
- User preference management
- Do-not-disturb mode with time ranges

### Changed

- Updated project structure documentation in README.md
- Enhanced admin navigation with hierarchical menu system
- Improved mobile responsiveness of admin sidebar
- Added comprehensive settings management across 4 major areas

### Commit References

- Sprint 1: `58d5386` - Member Settings Implementation
- Sprint 2: `2d2dace` - Board & Editor Settings Implementation
- Sprint 3: `23f90a9` - Points System & Security Settings Implementation
- Sprint 4: `589dd57` - Notification System & Delivery Management Implementation

---

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
