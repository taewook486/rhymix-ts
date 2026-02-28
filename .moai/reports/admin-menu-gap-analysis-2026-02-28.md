# Admin Menu Gap Analysis Report

**Generated**: 2026-02-28T12:30:00Z
**Analyzed By**: manager-spec agent
**Source**: ASIS Admin Menu Structure (Playwright analysis)

---

## Executive Summary

This report analyzes the gap between the existing Rhymix (ASIS) admin menu structure and the current Next.js implementation (TOBE).

**Key Findings**:
- **ASIS**: 30 menu items across 7 main categories
- **TOBE**: 19 routes currently implemented
- **Gap**: 11 routes missing (37% coverage)
- **Priority**: High - Core admin functionality incomplete

---

## ASIS Menu Structure Analysis

### Source
- **Method**: Playwright browser automation with user cookies
- **Screenshot**: `screenshots/admin-with-cookies.png`
- **JSON Data**: `scripts/asis-admin-complete-2026-02-28T12-25-41.json`

### Complete Menu Inventory

| # | Category | Korean Name | English Name | act Parameter | Status |
|---|----------|-------------|--------------|---------------|--------|
| 1 | Dashboard | 대시보드 | Dashboard | (default) | ✅ EXISTS |
| 2 | Site | 사이트 메뉴 편집 | Site Map Editor | dispMenuAdminSiteMap | ✅ EXISTS |
| 3 | Site | 사이트 디자인 설정 | Site Design | dispMenuAdminSiteDesign | ✅ EXISTS |
| 4 | Member | 회원 목록 | Member List | dispMemberAdminList | ✅ EXISTS |
| 5 | Member | 회원 설정 | Member Config | dispMemberAdminConfig | ✅ EXISTS |
| 6 | Member | 회원 그룹 | Member Groups | dispMemberAdminGroupList | ✅ EXISTS |
| 7 | Member | 포인트 | Points | dispPointAdminConfig | ❌ MISSING |
| 8 | Content | 게시판 | Board | dispBoardAdminContent | ✅ EXISTS |
| 9 | Content | 페이지 | Page | dispPageAdminContent | ✅ EXISTS |
| 10 | Content | 문서 | Document | dispDocumentAdminList | ❌ MISSING |
| 11 | Content | 댓글 | Comment | dispCommentAdminList | ❌ MISSING |
| 12 | Content | 파일 | File | dispFileAdminList | ✅ EXISTS (as media) |
| 13 | Content | 설문 | Poll | dispPollAdminList | ✅ EXISTS |
| 14 | Content | 에디터 | Editor | dispEditorAdminIndex | ❌ MISSING |
| 15 | Content | 스팸필터 | Spam Filter | dispSpamfilterAdminDeniedIPList | ❌ MISSING |
| 16 | Content | 휴지통 | Trash | dispTrashAdminList | ❌ MISSING |
| 17 | Notifications | 메일/SMS/푸시 | Mail/SMS/Push | dispAdvanced_mailerAdminConfig | ❌ MISSING |
| 18 | Notifications | 알림 센터 | Notification Center | dispNcenterliteAdminConfig | ❌ MISSING |
| 19 | Configuration | 시스템 설정 | System Config | dispAdminConfigGeneral | ✅ EXISTS |
| 20 | Configuration | 관리자 화면 설정 | Admin Setup | dispAdminSetup | ❌ MISSING |
| 21 | Configuration | 파일박스 | Filebox | dispModuleAdminFileBox | ❌ MISSING |
| 22 | Advanced | 쉬운 설치 | Easy Install | dispAutoinstallAdminIndex | ❌ MISSING |
| 23 | Advanced | 설치된 레이아웃 | Installed Layouts | dispLayoutAdminInstalledList | ❌ MISSING |

### Additional TOBE Routes (Not in ASIS)

| # | Route | Korean Name | Status |
|---|-------|-------------|--------|
| - | /admin/permissions | 권한 설정 | ✅ NEW |
| - | /admin/widgets | 위젯 | ✅ NEW |
| - | /admin/layout | 레이아웃 | ✅ NEW |
| - | /admin/themes | 테마 | ✅ NEW |
| - | /admin/translations | 다국어 | ✅ NEW |
| - | /admin/modules | 모듈 | ✅ NEW |
| - | /admin/analytics | 분석 | ✅ NEW |
| - | /admin/logs | 로그 | ✅ NEW |

---

## Gap Analysis

### Critical Gaps (High Priority)

#### 1. Points Management
- **ASIS**: Full point system configuration
- **TOBE**: No route exists
- **Impact**: Member engagement feature missing
- **Recommendation**: Create `/admin/points` route immediately

