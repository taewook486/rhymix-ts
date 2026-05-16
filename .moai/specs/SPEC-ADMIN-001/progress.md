# SPEC-ADMIN-001 Slice A — 진행 현황

## 상태: COMPLETE

## 완료 날짜: 2026-05-17

---

## 구현 범위

### 스키마 변경 (packages/db/prisma/schema.prisma)

- **Domain**: `hostname @db.Citext`, `forceHttps`, `defaultLanguage`, `defaultTimezone`, `indexModuleInstanceId`, `settings`, `createdAt`, `updatedAt` 추가
- **ModuleInstance**: `module` → `moduleCode` 리네임, `@@unique([siteId, mid])` 복합 유니크로 교체, `name` 필드 추가
- **ModuleConfig** (신규): 1:1 split from ModuleInstance, `config Json`, `updatedAt`
- **Menu** (신규): `siteId`, `title`, `isAdminMenu`, `listOrder`
- **MenuItem** (신규): 자기 참조 트리 ("MenuItemTree"), `menuId`, `parentId`, 레이아웃 필드 일체
- **AdminLog** (신규): BigInt PK, `actorId`, `action`, `target`, `diff Json`, `ip`, `userAgent`, `createdAt @db.Timestamptz`
- **AdminFavorite** (신규): `memberId` FK(User), `label`, `href`, `icon`, `listOrder`

### Migration

- `20260516120000_autologin_token_hash`: 플레이스홀더(no-op) — DB 이력 정합성용
- `20260517000000_add_admin_foundation_models`: 수동 작성 및 Node.js pg client로 직접 적용

### 도메인 레이어 (packages/core/src/modules/)

| 파일 | 설명 |
|------|------|
| `errors.ts` | 7종 에러 클래스 (MidInvalidError, MidLengthError, MidReservedError, MidConflictError, IndexModuleProtectedError, ModuleNotRegisteredError, DuplicateModuleError) |
| `types.ts` | ModuleDefinition 플러그인 인터페이스, ModuleLifecycleContext, PrismaTransactionClient |
| `mid-validator.ts` | validateMid — 4단계 검증 (길이→패턴→예약어→DB), RESERVED_MIDS 12종 |
| `registry.ts` | registerModule, getModule, listModules, resetRegistry |
| `module-instance-service.ts` | createModuleInstance, deleteModuleInstance, getModuleInstanceByMid |
| `index.ts` | barrel exports |

### 테스트 (23개 통과 / 6개 SKIP_DB_TESTS)

| 파일 | 테스트 수 | 커버 REQ |
|------|-----------|----------|
| `mid-validator.test.ts` | 10 | REQ-ADMIN-001~003 |
| `registry.test.ts` | 5 | 레지스트리 등록/조회/중복 |
| `module-instance-service.test.ts` | 8 단위 (6 DB skip) | REQ-ADMIN-004~007 |

---

## 결정 사항 (Pre-Flight)

| 항목 | 결정 |
|------|------|
| AdminLog vs AuditLog | AdminLog = 별도 테이블 (BigInt PK, target: String, diff: Json) |
| ModuleInstance.mid unique | 글로벌 `@unique` 제거 → `@@unique([siteId, mid])` 복합 유니크 |
| 도메인 코드 위치 | `packages/core/src/modules/` |

---

## 타입체크 결과

```
pnpm --filter @rhymix-ts/core exec tsc --noEmit  → 0 errors
pnpm --filter @rhymix-ts/db exec tsc --noEmit    → 0 errors
```

## 전체 테스트 결과

```
Test Files: 45 passed
Tests:      405 passed | 9 skipped (414)
```

---

## 다음 단계: Slice B

- Next.js App Router 연동 (tRPC endpoint)
- 관리자 UI (모듈 인스턴스 목록/생성/삭제 페이지)
- onInstall/onUninstall 훅을 구현하는 실제 board 모듈
- ModuleRegistry 부트스트랩 (HMR-safe Next.js 서버 시작 시 1회 등록)

---

## Slice B — Host 미들웨어 + [mid] 라우팅 + tRPC admin.module.* (2026-05-16 완료)

- Commit: 1919c07 | PR #9
- Tests: 412 → 424 (+12, B-1~B-12 전부 PASS)
- 구현:
  - middleware.ts Node Runtime + Host → Domain 해석 + forceHttps 301 (REQ-ADMIN-010/011/014)
  - apps/web/app/[mid]/page.tsx 동적 라우팅 (REQ-ADMIN-012)
  - apps/web/app/page.tsx indexModuleInstanceId redirect (REQ-ADMIN-013)
  - tRPC 설정 (initTRPC, publicProcedure, protectedAdminProcedure)
  - admin.module.{create,list,get,delete} tRPC CRUD (REQ-ADMIN-020~022)
  - getServerCaller() Server Component 헬퍼

