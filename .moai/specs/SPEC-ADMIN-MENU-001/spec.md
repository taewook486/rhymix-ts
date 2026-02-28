---
spec_id: SPEC-ADMIN-MENU-001
title: Admin Menu System
created: 2026-02-28T12:30:00Z
status: Planned
priority: High
assigned: manager-spec
lifecycle_level: spec-anchored
related_specs:
  - SPEC-AUTH-001
  - SPEC-MEMBER-001
epic: Admin Dashboard
estimated_effort: 40 hours
labels:
  - admin
  - navigation
  - menu
  - ui
---

# SPEC-ADMIN-MENU-001: Admin Menu System

## Environment

### System Context
- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19 with Server Components
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Supabase Auth with role-based access
- **Database**: Supabase PostgreSQL with RLS policies
- **State Management**: React Context for menu state

### Technical Constraints
- Menu items must be permission-aware
- Support for i18n (Korean, English, Japanese, Chinese)
- Mobile-responsive sidebar with hamburger menu
- Active state tracking for navigation
- Locale-prefixed routing (e.g., `/ko/admin/members`)

### Assumptions
- Admin users have `admin` role in Supabase
- Menu permissions are checked against RLS policies
- All admin routes are protected by middleware
- Menu structure is static (not user-configurable)

---

## Requirements

### ASIS Admin Menu Analysis

Based on Playwright analysis of existing Rhymix admin panel:

**Total GNB Items**: 30 menu items across 7 main categories

| Category | Korean Name | Sub-items |
|----------|-------------|-----------|
| Dashboard | 대시보드 | 1 |
| Site | 사이트 | 3 |
| Member | 회원 | 4 |
| Content | 콘텐츠 | 9 |
| Settings | 설정 | 4 |
| Advanced | 고급 | 3 |
| Favorites | 즐겨찾기 | 1 |

### ASIS Menu Mapping (30 Items)

#### 1. Dashboard (대시보드)
- **act**: `dispDashboard` (implied)
- **URL**: `/index.php?module=admin`
- **Permission**: Admin access
- **Description**: Main admin dashboard with statistics

#### 2. Site Management (사이트)
- **Site Map Editor** (사이트 메뉴 편집)
  - **act**: `dispMenuAdminSiteMap`
  - **Permission**: `menu.admin`
  - **Description**: Edit site menu structure
- **Site Design** (사이트 디자인 설정)
  - **act**: `dispMenuAdminSiteDesign`
  - **Permission**: `layout.admin`
  - **Description**: Configure site design settings

#### 3. Member Management (회원)
- **Member List** (회원 목록)
  - **act**: `dispMemberAdminList`
  - **Permission**: `member.list`
  - **Description**: View and manage all members
- **Member Config** (회원 설정)
  - **act**: `dispMemberAdminConfig`
  - **Permission**: `member.admin`
  - **Description**: Configure member settings
- **Member Groups** (회원 그룹)
  - **act**: `dispMemberAdminGroupList`
  - **Permission**: `group.list`
  - **Description**: Manage member groups
- **Points** (포인트)
  - **act**: `dispPointAdminConfig`
  - **Permission**: `point.admin`
  - **Description**: Point system configuration

#### 4. Content Management (콘텐츠)
- **Board** (게시판)
  - **act**: `dispBoardAdminContent`
  - **Permission**: `board.admin`
  - **Description**: Manage board modules
- **Page** (페이지)
  - **act**: `dispPageAdminContent`
  - **Permission**: `page.admin`
  - **Description**: Manage page modules
- **Document** (문서)
  - **act**: `dispDocumentAdminList`
  - **Permission**: `document.list`
  - **Description**: Document management
- **Comment** (댓글)
  - **act**: `dispCommentAdminList`
  - **Permission**: `comment.list`
  - **Description**: Comment management
- **File** (파일)
  - **act**: `dispFileAdminList`
  - **Permission**: `file.list`
  - **Description**: File management
- **Poll** (설문)
  - **act**: `dispPollAdminList`
  - **Permission**: `poll.admin`
  - **Description**: Poll management
