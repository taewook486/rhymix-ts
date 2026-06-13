---
id: SPEC-ADMIN-EXTRAS-001-plan
title: Admin Extras — Implementation Plan
version: 1.0.0
status: in-progress
created: 2026-05-30
updated: 2026-06-14
author: MoAI manager-spec
parent: SPEC-ADMIN-EXTRAS-001
language: ko
---

# SPEC-ADMIN-EXTRAS-001 Implementation Plan

본 문서는 SPEC-ADMIN-EXTRAS-001의 구현 계획을 정의한다. SPEC 본문(`spec.md`)은 **무엇/왜**를 다루고, 본 문서는 **어떻게/어디에/어떤 순서로**를 다룬다.

---

## 1. Slice 구성

| Slice | 목표 | 종속성 | EARS 범위 |
|---|---|---|---|
| A | Export/Import + AdminFavorites | ADMIN-001 Slice A~F ✅ | REQ-001~037, REQ-090~091 |
| B | 잔여 REQ — 2FA + DnD + Preset + IP 필터 + 일괄 작업 | AUTH-001, WIDGET-001, ADMIN-001 Slice F | REQ-040~086, REQ-092~095 |

Slice A → Slice B 순서. Slice B의 일부는 Slice A와 병행 가능 (AdminFavorite UI 와 잔여 admin 페이지 확장이 다른 파일을 건드림).

---

## 2. File Plan

### 2.1 신규 파일

#### `packages/admin/` (순수 로직 — Next.js 의존 없음, Vitest 단위 테스트 대상)

| 경로 | 책임 | Slice | 종속 REQ |
|---|---|---|---|
| `packages/admin/src/export/bundle-schema.ts` | `adminExportBundleSchema` Zod + `SUPPORTED_EXPORT_FORMAT_RANGE` 상수 | A | REQ-002, 016, 017 |
| `packages/admin/src/export/bundle-schema.test.ts` | 스키마 정의 단위 테스트 | A | — |
| `packages/admin/src/export/serializer.ts` | 메뉴/모듈/문서/댓글/설정 직렬화 + redaction + exportKey 발급 | A | REQ-005~011 |
| `packages/admin/src/export/serializer.test.ts` | 직렬화 + redaction 단위 테스트 | A | REQ-091 |
| `packages/admin/src/import/deserializer.ts` | 스키마 검증 + 버전 체크 + dryRun plan 생성 | A | REQ-015~019, 022, 023 |
| `packages/admin/src/import/deserializer.test.ts` | dryRun + conflict report 테스트 | A | — |
| `packages/admin/src/import/apply.ts` | 단일 트랜잭션 apply + 롤백 + cache invalidation + AdminLog | A | REQ-020, 021, 025, 026, 029 |
| `packages/admin/src/import/apply.test.ts` | 트랜잭션 롤백 + 부분 실패 시 전체 무효 테스트 | A | — |
| `packages/admin/src/import/round-trip.test.ts` | export → import round-trip 테스트 (AC-A2) | A | REQ-091 |
| `packages/admin/src/favorites/actions.ts` | addFavorite, removeFavorite, reorderFavorites + href 검증 | A | REQ-031~037 |
| `packages/admin/src/favorites/actions.test.ts` | CRUD + href 검증 + 최대 개수 가드 테스트 | A | — |
| `packages/admin/src/security/two-factor-gate.ts` | `getSiteAdminTwoFactorPolicy` + 강화된 `requireAdmin2FAIfEnabled` | B | REQ-040~047 |
| `packages/admin/src/security/two-factor-gate.test.ts` | 4 상태 매트릭스 테스트 (AC-B1) | B | REQ-092 |
| `packages/admin/src/menu/reorder.ts` | cross-level reorder ops 빌더 + 사이클 검출 + depth 검증 | B | REQ-050~055 |
| `packages/admin/src/menu/reorder.test.ts` | 사이클 검출 + 3-level cross 이동 테스트 | B | REQ-094 |
| `packages/admin/src/logs/ip-filter.ts` | ipaddr.js 기반 IP/CIDR 매칭 + 파서 + 422 처리 | B | REQ-070~075 |
| `packages/admin/src/logs/ip-filter.test.ts` | CIDR 매트릭스 테스트 (AC-B2) | B | REQ-093 |
| `packages/admin/src/modules/bulk.ts` | bulk enable/disable/delete + 인덱스 가드 + 트랜잭션 | B | REQ-080~086 |
| `packages/admin/src/modules/bulk.test.ts` | 인덱스 가드 + 롤백 테스트 (AC-B3) | B | — |
| `packages/admin/src/widgets/preset.ts` | WidgetInstance 프리셋 schema diff + 재검증 헬퍼 | B | REQ-060~065 |
| `packages/admin/src/widgets/preset.test.ts` | schema drift 시나리오 테스트 | B | — |