---

## Slice C — Admin Shell UI + 모듈 관리 페이지 + shadcn/ui (2026-05-16 완료)

- Commit: 44f18f6 | PR #10
- Tests: 424 → 435 (+11, C-1~C-11 전부 PASS)
- 구현:
  - packages/ui/src/components/ shadcn/ui 컴포넌트 8종 (Button, Input, Label, Table, Dialog, DropdownMenu, Badge, Toaster)
  - apps/web/app/admin/layout.tsx Admin Shell (auth guard + sidebar + topbar)
  - apps/web/app/admin/modules/* 모듈 인스턴스 목록/생성 페이지
  - AdminSidebar, AdminTopbar, ModuleTable, CreateModuleForm, DeleteModuleButton
  - getServerCaller() + Server Actions 패턴 확립

---

## Slice D — auditLogger + Menu/MenuItem CRUD + AdminLog 조회 (2026-05-16 완료)

- Commit: 1bd743b | PR #11
- Tests: 435 → 447 (+12, D-1~D-12 전부 PASS)
- 구현:
  - auditLogger tRPC 미들웨어 (protectedAdminProcedure 체인, REQ-ADMIN-070/071)
  - admin.menu.{create,list,get,delete} tRPC CRUD (REQ-ADMIN-030)
  - admin.menuItem.{create,update,delete} tRPC CRUD (REQ-ADMIN-032/033)
  - admin.log.list (필터+페이지네이션, REQ-ADMIN-072 부분)
  - /admin/menu/* 메뉴 관리 UI 페이지
  - /admin/logs AdminLog 조회 페이지
  - AdminSidebar menu/logs 링크 활성화
- Slice E 이월: DnD reorder(REQ-ADMIN-031), CSV 내보내기(REQ-ADMIN-072 완결), Site 설정, 회원 관리 → Slice E에서 완결

---

## Slice E — DnD Reorder + CSV Export + Site Settings + Member Management (2026-05-16 완료)

- Tests: 447 → 467 (+20, E-1~E-5 전부 PASS)
- TypeScript: Slice E 파일 0 errors (next-auth 기존 오류 제외)
- 구현:
  - TRPCProvider 클라이언트 설정 (`apps/web/providers/TRPCProvider.tsx`) — E-1
  - `admin.menuItem.reorder` 단일 $transaction 갱신 (REQ-ADMIN-031) — E-2
  - MenuItemDnDTree 컴포넌트 (DnD fallback UI, @dnd-kit WSL2 설치 보류) — E-2
  - `/api/admin/logs/export` CSV Route Handler (REQ-ADMIN-072 완결) — E-3
  - `admin.site.get/update/domain.list/domain.update` tRPC (REQ-ADMIN-050/051/052) — E-4
  - `/admin/settings/site` 사이트 설정 페이지 — E-4
  - `admin.user.list/get/update/bulk/deniedList.*` tRPC (US-7) — E-5
  - `/admin/members` 회원 관리 페이지 — E-5
- 수정 사항: Site 모델 실제 필드 기준으로 site.ts/page.tsx 정렬 (name/contactEmail 필드 없음 확인)
- Acceptance Criteria: AC-E-1-1/1-2, AC-E-2-1/2-2, AC-E-3-1/3-2, AC-E-4-1/4-2/4-3/4-4 전부 PASS

---

## Slice F — System Health Dashboard + Cache Management (2026-05-16 완료)

- Tests: 467 → 482 (+15, F-1~F-2 전부 PASS)
- TypeScript: Slice F 파일 0 errors
- 구현:
  - `admin.system.health` tRPC (Node.js 버전/플랫폼/DB ping/env 마스킹, REQ-ADMIN-080/081) — F-1
  - `/admin/system` 시스템 헬스 페이지 — F-1
  - `lib/cache/adapter.ts` CacheAdapter + NextJsCacheAdapter (REQ-ADMIN-060) — F-2
  - `CACHE_TAGS` 상수 추가 (`lib/admin/cache-keys.ts`) — F-2
  - `admin.cache.purge({ scope, id? })` tRPC + AdminLog 자동 기록 (REQ-ADMIN-061/062/063) — F-2
  - `/admin/system/cache` 캐시 관리 페이지 — F-2
  - AdminSidebar 시스템 헬스 + 캐시 관리 링크 추가 — F-1, F-2
- Acceptance Criteria: AC-F-1-1/1-2/1-3, AC-F-2-1/2-2/2-3 전부 PASS