- **Editor** (에디터)
  - **act**: `dispEditorAdminIndex`
  - **Permission**: `editor.admin`
  - **Description**: Editor configuration
- **Spam Filter** (스팸필터)
  - **act**: `dispSpamfilterAdminDeniedIPList`
  - **Permission**: `spamfilter.admin`
  - **Description**: Spam filter settings
- **Trash** (휴지통)
  - **act**: `dispTrashAdminList`
  - **Permission**: `trash.list`
  - **Description**: Trash management

#### 5. Notifications (알림)
- **Mail/SMS/Push** (메일, SMS 및 푸시 알림 관리)
  - **act**: `dispAdvanced_mailerAdminConfig`
  - **Permission**: `notification.admin`
  - **Description**: Notification settings
- **Notification Center** (알림 센터)
  - **act**: `dispNcenterliteAdminConfig`
  - **Permission**: `ncenterlite.admin`
  - **Description**: Notification center config

#### 6. Configuration (설정)
- **System Config** (시스템 설정)
  - **act**: `dispAdminConfigGeneral`
  - **Permission**: `admin.config`
  - **Description**: General system settings
- **Admin Setup** (관리자 화면 설정)
  - **act**: `dispAdminSetup`
  - **Permission**: `admin.setup`
  - **Description**: Admin interface settings
- **Filebox** (파일박스)
  - **act**: `dispModuleAdminFileBox`
  - **Permission**: `filebox.admin`
  - **Description**: Module filebox

#### 7. Advanced (고급)
- **Easy Install** (쉬운 설치)
  - **act**: `dispAutoinstallAdminIndex`
  - **Permission**: `autoinstall.admin`
  - **Description**: Easy install marketplace
- **Installed Layouts** (설치된 레이아웃)
  - **act**: `dispLayoutAdminInstalledList`
  - **Permission**: `layout.list`
  - **Description**: Manage installed layouts

---

### TOBE Admin Menu Requirements

### REQ-001: Dashboard (Ubiquitous)
**The system shall always display a dashboard menu item as the first navigation option.**

- **Korean**: 대시보드
- **Route**: `/admin`
- **Icon**: LayoutDashboard
- **Permission**: `admin.access`
- **Priority**: High

### REQ-002: Members Menu Group (Ubiquitous)
**The system shall always provide a Members menu group with member management sub-items.**

- **Korean**: 회원
- **Icon**: Users
- **Sub-items**:
  - All Members (회원 목록) → `/admin/members`
  - Groups (회원 그룹) → `/admin/groups`
  - Permissions (권한 설정) → `/admin/permissions`
  - Points (포인트) → `/admin/points` [MISSING]
- **Permission**: `member.access`
- **Priority**: High

### REQ-003: Content Menu Group (Ubiquitous)
**The system shall always provide a Content menu group with content management sub-items.**

- **Korean**: 콘텐츠
- **Icon**: LayoutGrid
- **Sub-items**:
  - Boards (게시판) → `/admin/boards`
  - Pages (페이지) → `/admin/pages`
  - Documents (문서) → `/admin/documents` [MISSING]
  - Comments (댓글) → `/admin/comments` [MISSING]
  - Media Library (파일) → `/admin/media`
  - Polls (설문) → `/admin/polls`
  - Editor (에디터) → `/admin/editor` [MISSING]
  - Spam Filter (스팸필터) → `/admin/spam-filter` [MISSING]
  - Trash (휴지통) → `/admin/trash` [MISSING]
- **Permission**: `content.access`
- **Priority**: High

### REQ-004: Site Menu Group (Ubiquitous)
**The system shall always provide a Site menu group for site structure management.**

- **Korean**: 사이트
- **Icon**: MenuIcon
- **Sub-items**:
  - Menus (사이트 메뉴) → `/admin/menus`
  - Widgets (위젯) → `/admin/widgets`
  - Layouts (레이아웃) → `/admin/layout`
  - Themes (테마) → `/admin/themes`