#### `apps/web/server/api/admin/` (tRPC 라우터)

| 경로 | 책임 | Slice |
|---|---|---|
| `apps/web/server/api/admin/export.ts` | tRPC `admin.export.create` mutation | A |
| `apps/web/server/api/admin/import.ts` | tRPC `admin.import.dryRun`, `admin.import.apply` mutation | A |
| `apps/web/server/api/admin/favorite.ts` | tRPC `admin.favorite.list/add/remove/reorder` | A |

#### `apps/web/app/admin/` (UI 페이지)

| 경로 | 책임 | Slice |
|---|---|---|
| `apps/web/app/admin/settings/export/page.tsx` | Export 선택 폼 + 다운로드 트리거 | A |
| `apps/web/app/admin/settings/export/page.test.tsx` | RSC 렌더 + 폼 인터랙션 테스트 | A |
| `apps/web/app/admin/settings/import/page.tsx` | 업로드 폼 + dryRun 미리보기 + decision UI + apply | A |
| `apps/web/app/admin/settings/import/page.test.tsx` | 충돌 항목 표시 + decision 검증 테스트 | A |
| `apps/web/app/admin/2fa/enroll/page.tsx` | TOTP enrollment 페이지 (AUTH-001 흐름 재사용) | B |
| `apps/web/app/admin/2fa/verify/page.tsx` | 2FA 코드 검증 폼 | B |
| `apps/web/app/admin/_components/AdminSidebar.tsx` | (기존 확장) 즐겨찾기 섹션 추가 | A |
| `apps/web/app/admin/_components/AddToFavoritesButton.tsx` | 페이지 헤더용 즐겨찾기 추가 버튼 | A |
| `apps/web/e2e/admin-2fa-enforcement.spec.ts` | E2E: enroll → verify → access flow | B |
| `apps/web/e2e/admin-export-import.spec.ts` | E2E: export → import round-trip | A |

### 2.2 변경 파일

| 경로 | 변경 내용 | Slice |
|---|---|---|
| `apps/web/app/admin/menu/page.tsx` | cross-level DnD (@dnd-kit) + 사이클 검출 클라이언트 가드 | B |
| `apps/web/app/admin/menu/actions.ts` | `admin.menu.items.reorder` ReorderOp 배치 mutation 확장 | B |
| `apps/web/app/admin/widgets/page.tsx` | "Save as preset" + 프리셋 목록 + schema diff 경고 | B |
| `apps/web/app/admin/modules/page.tsx` | 다중 선택 체크박스 + 일괄 작업 액션 바 + 확인 다이얼로그 | B |
| `apps/web/app/admin/modules/actions.ts` | `admin.module.bulk` mutation 추가 | B |
| `apps/web/app/admin/logs/page.tsx` | `ip` 필터 입력 추가 + 422 표시 | B |
| `apps/web/app/admin/logs/actions.ts` | log query에 `ip` 필터 매개변수 추가 | B |
| `apps/web/app/admin/layout.tsx` | `requireAdmin2FAIfEnabled` 강화 (enroll/verify redirect) | B |
| `apps/web/server/api/admin/menu.ts` | reorder ReorderOp 확장 | B |
| `apps/web/server/api/admin/module.ts` | bulk mutation 추가 | B |
| `apps/web/server/api/admin/log.ts` | ip 필터 매개변수 + CIDR 매칭 적용 | B |
| `apps/web/server/api/root.ts` | export/import/favorite 라우터 등록 | A |

