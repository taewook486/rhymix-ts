# Admin Menu API Reference

## Overview

This document describes the admin menu system implemented as part of SPEC-ADMIN-MENU-001. The admin menu provides a comprehensive navigation structure for the Rhymix-TS admin panel with 7 main categories and 30+ menu items.

## Architecture

### Component: AdminSidebar

**Location**: `components/admin/AdminSidebar.tsx`

**Type**: Client Component

**Purpose**: Provides the main navigation sidebar for the admin panel with hierarchical menu structure, multi-language support, and permission-based access control.

### Menu Structure

The admin menu is organized into 7 main categories:

1. **Dashboard** - Main overview and statistics
2. **Site** - Site structure and navigation
3. **Members** - User and group management
4. **Content** - Content management
5. **Notifications** - Communication tools
6. **Configuration** - System settings
7. **Advanced** - Advanced tools
8. **Logs** - System logs

## API Reference

### Menu Item Interface

```typescript
interface NavChildItem {
  title: string          // English title
  titleKo: string        // Korean title
  href: string           // Route path
  permission: string     // Required permission
}

interface NavItem {
  title: string          // English title
  titleKo: string        // Korean title
  href: string           // Route path
  icon: LucideIcon       // Lucide React icon component
  permission: string     // Required permission
  children?: NavChildItem[]  // Sub-menu items
}
```

### Menu Items

#### Dashboard

```typescript
{
  title: 'Dashboard',
  titleKo: '대시보드',
  href: '/admin',
  icon: LayoutDashboard,
  permission: 'admin.access'
}
```

#### Site

```typescript
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
    { title: 'Themes', titleKo: '테마', href: '/admin/themes', permission: 'theme.admin' },
  ]
}
```

#### Members

```typescript
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
    { title: 'Points', titleKo: '포인트', href: '/admin/points', permission: 'point.admin' },
  ]
}
```

#### Content

```typescript
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
    { title: 'Trash', titleKo: '휴지통', href: '/admin/trash', permission: 'trash.list' },
  ]
}
```

#### Notifications

```typescript
{
  title: 'Notifications',
  titleKo: '알림',
  href: '/admin/notifications',
  icon: Bell,
  permission: 'notification.access',
  children: [
    { title: 'Mail/SMS/Push', titleKo: '메일/SMS/푸시', href: '/admin/notifications', permission: 'notification.admin' },
    { title: 'Notification Center', titleKo: '알림 센터', href: '/admin/notification-center', permission: 'ncenterlite.admin' },
  ]
}
```

#### Configuration

```typescript
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
    { title: 'Analytics', titleKo: '분석', href: '/admin/analytics', permission: 'analytics.view' },
  ]
}
```

#### Advanced

```typescript
{
  title: 'Advanced',
  titleKo: '고급',
  href: '/admin/easy-install',
  icon: Package,
  permission: 'advanced.access',
  children: [
    { title: 'Easy Install', titleKo: '쉬운 설치', href: '/admin/easy-install', permission: 'autoinstall.admin' },
    { title: 'Installed Layouts', titleKo: '설치된 레이아웃', href: '/admin/installed-layouts', permission: 'layout.list' },
  ]
}
```

#### Logs

```typescript
{
  title: 'Logs',
  titleKo: '로그',
  href: '/admin/logs',
  icon: ScrollText,
  permission: 'logs.access'
}
```

## Admin Route Pages

### New Routes Created (12)

The following admin route pages were created as part of SPEC-ADMIN-MENU-001:

1. **`/admin/points`** - Point management system
   - File: `app/(admin)/admin/points/page.tsx`
   - Permission: `point.admin`

2. **`/admin/documents`** - Document management
   - File: `app/(admin)/admin/documents/page.tsx`
   - Permission: `document.list`

3. **`/admin/comments`** - Comment management
   - File: `app/(admin)/admin/comments/page.tsx`
   - Permission: `comment.list`