- **Permission**: `site.access`
- **Priority**: High

### REQ-005: Notifications Menu Group (Event-Driven)
**WHEN notifications are enabled, THEN the system shall display a Notifications menu group.**

- **Korean**: 알림
- **Icon**: Bell
- **Sub-items**:
  - Mail/SMS/Push (메일/SMS/푸시) → `/admin/notifications` [MISSING]
  - Notification Center (알림 센터) → `/admin/notification-center` [MISSING]
- **Permission**: `notification.access`
- **Priority**: Medium

### REQ-006: Configuration Menu Group (Ubiquitous)
**The system shall always provide a Configuration menu group for system settings.**

- **Korean**: 설정
- **Icon**: Settings
- **Sub-items**:
  - General (시스템 설정) → `/admin/settings`
  - Admin Setup (관리자 설정) → `/admin/admin-setup` [MISSING]
  - Filebox (파일박스) → `/admin/filebox` [MISSING]
  - Translations (다국어) → `/admin/translations`
  - Modules (모듈) → `/admin/modules`
  - Analytics (분석) → `/admin/analytics`
- **Permission**: `config.access`
- **Priority**: High

### REQ-007: Advanced Menu Group (Event-Driven)
**WHEN advanced features are available, THEN the system shall display an Advanced menu group.**

- **Korean**: 고급
- **Icon**: Package
- **Sub-items**:
  - Easy Install (쉬운 설치) → `/admin/easy-install` [MISSING]
  - Installed Layouts (설치된 레이아웃) → `/admin/installed-layouts` [MISSING]
  - Installed Modules (설치된 모듈) → `/admin/modules` (existing)
- **Permission**: `advanced.access`
- **Priority**: Low

### REQ-008: Logs Menu (Ubiquitous)
**The system shall always display a Logs menu for audit trail access.**

- **Korean**: 로그
- **Route**: `/admin/logs`
- **Icon**: ScrollText
- **Permission**: `logs.access`
- **Priority**: High

### REQ-009: Mobile Responsive Menu (State-Driven)
**IF the viewport width is less than 1024px, THEN the system shall display a hamburger menu toggle instead of the sidebar.**

- Mobile breakpoint: `lg` (1024px)
- Hamburger icon when closed
- X icon when open
- Overlay backdrop when menu is open
- Touch outside to close

### REQ-010: Active State Tracking (Event-Driven)
**WHEN a user navigates to a menu item, THEN the system shall highlight the active menu item and expand its parent group.**

- Active parent: `bg-primary text-primary-foreground`
- Active child: `text-primary font-medium`
- Expand only active parent's children

### REQ-011: Locale-Aware Navigation (Ubiquitous)
**The system shall always prefix menu routes with the current locale.**

- Supported locales: `ko`, `en`, `ja`, `zh`
- Example: `/ko/admin/members`, `/en/admin/settings`
- No prefix for default locale (if configured)

### REQ-012: Permission-Based Visibility (State-Driven)
**IF the user lacks permission for a menu item, THEN the system shall hide that menu item from navigation.**

- Check permissions via Supabase RLS
- Hide entire menu groups if no sub-permissions
- Show only accessible items

---

## Specifications

### SPEC-001: Menu Data Structure

```typescript
interface NavItem {
  title: string
  titleKo: string
  href: string
  icon: LucideIcon
  permission: string
  children?: NavChildItem[]
}

interface NavChildItem {
  title: string
  titleKo: string
  href: string
  permission: string
}
```

### SPEC-002: Complete Menu Structure