#### 2. Document Management
- **ASIS**: Document list with search and moderation
- **TOBE**: No route exists
- **Impact**: Content moderation limited
- **Recommendation**: Create `/admin/documents` route

#### 3. Comment Management
- **ASIS**: Comment moderation and spam detection
- **TOBE**: No route exists
- **Impact**: Community management impossible
- **Recommendation**: Create `/admin/comments` route

### Important Gaps (Medium Priority)

#### 4. Editor Configuration
- **ASIS**: Editor toolbar and plugin management
- **TOBE**: No route exists
- **Impact**: Editor customization limited
- **Recommendation**: Create `/admin/editor` route

#### 5. Spam Filter
- **ASIS**: IP blacklist and word filter
- **TOBE**: No route exists
- **Impact**: Spam protection missing
- **Recommendation**: Create `/admin/spam-filter` route

#### 6. Trash Management
- **ASIS**: Deleted items recovery
- **TOBE**: No route exists
- **Impact**: No undo capability
- **Recommendation**: Create `/admin/trash` route

#### 7. Notifications
- **ASIS**: Mail/SMS/Push configuration
- **TOBE**: No route exists
- **Impact**: Communication features limited
- **Recommendation**: Create `/admin/notifications` and `/admin/notification-center` routes

### Low Priority Gaps

#### 8. Admin Setup
- **ASIS**: Admin interface customization
- **TOBE**: No route exists
- **Impact**: UX customization limited
- **Recommendation**: Create `/admin/admin-setup` route

#### 9. Filebox
- **ASIS**: Module file management
- **TOBE**: No route exists
- **Impact**: Module development affected
- **Recommendation**: Create `/admin/filebox` route

#### 10. Easy Install
- **ASIS**: Package marketplace
- **TOBE**: No route exists
- **Impact**: Extension installation manual
- **Recommendation**: Create `/admin/easy-install` route

#### 11. Installed Layouts
- **ASIS**: Layout management interface
- **TOBE**: No route exists (but `/admin/layout` exists)
- **Impact**: May need route consolidation
- **Recommendation**: Merge into `/admin/layout` or create separate route

---

## Structural Differences

### ASIS Structure
```
Dashboard
├── Site
│   ├── Site Map Editor
│   └── Site Design
├── Member
│   ├── Member List
│   ├── Member Config
│   ├── Member Groups
│   └── Points
├── Content
│   ├── Board
│   ├── Page
│   ├── Document
│   ├── Comment
│   ├── File
│   ├── Poll
│   ├── Editor
│   ├── Spam Filter
│   └── Trash
├── Notifications (conditional)
│   ├── Mail/SMS/Push
│   └── Notification Center
├── Configuration
│   ├── System Config
│   ├── Admin Setup
│   └── Filebox
└── Advanced
    ├── Easy Install
    └── Installed Layouts
```

### TOBE Current Structure
```
Dashboard
├── Members
│   ├── All Members
│   ├── Groups
│   └── Permissions
├── Content
│   ├── Boards
│   ├── Pages
│   └── Media Library
├── Appearance
│   ├── Menus
│   ├── Widgets
│   ├── Layouts
│   └── Themes
├── Configuration
│   ├── General
│   ├── Translations
│   ├── Modules
│   └── Analytics
└── Logs
```

### Structural Recommendations

1. **Rename "Appearance" to "Site"** to match ASIS terminology
2. **Add "Notifications" group** for notification features
3. **Add "Advanced" group** for power user features
4. **Expand "Content" group** to include all content types
5. **Expand "Members" group** to include points
6. **Expand "Configuration" group** to include admin setup and filebox

---

## Permission System Gaps

### ASIS Permission Model
- Module-based permissions (e.g., `member.list`, `board.admin`)
- Role-based access control
- Permission inheritance from groups

### TOBE Current State
- Basic role check (`admin` role)
- No fine-grained permissions
- No permission management UI

### Required Permissions (37 total)