### 2.3 변경하지 않는 파일

- `packages/db/prisma/schema.prisma` — AdminLog, AdminFavorite, ModuleInstance, MenuItem, WidgetInstance 모델 모두 이미 존재. **본 SPEC은 신규 마이그레이션을 추가하지 않는다**.
- `packages/auth/` — 2FA 모델/검증 로직 그대로 사용. 본 SPEC은 enforcement gate만 추가.
- SPEC-WIDGET-001의 registry/types — preset은 WidgetInstance row만 확장.

---

## 3. 단계별 실행 순서

### Slice A — Export/Import + AdminFavorites

1. **Step A1**: `bundle-schema.ts` + `bundle-schema.test.ts` — Zod 스키마 + supported range 상수 정의
2. **Step A2**: `serializer.ts` + `serializer.test.ts` — 직렬화 + redaction. redaction 테스트 강제
3. **Step A3**: `deserializer.ts` + `deserializer.test.ts` — 스키마 검증 + 버전 체크 + dryRun plan
4. **Step A4**: `apply.ts` + `apply.test.ts` — 트랜잭션 적용 + 롤백 시나리오
5. **Step A5**: `round-trip.test.ts` — export → import 라운드 트립 (AC-A2)
6. **Step A6**: `favorites/actions.ts` + tests — href 검증 + 최대 개수
7. **Step A7**: tRPC 라우터 (`export.ts`, `import.ts`, `favorite.ts`) + `root.ts` 등록
8. **Step A8**: UI 페이지 (`settings/export`, `settings/import`)
9. **Step A9**: AdminSidebar 확장 + AddToFavoritesButton
10. **Step A10**: E2E (`admin-export-import.spec.ts`)
11. **Step A11**: `pnpm tsc --noEmit` + `pnpm test` 통과 확인

### Slice B — 잔여 REQ

12. **Step B1**: `security/two-factor-gate.ts` + tests — 4 상태 매트릭스 (AC-B1)
13. **Step B2**: `apps/web/app/admin/layout.tsx` 강화 (enroll/verify redirect)
14. **Step B3**: `2fa/enroll/page.tsx` + `2fa/verify/page.tsx` (AUTH-001 flow 재사용)
15. **Step B4**: E2E (`admin-2fa-enforcement.spec.ts`) — enrollment → verification → access flow
16. **Step B5**: `menu/reorder.ts` + tests — 사이클 검출 + depth 검증
17. **Step B6**: `apps/web/app/admin/menu/page.tsx` DnD 확장 + reorder action 확장
18. **Step B7**: `logs/ip-filter.ts` + tests — ipaddr.js CIDR 매칭 (AC-B2)
19. **Step B8**: `apps/web/app/admin/logs/` IP 필터 입력 추가
20. **Step B9**: `modules/bulk.ts` + tests — 인덱스 가드 + 트랜잭션 (AC-B3)
21. **Step B10**: `apps/web/app/admin/modules/page.tsx` 일괄 작업 UI
22. **Step B11**: `widgets/preset.ts` + tests — schema drift 감지
23. **Step B12**: `apps/web/app/admin/widgets/page.tsx` 프리셋 라이브러리 확장
24. **Step B13**: `pnpm tsc --noEmit` + `pnpm test` 통과 확인

---

## 4. Test Plan

### 4.1 테스트 총량 추정

