---
spec_id: SPEC-ADMIN-MENU-001
title: Admin Menu System - Implementation Plan
created: 2026-02-28T12:30:00Z
status: Planned
---

# Implementation Plan: Admin Menu System

## Overview

This plan outlines the implementation strategy for migrating from ASIS (30 menu items) to TOBE (comprehensive admin menu system) with proper permission handling, i18n support, and mobile responsiveness.

---

## Milestones

### Primary Goal: Core Menu Restructure

**Objective**: Restructure admin sidebar to match ASIS functionality

**Deliverables**:
1. Update `AdminSidebar.tsx` with complete menu structure
2. Add permission checking for menu visibility
3. Implement missing route pages (11 routes)
4. Add Korean translations for all menu items

**Success Criteria**:
- All 30 ASIS menu items have corresponding TOBE routes
- Menu items hidden when user lacks permission
- Korean/English labels display correctly
- Mobile menu functions properly

---

### Secondary Goal: Permission System Integration

**Objective**: Implement permission-based menu visibility

**Deliverables**:
1. Create permission constants file
2. Add permission checking utility
3. Integrate with Supabase RLS policies
4. Create permission management UI

**Success Criteria**:
- Menu items respect user permissions
- Permission check is performant (< 50ms)
- Permission denied shows appropriate message
- Admin can modify permissions

---

### Tertiary Goal: Notification Menu Group

**Objective**: Add notification management menus

**Deliverables**:
1. Create notifications settings page
2. Create notification center page
3. Integrate with notification services
4. Add notification preferences UI

**Success Criteria**:
- Mail/SMS/Push settings configurable
- Notification center displays alerts
- Users can manage notification preferences

---

### Final Goal: Advanced Features

**Objective**: Add advanced feature menus

**Deliverables**:
1. Create easy install marketplace page
2. Create installed layouts page
3. Create filebox management page
4. Create admin setup page

**Success Criteria**:
- Easy install shows available packages
- Layout management works correctly
- Filebox provides file management
- Admin interface is customizable

---

## Technical Approach

### Phase 1: Menu Structure Update

**Files to Modify**:
- `components/admin/AdminSidebar.tsx` - Update navItems array

**Changes**:
```typescript
// Current structure: 5 menu groups
// Target structure: 7 menu groups (30 items)

const navItems = [
  // Add: titleKo for i18n
  // Add: permission for visibility check
  // Add: 2 missing groups (Notifications, Advanced)
  // Expand Content group with 6 missing items
  // Expand Configuration group with 3 missing items
]
```

### Phase 2: Permission System

**New Files**:
- `lib/permissions/admin-menu.ts` - Permission constants
- `hooks/useMenuPermissions.ts` - Permission checking hook

**Implementation**:
```typescript
// lib/permissions/admin-menu.ts
export const ADMIN_PERMISSIONS = {
  // Core
  ADMIN_ACCESS: 'admin.access',

  // Members
  MEMBER_ACCESS: 'member.access',
  MEMBER_LIST: 'member.list',
  GROUP_LIST: 'group.list',
  PERMISSION_ADMIN: 'permission.admin',
  POINT_ADMIN: 'point.admin',

  // Content
  CONTENT_ACCESS: 'content.access',
  BOARD_ADMIN: 'board.admin',
  PAGE_ADMIN: 'page.admin',
  // ... etc
} as const

// hooks/useMenuPermissions.ts
export function useMenuPermissions() {
  const { data: permissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => checkAdminPermissions()
  })

  const hasPermission = useCallback((permission: string) => {
    return permissions?.includes(permission) ?? false
  }, [permissions])

  return { hasPermission }
}
```

### Phase 3: Missing Route Pages

**Pages to Create** (11 routes):

1. **Points** (`app/(admin)/admin/points/page.tsx`)
   - Point system configuration
   - Point history viewer
   - Point adjustment tools

2. **Documents** (`app/(admin)/admin/documents/page.tsx`)
   - Document list with search
   - Document status management
   - Bulk actions

3. **Comments** (`app/(admin)/admin/comments/page.tsx`)
   - Comment list with filtering
   - Comment moderation
   - Spam detection

4. **Editor** (`app/(admin)/admin/editor/page.tsx`)
   - Editor configuration
   - Toolbar customization
   - Plugin management

5. **Spam Filter** (`app/(admin)/admin/spam-filter/page.tsx`)
   - IP blacklist management
   - Word filter configuration
   - Captcha settings

6. **Trash** (`app/(admin)/admin/trash/page.tsx`)
   - Deleted items list
   - Restore functionality
   - Permanent delete

7. **Notifications** (`app/(admin)/admin/notifications/page.tsx`)
   - Mail configuration
   - SMS gateway settings
   - Push notification setup

8. **Notification Center** (`app/(admin)/admin/notification-center/page.tsx`)
   - Notification templates
   - Notification history
   - User preferences

9. **Admin Setup** (`app/(admin)/admin/admin-setup/page.tsx`)
   - Admin theme selection
   - Layout preferences
   - Shortcut customization