4. **`/admin/editor`** - Editor configuration
   - File: `app/(admin)/admin/editor/page.tsx`
   - Permission: `editor.admin`

5. **`/admin/spam-filter`** - Spam filter settings
   - File: `app/(admin)/admin/spam-filter/page.tsx`
   - Permission: `spamfilter.admin`

6. **`/admin/trash`** - Trash management
   - File: `app/(admin)/admin/trash/page.tsx`
   - Permission: `trash.list`

7. **`/admin/notifications`** - Mail/SMS/Push notifications
   - File: `app/(admin)/admin/notifications/page.tsx`
   - Permission: `notification.admin`

8. **`/admin/notification-center`** - Notification center settings
   - File: `app/(admin)/admin/notification-center/page.tsx`
   - Permission: `ncenterlite.admin`

9. **`/admin/admin-setup`** - Admin configuration
   - File: `app/(admin)/admin/admin-setup/page.tsx`
   - Permission: `admin.setup`

10. **`/admin/filebox`** - Filebox management
    - File: `app/(admin)/admin/filebox/page.tsx`
    - Permission: `filebox.admin`

11. **`/admin/easy-install`** - Easy installation module
    - File: `app/(admin)/admin/easy-install/page.tsx`
    - Permission: `autoinstall.admin`

12. **`/admin/installed-layouts`** - Layout management
    - File: `app/(admin)/admin/installed-layouts/page.tsx`
    - Permission: `layout.list`

## Features

### Multi-language Support

All menu items include both English and Korean titles:

```typescript
{
  title: 'Dashboard',      // English
  titleKo: '대시보드',      // Korean
}
```

The component automatically displays the appropriate language based on the current locale.

### Permission-based Access Control

Each menu item requires a specific permission string:

```typescript
permission: 'admin.access'  // Required permission
```

Before displaying a menu item, the system checks if the current user has the required permission.

### Locale-aware Routing

The sidebar automatically handles locale prefixes in URLs:

```typescript
// Without locale
/admin/menus

// With locale (e.g., Korean)
/ko/admin/menus
```

The locale is extracted from the pathname and applied to all navigation links.

### Mobile Responsiveness

The sidebar includes:

- Collapsible navigation with hamburger menu button
- Overlay background when mobile menu is open
- Touch-friendly navigation items
- Automatic close on route navigation

## Usage Example

```typescript
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

## Styling

The sidebar uses Tailwind CSS for styling with the following features:

- Fixed positioning on desktop, collapsible on mobile
- Border-right separator
- Hover effects on menu items
- Active state highlighting
- Smooth transitions and animations

## Icons

The menu uses Lucide React icons for visual clarity:

- `LayoutDashboard` - Dashboard
- `MenuIcon` - Site
- `Users` - Members
- `LayoutGrid` - Content
- `Bell` - Notifications
- `Settings` - Configuration
- `Package` - Advanced
- `ScrollText` - Logs

## Accessibility

The sidebar includes:

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast text for visibility
- Clear focus indicators

## Future Enhancements

Potential improvements for future versions:

1. **Dynamic Menu Loading**: Load menu items from database configuration
2. **Custom Menu Items**: Allow users to add custom menu items
3. **Menu Reordering**: Drag-and-drop menu reordering
4. **Menu Search**: Quick search for menu items
5. **Breadcrumb Navigation**: Add breadcrumb navigation
6. **Menu Favorites**: Allow users to favorite frequently used menu items
7. **Collapsible Categories**: Remember collapsed state per user

## Related Documentation

- [Admin Architecture](./ADMIN-ARCHITECTURE.md)
- [Permission System](./PERMISSIONS.md)
- [Seed Data System](./SEED-DATA.md)
- [Migration Guide](./MIGRATION-GUIDE.md)

## SPEC Reference

- **SPEC ID**: SPEC-ADMIN-MENU-001
- **Specification**: .moai/specs/SPEC-ADMIN-MENU-001/spec.md
- **Implementation Date**: 2026-02-28