| Slice | 단위 | 통합 | E2E | 합계 |
|---|---|---|---|---|
| A | 18 | 2 | 1 | 21+ |
| B | 12 | 1 | 1 | 14+ |
| **Total** | **30** | **3** | **2** | **35+** |

MASTER-PLAN-002 §5.12 추정치(+35) 일치.

### 4.2 테스트 매트릭스

| Acceptance | 테스트 종류 | 위치 |
|---|---|---|
| AC-A1 (export 다운로드) | 통합 | `apps/web/server/api/admin/export.test.ts` |
| AC-A2 (round-trip + 롤백) | 단위 | `packages/admin/src/import/round-trip.test.ts` |
| AC-A3 (favorites scope) | 단위 + E2E | `packages/admin/src/favorites/actions.test.ts` + E2E |
| AC-B1 (2FA enforcement) | E2E | `apps/web/e2e/admin-2fa-enforcement.spec.ts` |
| AC-B2 (CIDR 필터) | 단위 | `packages/admin/src/logs/ip-filter.test.ts` |
| AC-B3 (일괄 작업 + 인덱스 가드) | 단위 | `packages/admin/src/modules/bulk.test.ts` |

### 4.3 보안 테스트 (필수)

- Export redaction 검증 — passwordHash, sessionToken, twoFactorSecret, smtpPassword가 직렬화 결과에 절대 포함되지 않음
- Import 임의 코드 미실행 — eval/Function/dynamic import 호출 흔적이 없음을 정적 검증
- 2FA bypass 시도 — URL 직접, header 변조, cookie 변조, method override 모두 차단됨
- AdminFavorite href XSS — `javascript:...`, `http://...`, `..` 모두 거부

---

## 5. 검증 체크리스트

각 Slice 완료 후:

- [ ] `pnpm tsc --noEmit` → 0 error
- [ ] `pnpm test --filter @rhymix-ts/admin` → all pass, coverage ≥ 80%
- [ ] `pnpm test --filter web` → all pass
- [ ] `pnpm lint` → 0 warning (new files only)
- [ ] AdminLog 신규 action 종류(`export.create`, `import.apply`, `import.failed`, `module.bulk.*`, `menu.reorder`) 모두 기록됨
- [ ] 모든 admin 라우트가 `protectedAdminProcedure` 통과 (직접 노출 없음)
- [ ] 2FA gate가 admin layout + tRPC 양쪽에서 강제됨

Slice A 추가:
- [ ] Export 번들이 `exportFormatVersion="1.0.0"` 메타 블록 포함
- [ ] Export redaction 단위 테스트 100% 통과
- [ ] Round-trip 테스트: seed → export → empty DB import → 동일 상태
- [ ] Import dryRun 후 apply 사이의 상태 변화 감지 (재검증)
- [ ] AdminFavorite href는 `/admin/` prefix만 허용

Slice B 추가:
- [ ] `requireAdminTwoFactor=true` 시 미enroll 관리자는 enroll로 redirect
- [ ] enroll 후 새 세션은 verify 필요, verify 통과 후 원래 경로 이동
- [ ] 비관리자는 2FA gate에 영향받지 않음
- [ ] 메뉴 cross-level DnD가 사이클을 생성하지 않음
- [ ] 모듈 일괄 삭제가 indexModuleInstanceId 참조를 보호함
- [ ] CIDR 필터가 IPv4 /24, /16, IPv6 /32, exact match, invalid 모두 정상 처리

---

## 6. Open Decisions (Reference to spec.md §7)

`spec.md` Open Questions의 결정 시점:

1. **Export format versioning 전략** → Slice A Step A1에서 expert-backend 결정 (권고: MAJOR-match-only)
2. **2FA 방식 (TOTP vs WebAuthn)** → Slice B Step B1 착수 전 user 확인 (권고: Phase 5는 TOTP만)
3. **AdminFavorites scope** → 본 SPEC에서 per-user로 확정 (변경 없음)
4. **CIDR 매칭 위치 (DB inet vs app-level)** → Slice B Step B7에서 expert-backend 결정 (권고: app-level + LIMIT)
5. **메뉴 DnD 라이브러리** → Slice B Step B6에서 expert-frontend 결정 (권고: `@dnd-kit/core` + `@dnd-kit/sortable`)
6. **Import dryRun caching** → Step A4 구현 detail (권고: 매번 재계산)