```typescript
const adminMenuItems: NavItem[] = [
  {
    title: 'Dashboard',
    titleKo: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
    permission: 'admin.access'
  },
  {
    title: 'Members',
    titleKo: '회원',
    href: '/admin/members',
    icon: Users,
    permission: 'member.access',
    children: [
      { title: 'All Members', titleKo: '회원 목록', href: '/admin/members', permission: 'member.list' },
      { title: 'Groups', titleKo: '회원 그룹', href: '/admin/groups', permission: 'group.list' },
      { title: 'Permissions', titleKo: '권한 설정', href: '/admin/permissions', permission: 'permission.admin' },
      { title: 'Points', titleKo: '포인트', href: '/admin/points', permission: 'point.admin' }
    ]
  },
  {
    title: 'Content',
    titleKo: '콘텐츠',
    href: '/admin/boards',
    icon: LayoutGrid,
    permission: 'content.access',
    children: [
      { title: 'Boards', titleKo: '게시판', href: '/admin/boards', permission: 'board.admin' },
      { title: 'Pages', titleKo: '페이지', href: '/admin/pages', permission: 'page.admin' },
      { title: 'Documents', titleKo: '문서', href: '/admin/documents', permission: 'document.list' },
      { title: 'Comments', titleKo: '댓글', href: '/admin/comments', permission: 'comment.list' },
      { title: 'Media Library', titleKo: '미디어 라이브러리', href: '/admin/media', permission: 'file.list' },
      { title: 'Polls', titleKo: '설문', href: '/admin/polls', permission: 'poll.admin' },
      { title: 'Editor', titleKo: '에디터', href: '/admin/editor', permission: 'editor.admin' },
      { title: 'Spam Filter', titleKo: '스팸필터', href: '/admin/spam-filter', permission: 'spamfilter.admin' },
      { title: 'Trash', titleKo: '휴지통', href: '/admin/trash', permission: 'trash.list' }
    ]
  },
  {
    title: 'Site',
    titleKo: '사이트',
    href: '/admin/menus',
    icon: MenuIcon,
    permission: 'site.access',
    children: [
      { title: 'Menus', titleKo: '사이트 메뉴', href: '/admin/menus', permission: 'menu.admin' },
      { title: 'Widgets', titleKo: '위젯', href: '/admin/widgets', permission: 'widget.admin' },
      { title: 'Layouts', titleKo: '레이아웃', href: '/admin/layout', permission: 'layout.admin' },
      { title: 'Themes', titleKo: '테마', href: '/admin/themes', permission: 'theme.admin' }
    ]
  },
  {
    title: 'Notifications',
    titleKo: '알림',
    href: '/admin/notifications',
    icon: Bell,
    permission: 'notification.access',
    children: [
      { title: 'Mail/SMS/Push', titleKo: '메일/SMS/푸시', href: '/admin/notifications', permission: 'notification.admin' },
      { title: 'Notification Center', titleKo: '알림 센터', href: '/admin/notification-center', permission: 'ncenterlite.admin' }
    ]
  },
  {
    title: 'Configuration',
    titleKo: '설정',
    href: '/admin/settings',
    icon: Settings,
    permission: 'config.access',
    children: [
      { title: 'General', titleKo: '시스템 설정', href: '/admin/settings', permission: 'admin.config' },
      { title: 'Admin Setup', titleKo: '관리자 설정', href: '/admin/admin-setup', permission: 'admin.setup' },
      { title: 'Filebox', titleKo: '파일박스', href: '/admin/filebox', permission: 'filebox.admin' },
      { title: 'Translations', titleKo: '다국어', href: '/admin/translations', permission: 'translation.admin' },
      { title: 'Modules', titleKo: '모듈', href: '/admin/modules', permission: 'module.admin' },
      { title: 'Analytics', titleKo: '분석', href: '/admin/analytics', permission: 'analytics.view' }
    ]
  },
  {
    title: 'Advanced',
    titleKo: '고급',
    href: '/admin/easy-install',
    icon: Package,
    permission: 'advanced.access',
    children: [
      { title: 'Easy Install', titleKo: '쉬운 설치', href: '/admin/easy-install', permission: 'autoinstall.admin' },
      { title: 'Installed Layouts', titleKo: '설치된 레이아웃', href: '/admin/installed-layouts', permission: 'layout.list' },
      { title: 'Installed Modules', titleKo: '설치된 모듈', href: '/admin/modules', permission: 'module.list' }
    ]
  },
  {
    title: 'Logs',
    titleKo: '로그',
    href: '/admin/logs',
    icon: ScrollText,
    permission: 'logs.access'
  }
]
```

