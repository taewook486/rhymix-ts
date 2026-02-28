# Admin Menu Migration Matrix

**Quick Reference for ASIS → TOBE Migration**

---

## Menu Comparison Matrix

| ASIS Korean | ASIS English | ASIS act | TOBE Route | Status |
|-------------|--------------|----------|------------|--------|
| **Dashboard** | | | | |
| 대시보드 | Dashboard | (default) | `/admin` | ✅ |
| **Site** | | | | |
| 사이트 메뉴 편집 | Site Map Editor | dispMenuAdminSiteMap | `/admin/menus` | ✅ |
| 사이트 디자인 설정 | Site Design | dispMenuAdminSiteDesign | `/admin/themes` | ✅ |
| **Member** | | | | |
| 회원 목록 | Member List | dispMemberAdminList | `/admin/members` | ✅ |
| 회원 설정 | Member Config | dispMemberAdminConfig | `/admin/settings` | ✅ |
| 회원 그룹 | Member Groups | dispMemberAdminGroupList | `/admin/groups` | ✅ |
| 포인트 | Points | dispPointAdminConfig | `/admin/points` | ❌ CREATE |
| **Content** | | | | |
| 게시판 | Board | dispBoardAdminContent | `/admin/boards` | ✅ |
| 페이지 | Page | dispPageAdminContent | `/admin/pages` | ✅ |
| 문서 | Document | dispDocumentAdminList | `/admin/documents` | ❌ CREATE |
| 댓글 | Comment | dispCommentAdminList | `/admin/comments` | ❌ CREATE |
| 파일 | File | dispFileAdminList | `/admin/media` | ✅ |
| 설문 | Poll | dispPollAdminList | `/admin/polls` | ✅ |
| 에디터 | Editor | dispEditorAdminIndex | `/admin/editor` | ❌ CREATE |
| 스팸필터 | Spam Filter | dispSpamfilterAdminDeniedIPList | `/admin/spam-filter` | ❌ CREATE |
| 휴지통 | Trash | dispTrashAdminList | `/admin/trash` | ❌ CREATE |
| **Notifications** | | | | |
| 메일/SMS/푸시 | Mail/SMS/Push | dispAdvanced_mailerAdminConfig | `/admin/notifications` | ❌ CREATE |
| 알림 센터 | Notification Center | dispNcenterliteAdminConfig | `/admin/notification-center` | ❌ CREATE |
| **Configuration** | | | | |
| 시스템 설정 | System Config | dispAdminConfigGeneral | `/admin/settings` | ✅ |
| 관리자 화면 설정 | Admin Setup | dispAdminSetup | `/admin/admin-setup` | ❌ CREATE |
| 파일박스 | Filebox | dispModuleAdminFileBox | `/admin/filebox` | ❌ CREATE |
| **Advanced** | | | | |
| 쉬운 설치 | Easy Install | dispAutoinstallAdminIndex | `/admin/easy-install` | ❌ CREATE |
| 설치된 레이아웃 | Installed Layouts | dispLayoutAdminInstalledList | `/admin/installed-layouts` | ❌ CREATE |
| **TOBE Only** | | | | |
| 권한 설정 | Permissions | N/A | `/admin/permissions` | ✅ NEW |
| 위젯 | Widgets | N/A | `/admin/widgets` | ✅ NEW |
| 레이아웃 | Layouts | N/A | `/admin/layout` | ✅ NEW |
| 다국어 | Translations | N/A | `/admin/translations` | ✅ NEW |
| 모듈 | Modules | N/A | `/admin/modules` | ✅ NEW |
| 분석 | Analytics | N/A | `/admin/analytics` | ✅ NEW |
| 로그 | Logs | N/A | `/admin/logs` | ✅ NEW |

---

## Coverage Summary

| Category | ASIS Count | TOBE Count | Coverage | Gap |
|----------|------------|------------|----------|-----|
| Dashboard | 1 | 1 | 100% | 0 |
| Site | 2 | 2 | 100% | 0 |
| Member | 4 | 3 | 75% | 1 |
| Content | 9 | 4 | 44% | 5 |
| Notifications | 2 | 0 | 0% | 2 |
| Configuration | 3 | 1 | 33% | 2 |
| Advanced | 2 | 0 | 0% | 2 |
| **Total** | **23** | **11** | **48%** | **12** |

*Note: TOBE has 8 additional routes not in ASIS*

---

## Missing Routes Priority

### 🔴 Critical (Implement First)
1. `/admin/points` - 포인트 (Points)
2. `/admin/documents` - 문서 (Documents)
3. `/admin/comments` - 댓글 (Comments)

### 🟡 Important (Implement Second)
4. `/admin/editor` - 에디터 (Editor)
5. `/admin/spam-filter` - 스팸필터 (Spam Filter)
6. `/admin/trash` - 휴지통 (Trash)
7. `/admin/notifications` - 알림 설정 (Notifications)
8. `/admin/notification-center` - 알림 센터 (Notification Center)

### 🟢 Low Priority (Implement Last)
9. `/admin/admin-setup` - 관리자 설정 (Admin Setup)
10. `/admin/filebox` - 파일박스 (Filebox)
11. `/admin/easy-install` - 쉬운 설치 (Easy Install)
12. `/admin/installed-layouts` - 설치된 레이아웃 (Installed Layouts)

---

## Quick Commands

### Create Missing Route
```bash
# Example: Create points route
mkdir -p app/\(admin\)/admin/points
touch app/\(admin\)/admin/points/page.tsx
```

### Page Template
```typescript
// app/(admin)/admin/points/page.tsx
export default function PointsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Points Management</h1>
      <p className="text-muted-foreground">
        포인트 시스템 설정 및 관리
      </p>
      {/* TODO: Implement points management */}
    </div>
  )
}
```

---

## Files Modified

### SPEC Documents
- ✅ `.moai/specs/SPEC-ADMIN-MENU-001/spec.md`
- ✅ `.moai/specs/SPEC-ADMIN-MENU-001/plan.md`
- ✅ `.moai/specs/SPEC-ADMIN-MENU-001/acceptance.md`

### Reports
- ✅ `.moai/reports/admin-menu-gap-analysis-2026-02-28.md`
- ✅ `.moai/reports/admin-menu-migration-matrix-2026-02-28.md` (this file)

### Source Files (To Be Modified)
- ⏳ `components/admin/AdminSidebar.tsx`
- ⏳ `lib/permissions/admin-menu.ts` (create)
- ⏳ `hooks/useMenuPermissions.ts` (create)
- ⏳ `locales/ko/admin.json` (create)
- ⏳ `locales/en/admin.json` (create)

---

## Next Steps

1. ✅ **SPEC Created**: SPEC-ADMIN-MENU-001
2. ⏳ **Update Sidebar**: Modify `AdminSidebar.tsx`
3. ⏳ **Create Permissions**: Implement permission system
4. ⏳ **Add Routes**: Create 12 missing routes
5. ⏳ **Add i18n**: Implement Korean/English translations
6. ⏳ **Test**: Verify all menu items work

---

**Last Updated**: 2026-02-28T12:30:00Z