---

## 7. Master Plan 연결

- MASTER-PLAN-002 Section 5.12 (P2 Phase 5 SPEC-ADMIN-EXTRAS-001) 직접 흡수
- ADMIN-001 Slice H (export/import + AdminFavorites) → 본 SPEC Slice A에 매핑
- ADMIN-001 Slice I (잔여 REQ) → 본 SPEC Slice B에 매핑
- REMEDIATION-PLAN-001의 ADMIN Slice H/I discussion → 본 SPEC이 supersede
- 본 SPEC 완료 시 MASTER-PLAN-002의 ADMIN 도메인 acceptance 100% 달성

---

---

## 8. Implementation Result (2026-06-14)

커밋: `1e6ce2a feat(admin): SPEC-ADMIN-EXTRAS-001 Export/Import/2FA/DnD/IP필터/모듈벌크 구현`

### Slice A 결과

| 계획 파일 | 결과 | 비고 |
|---|---|---|
| `packages/admin/src/export/bundle-schema.ts` | 구현 | |
| `packages/admin/src/export/serializer.ts` | 구현 | |
| `packages/admin/src/import/deserializer.ts` | 구현 | |
| `packages/admin/src/import/apply.ts` | 구현 | |
| `packages/admin/src/import/round-trip.test.ts` | Deferred | 후속 이슈 필요 |
| `packages/admin/src/favorites/actions.ts` | 구현 | |
| tRPC export/import/favorite 라우터 | 구현 | |
| `apps/web/app/admin/settings/export/page.tsx` | 구현 | |
| `apps/web/app/admin/settings/import/page.tsx` | Deferred | tRPC는 구현됨 |
| `apps/web/components/admin/AdminSidebar.tsx` (확장) | 구현 | 위치: `components/admin/` |
| `apps/web/components/admin/AddToFavoritesButton.tsx` | 구현 | 위치: `components/admin/` |
| E2E: admin-export-import.spec.ts | Deferred | |

### Slice B 결과

| 계획 파일 | 결과 | 비고 |
|---|---|---|
| `packages/admin/src/security/two-factor-gate.ts` | 구현 | |
| `apps/web/app/admin/layout.tsx` 강화 | 구현 | |
| `apps/web/app/admin/2fa/enroll/page.tsx` | 구현 | |
| `apps/web/app/admin/2fa/verify/page.tsx` | 구현 | |
| E2E: admin-2fa-enforcement.spec.ts | Deferred | |
| `packages/admin/src/menu/reorder.ts` | 대안 구현 | 로직이 admin/menu.ts에 포함 |
| `apps/web/app/admin/menu/page.tsx` DnD 확장 | 구현 | MenuItemDnDTree.tsx 확장 |
| `packages/admin/src/logs/ip-filter.ts` | 구현 | |
| `apps/web/app/admin/logs/page.tsx` IP 필터 | 구현 | |
| `packages/admin/src/modules/bulk.ts` | 대안 구현 | 로직이 admin/module.ts에 포함 |
| `apps/web/app/admin/modules/page.tsx` | 구현 | |
| `packages/admin/src/widgets/preset.ts` | Deferred | SPEC-WIDGET-001 조율 필요 |
| `apps/web/app/admin/widgets/page.tsx` 프리셋 | Deferred | preset.ts 미구현으로 인해 |

### 테스트 결과

- packages/admin: 36/36 통과
- apps/web admin 라우터: 83/83 통과
- `pnpm tsc --noEmit`: 신규 파일 기준 0 오류

---

Version: 1.0.0
Status: in-progress