10. **Filebox** (`app/(admin)/admin/filebox/page.tsx`)
    - File browser
    - Upload management
    - Storage statistics

11. **Easy Install** (`app/(admin)/admin/easy-install/page.tsx`)
    - Package marketplace
    - Install/uninstall actions
    - Update management

12. **Installed Layouts** (`app/(admin)/admin/installed-layouts/page.tsx`)
    - Layout list
    - Layout preview
    - Layout settings

### Phase 4: i18n Integration

**Translation Files**:
- `locales/ko/admin.json` - Korean translations
- `locales/en/admin.json` - English translations
- `locales/ja/admin.json` - Japanese translations
- `locales/zh/admin.json` - Chinese translations

**Implementation**:
```json
// locales/ko/admin.json
{
  "menu": {
    "dashboard": "대시보드",
    "members": "회원",
    "all_members": "회원 목록",
    "groups": "회원 그룹",
    "permissions": "권한 설정",
    "points": "포인트",
    "content": "콘텐츠",
    "boards": "게시판",
    "pages": "페이지",
    "documents": "문서",
    "comments": "댓글",
    "media_library": "미디어 라이브러리",
    "polls": "설문",
    "editor": "에디터",
    "spam_filter": "스팸필터",
    "trash": "휴지통",
    "site": "사이트",
    "menus": "사이트 메뉴",
    "widgets": "위젯",
    "layouts": "레이아웃",
    "themes": "테마",
    "notifications": "알림",
    "mail_sms_push": "메일/SMS/푸시",
    "notification_center": "알림 센터",
    "configuration": "설정",
    "general": "시스템 설정",
    "admin_setup": "관리자 설정",
    "filebox": "파일박스",
    "translations": "다국어",
    "modules": "모듈",
    "analytics": "분석",
    "advanced": "고급",
    "easy_install": "쉬운 설치",
    "installed_layouts": "설치된 레이아웃",
    "logs": "로그"
  }
}
```

---

## Architecture Design

### Component Structure

```
components/admin/
├── AdminSidebar.tsx          # Main sidebar component
├── AdminMenuItem.tsx          # Individual menu item
├── AdminMenuGroup.tsx         # Expandable menu group
├── AdminMobileToggle.tsx      # Mobile hamburger toggle
└── AdminUserActions.tsx       # User action buttons

hooks/
├── useMenuPermissions.ts      # Permission checking
├── useActiveMenu.ts           # Active state tracking
└── useLocalePrefix.ts         # Locale route prefixing

lib/permissions/
├── admin-menu.ts              # Menu permission constants
├── check-permissions.ts       # Permission checking utility
└── roles.ts                   # Role definitions
```

### Data Flow

```
User Login
    ↓
Supabase Auth
    ↓
Fetch User Permissions
    ↓
Menu Permission Check
    ↓
Filter Menu Items
    ↓
Render Sidebar
```

---

## Risks and Mitigation

### Risk 1: Permission Complexity
**Impact**: High - May cause performance issues
**Mitigation**:
- Cache permissions in React Query
- Use Supabase RLS for server-side filtering
- Implement optimistic UI updates

### Risk 2: i18n Inconsistency
**Impact**: Medium - Poor user experience
**Mitigation**:
- Use translation keys instead of hardcoded strings
- Implement fallback to English
- Add translation validation in CI

### Risk 3: Mobile Menu UX
**Impact**: Medium - Usability issues on mobile
**Mitigation**:
- Test on multiple screen sizes
- Implement touch-friendly targets
- Add keyboard navigation support

### Risk 4: Missing Route Pages
**Impact**: High - Dead links in menu
**Mitigation**:
- Create placeholder pages first
- Implement one route at a time
- Add loading states for incomplete pages

---

## Testing Strategy

### Unit Tests
- Permission checking utility
- Menu item filtering logic
- Active state detection
- Locale prefix generation

### Integration Tests
- Full menu rendering
- Permission-based visibility
- Navigation flow
- Mobile toggle behavior

### E2E Tests
- Complete admin navigation
- Permission denial scenarios
- Multi-language switching
- Mobile menu interaction

---

## Definition of Done

- [ ] All 30 menu items implemented
- [ ] Permission checking working for all items
- [ ] Korean translations complete
- [ ] Mobile menu responsive
- [ ] Active state tracking accurate
- [ ] Locale-aware routing working
- [ ] All route pages created (even if placeholder)
- [ ] Unit tests passing (80%+ coverage)
- [ ] E2E tests passing
- [ ] Lighthouse accessibility score 90+
- [ ] No TypeScript errors
- [ ] No ESLint warnings

---

## Next Steps

1. **Immediate**: Update `AdminSidebar.tsx` with complete menu structure
2. **Short-term**: Create permission checking system
3. **Medium-term**: Implement missing route pages
4. **Long-term**: Add i18n support for all menu items

---

## Dependencies

### Required Before Implementation
- Supabase authentication working
- RLS policies configured
- i18n system set up
- Permission roles defined

### Blocked By
- None - Can start immediately

### Blocks
- SPEC-ADMIN-PAGES (requires menu structure)
- SPEC-ADMIN-PERMISSIONS (requires menu items)
