# SPEC-ADMIN-001 Slice H Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: Export/Import (REQ-ADMIN-091/092/093) + AdminFavorites (REQ-ADMIN-100/101)
Base: main = 1fcca56 (Slice G 완료 — WidgetRegistry + rx-widget, 495 tests)
Depends on: Slice A~G 완료

---

## Task H-1: 사이트 설정 내보내기 (REQ-ADMIN-091)

**Files (new)**:
- `apps/web/app/api/admin/export/route.ts`
- `apps/web/app/api/admin/export/route.test.ts`

**Route**: `GET /api/admin/export`
- 관리자 세션 확인 (비관리자 → 403)
- Prisma로 site, domains, menus(+menuItems), moduleInstances 조회
- JSON 직렬화 후 반환
- 헤더: `Content-Type: application/json`, `Content-Disposition: attachment; filename="rhymix-export-{date}.json"`

**Bundle 스키마**:
```ts
const ExportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  site: z.object({
    id: z.number(),
    defaultLanguage: z.string(),
    timeZone: z.string(),
  }).nullable(),
  domains: z.array(z.object({
    id: z.number(),
    hostname: z.string(),
    isDefault: z.boolean(),
    forceHttps: z.boolean(),
  })),
  menus: z.array(z.object({
    id: z.number(),
    title: z.string(),
    isAdminMenu: z.boolean(),
    items: z.array(z.object({
      id: z.number(),
      parentId: z.number().nullable(),
      title: z.string(),
      url: z.string().nullable().optional(),
      listOrder: z.number(),
    })),
  })),
  moduleInstances: z.array(z.object({
    id: z.number(),
    mid: z.string(),
    moduleCode: z.string(),
    name: z.string().optional(),
  })),
})
```

**Tests (RED first)**:
- H-1-1: 관리자 → 200 + application/json + Content-Disposition attachment
- H-1-2: 비관리자 → 403
- H-1-3: 번들에 version:1, exportedAt, site, domains, menus, moduleInstances 포함

---

## Task H-2: 사이트 설정 가져오기 (REQ-ADMIN-092/093)

**Files (new)**:
- `apps/web/app/api/admin/import/route.ts`
- `apps/web/app/api/admin/import/route.test.ts`

**Route**: `POST /api/admin/import?dryRun=true|false`
- 관리자 세션 확인 (비관리자 → 403)
- Body: ExportBundle JSON
- 스키마 검증 실패 → 400 + 오류 메시지
- dryRun=true → 충돌 미리보기 반환, DB 변경 없음
- dryRun=false → `$transaction` 으로 적용, 실패 시 롤백

**충돌 분류 로직**:
```ts
type ConflictItem = {
  type: 'domain' | 'menu' | 'moduleInstance'
  id: number
  action: 'create' | 'update' | 'skip'
}
```
- domain: hostname 기준 — 없으면 create, 있으면 update
- moduleInstance: mid 기준 — 없으면 create, 있으면 skip (mid 충돌 방지)

**Tests (RED first)**:
- H-2-1: 비관리자 → 403
- H-2-2: 잘못된 스키마 → 400 + 오류 메시지
- H-2-3: dryRun=true → DB 변경 없이 미리보기 반환 (create/update/skip 카운트)
- H-2-4: dryRun=false → DB에 레코드 생성 + 200 응답

---

## Task H-3: AdminFavorite tRPC + 사이드바 (REQ-ADMIN-100/101)

**Files (new)**:
- `apps/web/server/api/routers/admin/favorite.ts`
- `apps/web/server/api/routers/admin/favorite.test.ts`

**Files (modify)**:
- `apps/web/server/api/routers/admin/index.ts` (+favorite 라우터)
- `apps/web/app/admin/layout.tsx` (getServerCaller로 즐겨찾기 조회 → AdminSidebar props)
- `apps/web/app/admin/layout.test.tsx` (기존 테스트 업데이트)
- `apps/web/components/admin/AdminSidebar.tsx` (favorites?: AdminFavorite[] props 추가)

**tRPC procedures**:
```ts
admin.favorite.list()
  → AdminFavorite[]  // ctx.session.user.id 기준, listOrder ASC

admin.favorite.add({ label: string, href: string, icon?: string })
  → AdminFavorite

admin.favorite.remove({ id: number })
  → { deleted: true }

admin.favorite.reorder({ items: Array<{ id: number; listOrder: number }> })
  → { updated: number }
```

**Tests (RED first)**:
- H-3-1: favorite.list → 현재 관리자 즐겨찾기만 반환 (다른 user 제외)
- H-3-2: favorite.add → DB 생성 + 반환
- H-3-3: favorite.remove → DB 삭제
- H-3-4: favorite.reorder → 단일 $transaction으로 listOrder 갱신
- H-3-5: 비관리자 favorite.list → UNAUTHORIZED
- H-3-6: 비관리자 favorite.add → UNAUTHORIZED

**AdminSidebar 변경**:
```ts
interface AdminSidebarProps {
  favorites?: Array<{ id: number; label: string; href: string; icon?: string }>
}
```
즐겨찾기가 있으면 "즐겨찾기" 섹션을 NAV 최상단에 추가.

**layout.tsx 변경**:
```ts
const caller = await getServerCaller()
const favorites = await caller.admin.favorite.list().catch(() => [])
// <AdminSidebar favorites={favorites} />
```

---

## Acceptance Criteria (Slice H)

- **AC-H-1-1**: `GET /api/admin/export` 관리자 → 200 + JSON + Content-Disposition
- **AC-H-1-2**: 비관리자 → 403
- **AC-H-2-1**: 잘못된 번들 → 400
- **AC-H-2-2**: dryRun=true → DB 변경 없이 미리보기
- **AC-H-2-3**: dryRun=false → DB 적용 + 200
- **AC-H-3-1**: `admin.favorite.list` → 현재 관리자 즐겨찾기만
- **AC-H-3-2**: `admin.favorite.add/remove/reorder` 정상 동작
- **AC-H-3-3**: 비관리자 → UNAUTHORIZED
- 기존 495 테스트 회귀 없음

---

## Deferred

- REQ-ADMIN-090: 모듈 인스턴스 일괄 작업 UI (체크박스 멀티셀렉트)
- REQ-ADMIN-023: 2FA 강제
- REQ-ADMIN-031: cross-level DnD

Version: 1.0.0
Created: 2026-05-17
