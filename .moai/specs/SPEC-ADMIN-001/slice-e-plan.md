# SPEC-ADMIN-001 Slice E Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: DnD reorder (REQ-ADMIN-031) + CSV export (REQ-ADMIN-072 완결) + Site/Domain 설정 (REQ-ADMIN-050/051/052) + Member 관리 (US-7)
Base: main = c143754 (Slice D 완료 — auditLogger + Menu/MenuItem CRUD + AdminLog 조회)
Depends on: Slice A (스키마), Slice B (tRPC 인프라 + getServerCaller), Slice C (Admin Shell + shadcn/ui), Slice D (auditLogger 미들웨어 + Menu/MenuItem/Log 라우터)

---

## Pre-Flight Findings

### Q1: React Query Client 인프라 설정
`@tanstack/react-query` v5, `@trpc/react-query` v11 이미 설치되어 있으나, TRPCProvider (클라이언트 설정)가 없다. DnD optimistic update를 위해 클라이언트 사이드 tRPC가 필요하다.

**결정**: `apps/web/providers/TRPCProvider.tsx` 신규 생성. `apps/web/app/layout.tsx`에 `<TRPCProvider>` 래핑 추가.

### Q2: DnD 라이브러리 선택
`@dnd-kit/core` + `@dnd-kit/sortable` — 현재 Shadcn/UI + React 19와 호환 최적. flat sortable로 시작해 트리를 parentId로 관리. `@dnd-kit/utilities`도 함께 설치.

**결정**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 설치. 단순 flat-list DnD로 same-level reorder 구현 (cross-level 이동은 별도 슬라이스).

### Q3: CSV Export 구현 방식
tRPC는 스트리밍 응답에 부적합. Next.js Route Handler(`GET /api/admin/logs/export`)가 더 적합. 외부 CSV 패키지 없이 수동 CSV 빌드.

**결정**: Route Handler 방식. 기존 `admin.log.list` 필터 파라미터를 query string으로 받아 동일 로직 재사용.

### Q4: Member Management — auth 패키지 위임 범위
`changeUserStatus`, `softDeleteUser`는 `packages/auth`에 완전 구현됨. admin.user tRPC는 authorization 레이어 + auth 함수 호출만 담당.

**결정**: admin.user.update → changeUserStatus 위임. admin.user.bulk (delete action) → softDeleteUser 반복 위임. DeniedIdentifier는 Prisma 직접.

### Q5: Site/Domain 스키마 확인
Site (id, name, defaultLanguage, defaultTimezone, contactEmail, settings Json) + Domain (id, siteId, hostname, isDefault, forceHttps, indexModuleInstanceId 등) — 모두 기존 스키마에 존재. 신규 migration 불필요.

---

## Task Decomposition

### Task E-1: TRPCProvider 클라이언트 설정 (prerequisite)
- **Files (new)**: `apps/web/providers/TRPCProvider.tsx`
- **Files (modify)**: `apps/web/app/layout.tsx`
- **Description**: `createTRPCReact`, `QueryClient`, `TRPCClientProvider`를 조합한 클라이언트 Provider. DnD optimistic update + 향후 클라이언트 tRPC 호출 기반.
- **Tests**: `apps/web/providers/TRPCProvider.test.tsx` — Provider가 children을 렌더하는 최소 smoke test

### Task E-2: admin.menuItem.reorder tRPC + DnD UI
- **Files (new)**: `apps/web/components/admin/MenuItemDnDTree.tsx`, `apps/web/components/admin/MenuItemDnDTree.test.tsx`
- **Files (modify)**: `apps/web/server/api/routers/admin/menu-item.ts` (reorder procedure 추가), `apps/web/server/api/routers/admin/menu-item.test.ts` (reorder 테스트), `apps/web/app/admin/menu/[id]/page.tsx` (DnD 컴포넌트 교체)
- **tRPC procedure**:
  ```ts
  admin.menuItem.reorder({
    menuId: number,
    items: Array<{ id: number; parentId: number | null; listOrder: number }>
  }) → { updated: number }
  ```