| Category | Permission Code | Description |
|----------|-----------------|-------------|
| Core | admin.access | Basic admin access |
| Members | member.access | Member management access |
| Members | member.list | View member list |
| Members | member.admin | Manage members |
| Members | group.list | View groups |
| Members | group.admin | Manage groups |
| Members | permission.admin | Manage permissions |
| Members | point.admin | Manage points |
| Content | content.access | Content management access |
| Content | board.admin | Manage boards |
| Content | page.admin | Manage pages |
| Content | document.list | View documents |
| Content | document.admin | Manage documents |
| Content | comment.list | View comments |
| Content | comment.admin | Manage comments |
| Content | file.list | View files |
| Content | file.admin | Manage files |
| Content | poll.admin | Manage polls |
| Content | editor.admin | Manage editor |
| Content | spamfilter.admin | Manage spam filter |
| Content | trash.list | View trash |
| Content | trash.admin | Manage trash |
| Site | site.access | Site management access |
| Site | menu.admin | Manage menus |
| Site | widget.admin | Manage widgets |
| Site | layout.admin | Manage layouts |
| Site | theme.admin | Manage themes |
| Notifications | notification.access | Notification access |
| Notifications | notification.admin | Manage notifications |
| Notifications | ncenterlite.admin | Manage notification center |
| Configuration | config.access | Configuration access |
| Configuration | admin.config | System configuration |
| Configuration | admin.setup | Admin interface setup |
| Configuration | filebox.admin | Manage filebox |
| Configuration | translation.admin | Manage translations |
| Configuration | module.admin | Manage modules |
| Configuration | analytics.view | View analytics |
| Advanced | advanced.access | Advanced features access |
| Advanced | autoinstall.admin | Use easy install |
| Logs | logs.access | View logs |

---

## i18n Gaps

### Current State
- Hardcoded English menu labels
- Korean labels in `titleKo` field (not used)

### Required Translations
- **Korean**: All 30 menu items
- **English**: All 30 menu items
- **Japanese**: All 30 menu items (optional)
- **Chinese**: All 30 menu items (optional)

### Translation Files Needed
- `locales/ko/admin.json`
- `locales/en/admin.json`
- `locales/ja/admin.json`
- `locales/zh/admin.json`

---

## Implementation Roadmap

### Phase 1: Critical Routes (Week 1)
1. `/admin/points` - Points management
2. `/admin/documents` - Document management
3. `/admin/comments` - Comment management

### Phase 2: Important Routes (Week 2)
4. `/admin/editor` - Editor configuration
5. `/admin/spam-filter` - Spam filter
6. `/admin/trash` - Trash management
7. `/admin/notifications` - Notification settings
8. `/admin/notification-center` - Notification center

### Phase 3: Low Priority Routes (Week 3)
9. `/admin/admin-setup` - Admin interface setup
10. `/admin/filebox` - Filebox management
11. `/admin/easy-install` - Easy install marketplace
12. `/admin/installed-layouts` - Installed layouts

### Phase 4: Permission System (Week 4)
1. Create permission constants
2. Implement permission checking
3. Create permission management UI
4. Add RLS policies

### Phase 5: i18n (Week 5)
1. Extract all menu labels
2. Create translation files
3. Implement locale switching
4. Test all languages

---

## Recommendations

### Immediate Actions
1. **Create SPEC-ADMIN-MENU-001** ✅ DONE
2. **Update AdminSidebar.tsx** with complete menu structure
3. **Create permission checking system**
4. **Implement missing routes** (start with critical)

### Short-term Actions
1. Add Korean translations for all menu items
2. Implement mobile responsive menu
3. Add active state tracking
4. Create placeholder pages for missing routes

### Long-term Actions
1. Implement full permission system
2. Add all missing functionality
3. Complete i18n for all languages
4. Add analytics for menu usage

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Missing critical features | High | High | Prioritize critical routes |
| Permission bypass | High | Medium | Implement RLS policies |
| Poor UX on mobile | Medium | Medium | Test on multiple devices |
| Translation errors | Low | Medium | Native speaker review |
| Performance issues | Medium | Low | Cache permissions |

---

## Conclusion

The TOBE admin menu system is 63% complete with significant gaps in content management and notifications. The most critical missing features are:

1. **Points system** - Member engagement feature
2. **Document management** - Content moderation
3. **Comment management** - Community management
4. **Notifications** - Communication features

Implementation should follow the roadmap with critical routes prioritized in Week 1. The permission system must be implemented before full production deployment to ensure security.

---

**Next Steps**:
1. Review SPEC-ADMIN-MENU-001 for detailed requirements
2. Begin Phase 1 implementation (critical routes)
3. Set up permission system architecture
4. Plan i18n implementation

**Related Documents**:
- SPEC: `.moai/specs/SPEC-ADMIN-MENU-001/spec.md`
- Plan: `.moai/specs/SPEC-ADMIN-MENU-001/plan.md`
- Acceptance: `.moai/specs/SPEC-ADMIN-MENU-001/acceptance.md`
- Screenshot: `screenshots/admin-with-cookies.png`
- JSON Data: `scripts/asis-admin-complete-2026-02-28T12-25-41.json`