### SPEC-003: Permission System

Required permissions for menu visibility:

| Permission Code | Description | Category |
|----------------|-------------|----------|
| `admin.access` | Basic admin access | Core |
| `member.access` | Member management access | Members |
| `member.list` | View member list | Members |
| `group.list` | View group list | Members |
| `permission.admin` | Manage permissions | Members |
| `point.admin` | Manage points | Members |
| `content.access` | Content management access | Content |
| `board.admin` | Manage boards | Content |
| `page.admin` | Manage pages | Content |
| `document.list` | View documents | Content |
| `comment.list` | View comments | Content |
| `file.list` | View files | Content |
| `poll.admin` | Manage polls | Content |
| `editor.admin` | Manage editor | Content |
| `spamfilter.admin` | Manage spam filter | Content |
| `trash.list` | View trash | Content |
| `site.access` | Site management access | Site |
| `menu.admin` | Manage menus | Site |
| `widget.admin` | Manage widgets | Site |
| `layout.admin` | Manage layouts | Site |
| `theme.admin` | Manage themes | Site |
| `notification.access` | Notification access | Notifications |
| `notification.admin` | Manage notifications | Notifications |
| `ncenterlite.admin` | Manage notification center | Notifications |
| `config.access` | Configuration access | Configuration |
| `admin.config` | System configuration | Configuration |
| `admin.setup` | Admin interface setup | Configuration |
| `filebox.admin` | Manage filebox | Configuration |
| `translation.admin` | Manage translations | Configuration |
| `module.admin` | Manage modules | Configuration |
| `analytics.view` | View analytics | Configuration |
| `advanced.access` | Advanced features access | Advanced |
| `autoinstall.admin` | Use easy install | Advanced |
| `layout.list` | View installed layouts | Advanced |
| `module.list` | View installed modules | Advanced |
| `logs.access` | View logs | Logs |

---

## Traceability

### TAG Block

```
TAG: SPEC-ADMIN-MENU-001
Parent: Admin Dashboard System
Dependencies:
  - SPEC-AUTH-001 (Authentication)
  - SPEC-MEMBER-001 (Member Management)
Implements:
  - REQ-001: Dashboard menu
  - REQ-002: Members menu group
  - REQ-003: Content menu group
  - REQ-004: Site menu group
  - REQ-005: Notifications menu group
  - REQ-006: Configuration menu group
  - REQ-007: Advanced menu group
  - REQ-008: Logs menu
  - REQ-009: Mobile responsive menu
  - REQ-010: Active state tracking
  - REQ-011: Locale-aware navigation
  - REQ-012: Permission-based visibility
```

### Gap Analysis Summary

**ASIS**: 30 menu items across 7 categories
**TOBE Current**: 19 routes implemented
**Missing Routes**: 11 routes

| Missing Route | Korean Name | Priority |
|---------------|-------------|----------|
| `/admin/points` | 포인트 | High |
| `/admin/documents` | 문서 | High |
| `/admin/comments` | 댓글 | High |
| `/admin/editor` | 에디터 | Medium |
| `/admin/spam-filter` | 스팸필터 | Medium |
| `/admin/trash` | 휴지통 | Medium |
| `/admin/notifications` | 알림 설정 | Medium |
| `/admin/notification-center` | 알림 센터 | Medium |
| `/admin/admin-setup` | 관리자 설정 | Low |
| `/admin/filebox` | 파일박스 | Low |
| `/admin/easy-install` | 쉬운 설치 | Low |
| `/admin/installed-layouts` | 설치된 레이아웃 | Low |

---

## References

- ASIS Admin Screenshot: `screenshots/admin-with-cookies.png`
- ASIS Menu JSON: `scripts/asis-admin-complete-2026-02-28T12-25-41.json`
- Current Sidebar Component: `components/admin/AdminSidebar.tsx`
- Admin Layout: `app/(admin)/layout.tsx`