- **Transaction**: `prisma.$transaction(items.map(item => prisma.menuItem.update(...)))`
- **Cache**: `revalidateTag(`menu:${menuId}`)` (Next.js revalidateTag)
- **Tests (RED first)**:
  - reorder 성공 — items 순서대로 listOrder 갱신
  - 단일 트랜잭션 보장 — 중간 실패 시 모두 롤백
  - 빈 items → 즉시 반환 (no-op)
  - menuId 없음 → NOT_FOUND

### Task E-3: AdminLog CSV Export
- **Files (new)**: `apps/web/app/api/admin/logs/export/route.ts`, `apps/web/app/api/admin/logs/export/route.test.ts`
- **Files (modify)**: `apps/web/app/admin/logs/page.tsx` (CSV 내보내기 버튼 + 링크)
- **Route Handler**: `GET /api/admin/logs/export?actorId=&action=&target=&from=&to=&ip=`
  - Response: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="admin-logs-{date}.csv"`
  - Headers: `id,actorId,action,target,ip,createdAt`
  - adminSession guard: 비관리자 → 403
- **Tests (RED first)**:
  - 관리자 → 200 + CSV MIME + Content-Disposition 헤더
  - 비관리자 → 403
  - actorId 필터 → 해당 actor 행만 포함

### Task E-4: Site/Domain Settings tRPC + UI
- **Files (new)**: `apps/web/server/api/routers/admin/site.ts`, `apps/web/server/api/routers/admin/site.test.ts`, `apps/web/app/admin/settings/site/page.tsx`, `apps/web/app/admin/settings/site/page.test.tsx`
- **Files (modify)**: `apps/web/server/api/routers/admin/index.ts` (site 라우터 추가)
- **tRPC procedures**:
  - `admin.site.get()` — 현재 사이트 설정 반환
  - `admin.site.update({ name?, contactEmail?, defaultLanguage?, defaultTimezone?, settings? })` — auditLogger 자동 기록
  - `admin.domain.list()` — 사이트의 도메인 목록
  - `admin.domain.update(id, { forceHttps?, defaultLanguage?, ... })` — auditLogger 자동 기록
- **Tests (RED first)**:
  - site.get → 현재 Site 레코드 반환
  - site.update → DB 갱신 + AdminLog 기록 (auditLogger 자동)
  - site.update (비관리자) → UNAUTHORIZED
  - domain.list → 사이트 도메인 목록

### Task E-5: Member Management tRPC + UI
- **Files (new)**: `apps/web/server/api/routers/admin/user.ts`, `apps/web/server/api/routers/admin/user.test.ts`, `apps/web/app/admin/members/page.tsx`, `apps/web/app/admin/members/page.test.tsx`
- **Files (modify)**: `apps/web/server/api/routers/admin/index.ts` (user 라우터 추가), `apps/web/app/admin/layout.tsx` (사이드바에 Members 링크)
- **tRPC procedures**:
  - `admin.user.list({ q?, status?, page?, pageSize? })` — User 목록 + 총 count
  - `admin.user.get(userId)` — 단일 User + groups
  - `admin.user.update(userId, { status })` → `changeUserStatus` 위임
  - `admin.user.bulk({ ids, action: 'suspend'|'delete' })` → 반복 위임
  - `admin.user.deniedList.list({ type? })` — DeniedIdentifier 목록
  - `admin.user.deniedList.add({ type, value })` — DeniedIdentifier 추가
  - `admin.user.deniedList.remove(id)` — DeniedIdentifier 삭제
- **Tests (RED first)**:
  - user.list → 페이지네이션 결과 반환
  - user.list (q 검색) → userId/email/nickName 포함 행만
  - user.update (SUSPENDED) → changeUserStatus 호출 증거
  - user.bulk → 각 id에 대해 changeUserStatus 호출
  - deniedList.add → DeniedIdentifier 행 생성
  - deniedList.remove → DeniedIdentifier 행 삭제
  - 비관리자 → UNAUTHORIZED

---

## File Modification Summary

| 파일 | 상태 | 담당 태스크 |
|------|------|------------|
| `apps/web/providers/TRPCProvider.tsx` | new | E-1 |
| `apps/web/providers/TRPCProvider.test.tsx` | new | E-1 |
| `apps/web/app/layout.tsx` | edit | E-1 |
| `apps/web/server/api/routers/admin/menu-item.ts` | edit (+reorder) | E-2 |
| `apps/web/server/api/routers/admin/menu-item.test.ts` | edit (+reorder tests) | E-2 |
| `apps/web/components/admin/MenuItemDnDTree.tsx` | new | E-2 |
| `apps/web/components/admin/MenuItemDnDTree.test.tsx` | new | E-2 |
| `apps/web/app/admin/menu/[id]/page.tsx` | edit | E-2 |
| `apps/web/app/api/admin/logs/export/route.ts` | new | E-3 |
| `apps/web/app/api/admin/logs/export/route.test.ts` | new | E-3 |
| `apps/web/app/admin/logs/page.tsx` | edit (+CSV button) | E-3 |
| `apps/web/server/api/routers/admin/site.ts` | new | E-4 |
| `apps/web/server/api/routers/admin/site.test.ts` | new | E-4 |
| `apps/web/app/admin/settings/site/page.tsx` | new | E-4 |
| `apps/web/app/admin/settings/site/page.test.tsx` | new | E-4 |
| `apps/web/server/api/routers/admin/user.ts` | new | E-5 |
| `apps/web/server/api/routers/admin/user.test.ts` | new | E-5 |
| `apps/web/app/admin/members/page.tsx` | new | E-5 |
| `apps/web/app/admin/members/page.test.tsx` | new | E-5 |
| `apps/web/server/api/routers/admin/index.ts` | edit (+site,user) | E-4,E-5 |
| `apps/web/app/admin/layout.tsx` | edit (+Members link) | E-5 |

---

## Acceptance Criteria (Slice E)

- **AC-E-1-1**: `admin.menuItem.reorder` 호출 시 단일 트랜잭션으로 listOrder 갱신 ✓
- **AC-E-1-2**: 중간 실패 시 모든 갱신 롤백 ✓
- **AC-E-2-1**: `/api/admin/logs/export` → 200 + text/csv + Content-Disposition ✓
- **AC-E-2-2**: 비관리자 → 403 ✓
- **AC-E-3-1**: `admin.site.update` → DB 갱신 + AdminLog 자동 기록 ✓
- **AC-E-3-2**: 비관리자 site.update → UNAUTHORIZED ✓
- **AC-E-4-1**: `admin.user.list` 페이지네이션 정상 ✓
- **AC-E-4-2**: `admin.user.update(SUSPENDED)` → changeUserStatus 위임 ✓
- **AC-E-4-3**: `admin.user.deniedList.add` → DeniedIdentifier 생성 ✓
- **AC-E-4-4**: 비관리자 user.* → UNAUTHORIZED ✓

---

## Dependencies to Install

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities -F @rhymix-ts/web
```

No other new packages needed.

---

## Deferred to Slice F+

- REQ-ADMIN-031 cross-level DnD (parent 변경 드래그) — E에서는 same-level listOrder만
- REQ-ADMIN-080/081 System health dashboard
- REQ-ADMIN-040-042 Widget system
- REQ-ADMIN-060-063 Cache management UI
- REQ-ADMIN-090-093 Import/export
- REQ-ADMIN-100-101 Admin favorites
- REQ-ADMIN-023 2FA 강제

---

Version: 1.0.0
Created: 2026-05-16
