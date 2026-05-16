# SPEC-ADMIN-001 Slice D Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: `auditLogger` tRPC 미들웨어 활성화 + `admin.menu.*` / `admin.menuItem.*` / `admin.log.*` 라우터 + 메뉴 관리 UI (`/admin/menu`) + AdminLog 조회 UI (`/admin/logs`)
Base: main = eee737a (Slice C 완료 — Admin Shell UI + shadcn/ui + `/admin/modules` CRUD UI)
Depends on: Slice A (Menu / MenuItem / AdminLog 스키마 + 도메인 서비스), Slice B (tRPC `protectedAdminProcedure` + `getServerCaller`), Slice C (Admin Shell layout + sidebar + Server Action 패턴 + shadcn/ui 컴포넌트)

> **Note**: 본 슬라이스는 SPEC-ADMIN-001 의 **감사 가능성(auditability) + 메뉴 관리 첫 단계** 다. Slice B 에서 TODO 로 남겨둔 `auditLogger` 미들웨어를 활성화해 모든 `admin.*` mutation 이 `AdminLog` 에 자동 기록되도록 하고, Slice A 의 `Menu` / `MenuItem` 스키마를 (a) tRPC CRUD 라우터, (b) `/admin/menu` 페이지 (목록 + 생성 / 수정 / 삭제), (c) `/admin/menu/[id]` 페이지 (MenuItem 트리 편집 — DnD 없이 텍스트 입력 방식) 로 노출한다. 동시에 `admin.log.list` tRPC + `/admin/logs` 페이지를 도입해 관리자가 감사 로그를 검색 / 조회할 수 있게 한다. 드래그앤드롭 reorder (REQ-ADMIN-031), CSV 내보내기 (REQ-ADMIN-072 후반), Site Settings 페이지, Members 관리 페이지, 2FA 강제는 Slice E 이후로 분리한다.

---

## Pre-Flight Findings (2026-05-16)

Slice D 착수 직전 `protectedAdminProcedure` 의 미들웨어 체인, Menu/MenuItem 스키마의 트리 구조 처리, AdminLog 의 BigInt PK 직렬화 이슈, React Query Client 인프라 도입 시점을 점검해 네 가지 결정을 확정했다.

### Q1: `auditLogger` 구현 방식 — tRPC `t.middleware` 로 `protectedAdminProcedure` 체인에 추가

Slice B 의 `apps/web/server/api/trpc.ts` L27 에 명시된 TODO 자리를 활성화한다. 두 가지 후보:

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Path A: 각 mutation resolver 안에서 `ctx.prisma.adminLog.create(...)` 를 수동 호출 | resolver 가 자신의 `target` (`module:notice`, `menu:1`) 을 정확히 알 수 있음. 누락 시 컴파일 에러 없이 missed log 가 생길 위험. | 모든 resolver 에 동일 로직 반복. 추후 신규 mutation 도입 시 매번 잊을 가능성. fan_out 큼. |
| **Path B (채택)**: `t.middleware` 로 `protectedAdminProcedure` 체인에 추가, `type === 'mutation'` 일 때만 `AdminLog.create` | resolver 코드에 손대지 않고 모든 admin mutation 이 자동 기록. Slice C 의 `admin.module.{create,delete}` 도 즉시 혜택. fan_in 단일 진입점. | resolver 별 `target` 추출 규칙이 필요. 본 슬라이스에서는 `target = ''` 또는 `path` 그대로 사용 (`admin.module.create` 등). REQ-ADMIN-071 의 `target` ("module:notice", "menu:1") 매핑은 후속 정련. |

→ **채택 경로**: Path B. `auditLogger` 미들웨어를 `protectedAdminProcedure = publicProcedure.use(requireAdmin).use(auditLogger)` 체인에 삽입.

핵심 동작:
- `type === 'mutation'` 일 때만 기록 (query 는 제외 — REQ-ADMIN-070 명시: "관리자 mutation 작업")
- `action` = tRPC procedure path (`admin.module.create`, `admin.menu.delete` 등). REQ-ADMIN-071 의 `action` 예시 (`create|update|delete|configure|...`) 는 path 의 마지막 segment 로부터 자동 도출 가능하지만, 본 슬라이스에서는 **path 전체** 를 기록한다 — 정보 손실 없고, 후속 슬라이스에서 분류 로직 추가 시 쉽게 가공 가능.
- `target` = 본 슬라이스에서는 빈 문자열 (`''`) 로 두고 Slice E 의 정련 슬라이스에서 resolver 가 반환한 `result.id` 또는 `result.mid` 를 후처리로 채움. 본 슬라이스의 `AdminLog.target` 컬럼은 `String` 으로 비어 있을 수 있음 (스키마상 nullable 가 아니지만 빈 문자열 허용).
- `diff` = `{ input, output }` JSON. `output` 은 성공 시에만 (`next()` 가 throw 하지 않은 경우).
- `actorId` = `ctx.session.user.id` (Slice B 의 `requireAdmin` 가 통과해야 도달하므로 항상 존재).
- `ip` / `userAgent` = `ctx.ip` / `ctx.userAgent` (Slice B 의 `createContext` 가 채움).

실패 처리:
- mutation 이 throw 하면 catch 후 `AdminLog.create` 를 **시도하지 않음** — 일관성 우선 (실패한 작업의 로그는 별도 SPEC 에서 도입). 단, throw 자체는 그대로 re-throw.
- `AdminLog.create` 자체가 실패하면 — original mutation 결과는 이미 성공 상태이므로 — `console.error` 만 남기고 mutation 결과는 그대로 반환. **결코 mutation 결과를 audit log 실패로 되돌리지 않는다**. Risks 표에 명시.

### Q2: REQ-ADMIN-031 드래그앤드롭 reorder — Slice D 범위 밖, Slice E 이월

REQ-ADMIN-031 (Event-Driven): "WHEN 관리자가 메뉴 빌더에서 항목을 드래그앤드롭으로 이동·재배열할 때 THEN 시스템은 parentId 와 listOrder 를 단일 트랜잭션으로 갱신해야 한다."

드래그앤드롭 구현을 위해서는 (a) `@dnd-kit/core` + `@dnd-kit/sortable` 신규 의존성 도입, (b) Slice C 에서 미루어진 `@trpc/react-query` + `TRPCProvider` + `QueryClient` 인프라 도입 (optimistic update 를 위해 필수) — 둘 다 의존성이 추가되고 React Query Client 인프라는 새로운 boundary 다. 본 슬라이스에 둘을 모두 도입하면 (a) shadcn/ui 도입 후 첫 슬라이스에서 라이브러리가 또 늘어나 review 부담 증가, (b) React Query Client 의 SSR 통합 패턴 (`HydrationBoundary` 등) 을 정립해야 함.

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Path A: Slice D 에서 DnD 도입 (dnd-kit + React Query Client)                  | REQ-ADMIN-031 즉시 충족. UX 완성도 높음.            | 슬라이스 크기 ~2배. shadcn/ui + dnd-kit + React Query 가 한 슬라이스에 몰림.       |
| **Path B (채택)**: Slice D 는 텍스트 입력 기반 reorder (listOrder 숫자 직접 편집), DnD 는 Slice E 이월 | 슬라이스 크기 적정. Server Action 패턴 일관성 유지. React Query 도입 시점 분리. | REQ-ADMIN-031 의 "드래그앤드롭" 부분 미충족 — 본 슬라이스에서는 `@MX:TODO` 로 명시. UX 는 텍스트 입력으로 fallback. |

→ **채택 경로**: Path B. Slice D 는 `admin.menuItem.update` 가 `parentId` 와 `listOrder` 를 받아 단일 transaction 으로 갱신하는 **REQ-ADMIN-031 의 transactional 부분만** 충족한다. UX 표면 (DnD) 은 Slice E 의 `admin.menuItem.reorder` (배치 reorder) procedure + dnd-kit 도입 슬라이스에서 정식 도입. 본 슬라이스의 `admin.menuItem.update` 시그니처는 Slice E 의 reorder 도입과 호환되도록 설계 (parentId + listOrder 가 같은 입력에 포함되어 transaction 도입 코스트 0).

`@MX:TODO`: `admin/menu/[id]/page.tsx` 의 MenuItem 편집 UI 에 "Slice E 에서 드래그앤드롭 도입 예정" 주석 + spec.md REQ-ADMIN-031 의 부분 충족 사실을 본 슬라이스 progress.md 에 명시.

### Q3: AdminLog 조회 페이지 범위 — 본 슬라이스는 목록 + 필터만, CSV 내보내기는 Slice E 이월

REQ-ADMIN-072 (Event-Driven): "WHEN 관리자가 감사 로그 화면을 열 때 THEN 시스템은 actor / action / target / 기간 / IP 필터와 페이지네이션, CSV 내보내기를 제공해야 한다."

| 후보                                                                          | 장점                                                | 단점                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Path A: Slice D 에서 CSV 내보내기까지 도입                                    | REQ-ADMIN-072 즉시 충족.                            | 스트리밍 응답 (Route Handler) + 큰 결과셋 (수만 행) 처리 패턴 정립 필요. 슬라이스 비대화. |
| **Path B (채택)**: Slice D 는 목록 + 필터 + 페이지네이션. CSV 는 Slice E 이월 | UI 표면이 명확. CSV 는 별도 Route Handler 도입 슬라이스로 분리. | REQ-ADMIN-072 의 CSV 부분 미충족 — `@MX:TODO` 로 명시.                              |

→ **채택 경로**: Path B. Slice D 는 actor / action / target / `from` / `to` 필터 + offset 기반 페이지네이션 (page=1, pageSize=50) 만 구현. IP 필터는 본 슬라이스 범위 밖 (UX 우선순위 낮음, 검색 빈도 낮음 — Slice E 에서 함께 정련). CSV 는 별도 Route Handler (`/api/admin/logs/export.csv`) 로 Slice E 에서 도입.

`@MX:TODO`: `admin.log.list` 에 "CSV 내보내기 — Slice E", "IP 필터 — Slice E" 주석.

### Q4: `admin.menu.reorder` 트랜잭션 절차 (REQ-ADMIN-031) — Slice E 이월

Q2 결정의 직접 귀결. 본 슬라이스에서는 `admin.menu.reorder` (배치 reorder procedure) 자체를 도입하지 않고, 개별 MenuItem 의 `parentId` + `listOrder` 수정을 `admin.menuItem.update` 가 단일 `prisma.$transaction` 내에서 수행한다 (parentId 변경 시 listOrder 충돌 가능성을 고려해도 `update` 한 건이라 transaction wrapping 만으로 충분). 배치 reorder (드래그 결과로 다수 MenuItem 의 listOrder 가 동시 갱신되는 케이스) 는 Slice E 의 dnd-kit 도입과 함께 신규 procedure 로 도입.

### Q5: `AdminLog` 의 `BigInt` PK 직렬화 — `superjson` 으로 자동 처리

`apps/web/server/api/trpc.ts` L17 의 `initTRPC.context<Context>().create({ transformer: superjson })` 이 이미 `BigInt` 를 지원한다. AdminLog.id (`BigInt`) 가 클라이언트로 전달될 때 JSON 직렬화 문제는 발생하지 않는다 (superjson 이 `bigint` 타입 메타데이터를 보존). 단, **Server Component 가 `JSON.stringify` 를 직접 호출하면** (예: `dangerouslySetInnerHTML` 로 데이터 주입) BigInt 가 throw — 본 슬라이스의 `/admin/logs/page.tsx` 는 Server Component 가 직접 caller 를 호출해 결과를 JSX 로 렌더하므로 이 경로는 발생하지 않는다 (BigInt 가 `String(log.id)` 로 변환된 후 JSX 텍스트로 들어감). Risks 표에 sanity check 추가.

### Q6: `admin.menuItem.get` 의 재귀 트리 깊이 — 본 슬라이스는 최대 5 depth, Slice E 에서 정련

`MenuItem.parent / children` 관계는 자기참조 (`@relation("MenuItemTree")`). Prisma 는 자기참조 `include` 를 무한 재귀로 처리하지 않으므로 명시적으로 depth 를 지정해야 한다.

본 슬라이스의 결정: `admin.menu.get` 이 menu + 1-depth MenuItem 만 반환하고, MenuItem 의 children 은 별도 procedure (`admin.menuItem.list({ menuId, parentId })`) 로 lazy load. 이로써 트리 깊이 제한 문제를 회피하며, 본 슬라이스의 UI 도 한 번에 한 depth 만 표시한다 (트리 전체 펼침 UX 는 Slice E 의 dnd-kit 도입과 함께).

`@MX:NOTE`: `admin.menu.get` 의 1-depth include 한계와 `admin.menuItem.list` 의 lazy load 패턴을 코멘트로 명시. 후속 슬라이스가 깊이 제한을 도입할 때 본 결정을 참조.

---

## Slice D — auditLogger + Menu/MenuItem CRUD + AdminLog 조회

### Goal

Slice C 가 만든 Admin Shell 위에 (a) `auditLogger` tRPC 미들웨어 활성화 (Slice B 의 TODO 자리 채움) — 모든 `admin.*` mutation 이 자동으로 `AdminLog` 에 기록되도록 함, (b) `admin.menu.*` / `admin.menuItem.*` tRPC 라우터 (create / list / get / update / delete) — Slice A 의 `Menu` / `MenuItem` 스키마 표면, (c) `/admin/menu` 페이지 (Menu 목록 + 생성 / 삭제), (d) `/admin/menu/[id]` 페이지 (MenuItem 트리 편집 — 텍스트 입력 기반, DnD 없음), (e) `admin.log.list` tRPC + `/admin/logs` 페이지 (감사 로그 검색 — actor / action / target / 기간 필터 + 페이지네이션) 를 도입한다. 이 다섯 가지가 완성되면 관리자는 (a) 사이트별 메뉴 트리를 관리하고, (b) 자신과 다른 관리자의 작업을 감사 로그로 검토할 수 있다. 드래그앤드롭 reorder (REQ-ADMIN-031 UI 표면), CSV 내보내기 (REQ-ADMIN-072 후반), Site Settings 페이지, Members 관리 페이지, 2FA 강제는 Slice E 이후로 분리한다.

### Branch

`feature/admin-001-slice-d` (base: main = eee737a, Slice C 머지 후 새로 생성)

### REQ / AC scope

Slice D 에서 완전 구현:

- **REQ-ADMIN-070 (모든 관리자 mutation 자동 기록)** — `auditLogger` 미들웨어가 `protectedAdminProcedure` 체인에 삽입되어 `type === 'mutation'` 인 모든 procedure 호출이 `AdminLog.create` 를 트리거.
- **REQ-ADMIN-071 (AdminLog 필드)** — `actorId`, `action` (= tRPC path), `target` (본 슬라이스는 빈 문자열, 후속 정련), `diff` (`{ input, output }` JSON), `ip`, `userAgent`, `createdAt`. 스키마는 Slice A 에 이미 정의됨.
- **REQ-ADMIN-072 (감사 로그 조회 UI, 부분)** — `/admin/logs` 페이지에 actor / action / target / 기간 필터 + offset 페이지네이션. **CSV 내보내기와 IP 필터는 Slice E 이월 (Q3).**
- **REQ-ADMIN-030 (사이트별 Menu + MenuItem 트리 구조)** — `admin.menu.*` 라우터 + Menu 목록 페이지 + Menu 생성 / 삭제. MenuItem 트리 편집 화면 (1-depth 표시).
- **REQ-ADMIN-031 (parentId + listOrder 트랜잭션, 부분)** — `admin.menuItem.update` 가 `parentId` + `listOrder` 를 받아 단일 transaction 으로 갱신. **드래그앤드롭 UX 와 배치 reorder procedure 는 Slice E 이월 (Q2/Q4).**
- **REQ-ADMIN-032 (groupIds ACL)** — `admin.menuItem.{create,update}` 가 `groupIds: number[]` 입력 허용. UI 는 콤마 구분 텍스트 입력 (e.g. `"1,2,5"`).
- **REQ-ADMIN-033 (MenuItem 메타데이터)** — url, icon, cssClass, description, openInNewWindow, expand 입력. 정상/호버/활성 상태별 JSON (normalBtn, hoverBtn, activeBtn) 은 본 슬라이스에서 textarea 로 raw JSON 입력 (단순 우선, 시각 편집기는 SPEC-THEME-001 와 연계).
- **Admin Shell IA enable** — sidebar 의 다음 항목이 enabled 로 전환:
  - `사이트 설정 > 메뉴 편집` `/admin/menu` (본 슬라이스에서는 사이트 일반 설정이 아닌 메뉴 편집만 enable)
  - `시스템 > 관리자 로그` `/admin/logs`

Slice D 에서 schema/스캐폴딩만 (실제 enforcement 는 Slice E+):

- **REQ-ADMIN-072 (CSV 내보내기)** — `admin.log.list` 의 응답 + `/admin/logs` 페이지에 "CSV 내보내기" 버튼 자리만 마련하되 클릭 시 disabled (`<button disabled title="Slice E 에서 추가">`). 실제 export Route Handler 는 Slice E.
- **REQ-ADMIN-031 (DnD UI)** — `/admin/menu/[id]/page.tsx` 의 MenuItem 트리 표시 영역 위쪽에 "드래그앤드롭은 Slice E 에서 추가됩니다" 안내 + listOrder 숫자 직접 입력 가능 (지금은 폼 필드).
- **REQ-ADMIN-034 (admin 메뉴 캐시 분리)** — 본 슬라이스에서는 캐시 키 정의만 (`menu:admin:{siteId}` vs `menu:public:{siteId}` constant 도입), 실제 caching 적용은 캐시 슬라이스에서.

명시적으로 Slice D 범위 밖:

- REQ-ADMIN-031 의 드래그앤드롭 UX (dnd-kit + `admin.menu.reorder`) → Slice E (Q2/Q4)
- REQ-ADMIN-072 의 CSV 내보내기 + IP 필터 → Slice E (Q3)
- REQ-ADMIN-040 ~ 043 (Widget Registry) → 별도 슬라이스
- REQ-ADMIN-050 ~ 063 (Site Settings, 캐시 액션 UI) → Slice E 또는 별도 슬라이스
- REQ-ADMIN-080 ~ 081 (Health Dashboard) → 후속 슬라이스
- REQ-ADMIN-090 ~ 093 (가져오기/내보내기 / 일괄 작업) → 후속 슬라이스
- REQ-ADMIN-100 ~ 101 (관리자 즐겨찾기) → 후속 슬라이스
- AUTH-001 의 User / UserGroup 표면 (`/admin/members`) → Slice E 또는 별도 슬라이스
- 2FA 강제 (`requireAdminTwoFactor`) — Site Settings 슬라이스에서 함께 도입 → Slice E
- React Query Client 인프라 (`TRPCProvider`) — DnD 도입 시점에 함께 → Slice E
- mobile responsive sidebar (drawer / collapsible) — Slice E

### Files (new + modified)

| File                                                                  | Status | Purpose                                                                              |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `apps/web/server/api/trpc.ts`                                         | edit   | `auditLogger` 미들웨어 추가 + `protectedAdminProcedure` 체인에 삽입. Slice B 의 L27 TODO 채움. |
| `apps/web/server/api/trpc.test.ts`                                    | new    | RED first — D-1, D-2, D-3                                                            |
| `apps/web/server/api/routers/admin/menu.ts`                           | new    | `admin.menu.*` 라우터 (create / list / get / delete) — Menu 단위                     |
| `apps/web/server/api/routers/admin/menu.test.ts`                      | new    | RED first — D-4, D-5, D-6, D-7                                                       |
| `apps/web/server/api/routers/admin/menu-item.ts`                      | new    | `admin.menuItem.*` 라우터 (create / list / update / delete) — MenuItem 단위. `update` 가 `parentId` + `listOrder` 를 transaction 으로 갱신 |
| `apps/web/server/api/routers/admin/menu-item.test.ts`                 | new    | RED first — D-8, D-9, D-10                                                           |
| `apps/web/server/api/routers/admin/log.ts`                            | new    | `admin.log.list` 라우터 — actor / action / target / 기간 필터 + offset 페이지네이션 |
| `apps/web/server/api/routers/admin/log.test.ts`                       | new    | RED first — D-11, D-12                                                               |
| `apps/web/server/api/routers/admin/index.ts`                          | edit   | menu, menuItem, log 라우터 추가                                                       |
| `apps/web/app/admin/menu/page.tsx`                                    | new    | Menu 목록 페이지 — Server Component. `getServerCaller().admin.menu.list({ siteId })` 호출 + "새 메뉴" Link |
| `apps/web/app/admin/menu/new/page.tsx`                                | new    | Menu 생성 폼 (siteId 자동, title, isAdminMenu 입력)                                  |
| `apps/web/app/admin/menu/[id]/page.tsx`                               | new    | Menu 상세 + MenuItem 트리 (1-depth) 표시 + MenuItem 생성/수정/삭제 폼               |
| `apps/web/app/admin/menu/actions.ts`                                  | new    | Server Actions: `createMenuAction`, `deleteMenuAction`, `createMenuItemAction`, `updateMenuItemAction`, `deleteMenuItemAction` |
| `apps/web/app/admin/logs/page.tsx`                                    | new    | 감사 로그 페이지 — Server Component. 쿼리 파라미터 (`actor`, `action`, `target`, `from`, `to`, `page`) 로 `admin.log.list` 호출 후 테이블 렌더 |
| `apps/web/components/admin/AdminSidebar.tsx`                          | edit   | `/admin/menu`, `/admin/logs` 항목 `disabled` 제거                                    |
| `apps/web/components/admin/MenuTable.tsx`                             | new    | Menu 목록 테이블 (shadcn Table)                                                       |
| `apps/web/components/admin/CreateMenuForm.tsx`                        | new    | Menu 생성 폼 (`useActionState(createMenuAction)`)                                     |
| `apps/web/components/admin/MenuItemEditor.tsx`                        | new    | MenuItem 1-depth 트리 + 각 행에 수정/삭제 버튼 + "새 MenuItem" 폼 (`useActionState`) |
| `apps/web/components/admin/AdminLogTable.tsx`                         | new    | AdminLog 행 렌더 — `id` (BigInt → String), `actorId`, `action`, `target`, `createdAt`, `ip` |
| `apps/web/components/admin/AdminLogFilters.tsx`                       | new    | 필터 UI — Client Component. URL 쿼리 파라미터 동기화 (router.push)                  |
| `apps/web/lib/admin/cache-keys.ts`                                    | new    | `menuCacheKey(siteId, scope: 'admin' \| 'public')` — REQ-ADMIN-034 의 캐시 키 분리 정의 |
| `.moai/specs/SPEC-ADMIN-001/progress.md`                              | edit   | Slice D 결과 섹션 추가                                                                |

신규 파일 16 개 + 수정 3 개. 신규 영역은 `app/admin/menu/*`, `app/admin/logs/`, `server/api/routers/admin/{menu,menu-item,log}.ts`, `components/admin/{Menu*,AdminLog*}.tsx` 이며 Slice C 의 `app/admin/modules/*` 와 충돌하지 않는다.

### 핵심 구현 스케치

#### 1. `auditLogger` 미들웨어 — `apps/web/server/api/trpc.ts` 확장

```ts
// apps/web/server/api/trpc.ts (Slice D 확장)
const auditLogger = t.middleware(async ({ ctx, type, path, input, next }) => {
  const result = await next();
  // result 는 { ok: true, data } 또는 { ok: false, error } 형태 (tRPC v11 의 MiddlewareResult)
  if (type === 'mutation' && result.ok) {
    const session = ctx.session;
    if (session?.user?.id) {
      try {
        await ctx.prisma.adminLog.create({
          data: {
            actorId: session.user.id,
            action: path,             // e.g. "admin.module.create"
            target: '',               // Slice E 에서 result 로부터 추출
            diff: { input: input ?? null, output: result.data ?? null },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });
      } catch (err) {
        // AdminLog 기록 실패는 mutation 결과를 되돌리지 않는다.
        // eslint-disable-next-line no-console
        console.error('[auditLogger] AdminLog.create failed:', err);
      }
    }
  }
  return result;
});

// requireAdmin 이 먼저, auditLogger 가 나중 — actorId 가 session 에 의존하기 때문.
export const protectedAdminProcedure = publicProcedure
  .use(requireAdmin)
  .use(auditLogger);
```

핵심 결정:
- `requireAdmin` 통과 후에만 `auditLogger` 가 실행되므로 `ctx.session` 은 보장됨.
- `result.ok` 가 false 면 — 즉 mutation 이 throw 한 경우 — AdminLog 를 기록하지 않음 (실패 로그는 별도 SPEC).
- `AdminLog.create` 자체의 실패는 `console.error` 로만 남기고 mutation 결과는 그대로 반환.
- `diff.input` 은 본 슬라이스에서는 정제 없이 그대로 저장 (민감 키 마스킹은 후속 슬라이스 — Risks 항목 참조).

#### 2. `admin.menu.*` 라우터 — `apps/web/server/api/routers/admin/menu.ts`

```ts
// apps/web/server/api/routers/admin/menu.ts (의사 — 본 슬라이스 신규)
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminMenuRouter = router({
  create: protectedAdminProcedure
    .input(z.object({
      siteId: z.number().int().positive(),
      title: z.string().min(1).max(80),
      isAdminMenu: z.boolean().default(false),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menu.create({ data: input }),
    ),

  list: protectedAdminProcedure
    .input(z.object({ siteId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.prisma.menu.findMany({
        where: { siteId: input.siteId },
        orderBy: [{ listOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ),

  get: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const menu = await ctx.prisma.menu.findUnique({
        where: { id: input.id },
        include: {
          // 1-depth 만 — 나머지는 admin.menuItem.list 로 lazy load (Q6)
          items: {
            where: { parentId: null },
            orderBy: { listOrder: 'asc' },
          },
        },
      });
      if (!menu) throw new TRPCError({ code: 'NOT_FOUND' });
      return menu;
    }),

  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menu.delete({ where: { id: input.id } }),
      // MenuItem 의 onDelete: Cascade 가 children 까지 자동 삭제
    ),
});
```

#### 3. `admin.menuItem.*` 라우터 — `apps/web/server/api/routers/admin/menu-item.ts`

```ts
// apps/web/server/api/routers/admin/menu-item.ts (의사 — 본 슬라이스 신규)
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';

const MenuItemInput = z.object({
  title: z.string().min(1).max(200),
  url: z.string().optional(),
  icon: z.string().optional(),
  cssClass: z.string().optional(),
  description: z.string().optional(),
  groupIds: z.array(z.number().int().positive()).default([]),
  openInNewWindow: z.boolean().default(false),
  expand: z.boolean().default(false),
  listOrder: z.number().int().default(0),
  normalBtn: z.unknown().optional(),    // raw JSON (REQ-ADMIN-033)
  hoverBtn: z.unknown().optional(),
  activeBtn: z.unknown().optional(),
});

export const adminMenuItemRouter = router({
  list: protectedAdminProcedure
    .input(z.object({
      menuId: z.number().int().positive(),
      parentId: z.number().int().nullable().default(null),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.menuItem.findMany({
        where: { menuId: input.menuId, parentId: input.parentId },
        orderBy: { listOrder: 'asc' },
      }),
    ),

  create: protectedAdminProcedure
    .input(MenuItemInput.extend({
      menuId: z.number().int().positive(),
      parentId: z.number().int().positive().nullable().default(null),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menuItem.create({ data: input as never }),
    ),

  update: protectedAdminProcedure
    .input(MenuItemInput.partial().extend({
      id: z.number().int().positive(),
      parentId: z.number().int().positive().nullable().optional(),
      // listOrder 와 parentId 가 함께 들어오면 transaction 으로 단일 갱신 (REQ-ADMIN-031 의 transactional 부분)
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      return ctx.prisma.$transaction(async (tx) => {
        return tx.menuItem.update({ where: { id }, data: patch });
      });
    }),

  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menuItem.delete({ where: { id: input.id } }),
      // children 은 onDelete: Cascade 로 자동 삭제
    ),
});
```

#### 4. `admin.log.list` 라우터 — `apps/web/server/api/routers/admin/log.ts`

```ts
// apps/web/server/api/routers/admin/log.ts (의사 — 본 슬라이스 신규)
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminLogRouter = router({
  list: protectedAdminProcedure
    .input(z.object({
      actorId: z.number().int().positive().optional(),
      action: z.string().optional(),    // 부분 일치
      target: z.string().optional(),    // 부분 일치
      from: z.date().optional(),
      to: z.date().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.action ? { action: { contains: input.action } } : {}),
        ...(input.target ? { target: { contains: input.target } } : {}),
        ...(input.from || input.to
          ? {
              createdAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      };
      const [total, items] = await Promise.all([
        ctx.prisma.adminLog.count({ where }),
        ctx.prisma.adminLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
        }),
      ]);
      return { total, items, page: input.page, pageSize: input.pageSize };
      // CSV / IP 필터는 Slice E (Q3)
    }),
});
```

#### 5. `admin` 라우터 확장 — `apps/web/server/api/routers/admin/index.ts`

```ts
// apps/web/server/api/routers/admin/index.ts (Slice D 확장)
import { router } from '../../trpc';
import { adminModuleRouter } from './module';
import { adminMenuRouter } from './menu';
import { adminMenuItemRouter } from './menu-item';
import { adminLogRouter } from './log';

export const adminRouter = router({
  module:   adminModuleRouter,
  menu:     adminMenuRouter,
  menuItem: adminMenuItemRouter,
  log:      adminLogRouter,
  // TODO (Slice E): site: adminSiteRouter
  // TODO (Slice E): members: adminMembersRouter
});
```

#### 6. `/admin/menu/page.tsx` — Menu 목록 페이지

```tsx
// apps/web/app/admin/menu/page.tsx (의사 — Server Component)
import Link from 'next/link';
import { Button } from '@rhymix-ts/ui/components';
import { getServerCaller } from '@/lib/trpc/server';
import { getCurrentSiteId } from '@/lib/admin/site-context';
import { MenuTable } from '@/components/admin/MenuTable';

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage() {
  const siteId = await getCurrentSiteId();
  const caller = await getServerCaller();
  const menus = await caller.admin.menu.list({ siteId });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">메뉴 관리</h1>
        <Button asChild>
          <Link href="/admin/menu/new">새 메뉴</Link>
        </Button>
      </div>
      <MenuTable menus={menus} />
    </div>
  );
}
```

#### 7. `/admin/logs/page.tsx` — 감사 로그 페이지

```tsx
// apps/web/app/admin/logs/page.tsx (의사 — Server Component)
import { getServerCaller } from '@/lib/trpc/server';
import { AdminLogFilters } from '@/components/admin/AdminLogFilters';
import { AdminLogTable } from '@/components/admin/AdminLogTable';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    actor?: string;
    action?: string;
    target?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const caller = await getServerCaller();
  const data = await caller.admin.log.list({
    actorId: sp.actor ? Number(sp.actor) : undefined,
    action:  sp.action ?? undefined,
    target:  sp.target ?? undefined,
    from:    sp.from ? new Date(sp.from) : undefined,
    to:      sp.to ? new Date(sp.to) : undefined,
    page:    sp.page ? Number(sp.page) : 1,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">관리자 로그</h1>
      <AdminLogFilters initial={sp} />
      <AdminLogTable items={data.items} total={data.total} page={data.page} pageSize={data.pageSize} />
      <button disabled title="Slice E 에서 추가" className="mt-4 px-3 py-1 text-sm text-zinc-500">
        CSV 내보내기 (준비중)
      </button>
    </div>
  );
}
```

### Test plan (RED first, 12 tests)

본 슬라이스는 TDD 모드를 따른다. test runner 는 `vitest`. tRPC procedure 테스트는 `appRouter.createCaller(ctx)` 직접 호출 패턴 (Slice B/C 와 동일). React 컴포넌트 / Server Action 테스트는 본 슬라이스에서는 최소화 (Server Component + Server Action 흐름은 후속 e2e 슬라이스에서 정식 보강하며, UI 의 시각 확인은 수동 sanity check 로 대체).

#### `apps/web/server/api/trpc.test.ts` — 3 tests (auditLogger)

테스트 픽스처: `prisma` 를 `vi.mock` 또는 in-memory 패턴. `ctx = { session: { user: { id: 7, isAdmin: true } }, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test' }`.

- **D-1**: admin mutation 호출 (`admin.module.create` 등 임의 admin mutation procedure 를 mock 으로 정의 또는 실제 Slice C 의 procedure 재사용) → `prisma.adminLog.create` 가 `{ actorId: 7, action: 'admin.module.create', diff: { input, output }, ip: '127.0.0.1', userAgent: 'test' }` 인자로 호출됨. (REQ-ADMIN-070, REQ-ADMIN-071)
- **D-2**: admin query 호출 (`admin.module.list` 등) → `prisma.adminLog.create` 가 호출되지 **않음**. (REQ-ADMIN-070 의 "mutation 만" 명시)
- **D-3**: 비관리자 세션 (`session: null` 또는 `session.user.isAdmin: false`) → `requireAdmin` 단계에서 FORBIDDEN throw, `auditLogger` 까지 도달하지 않으므로 `prisma.adminLog.create` 도 호출 안 됨. (Slice B 의 C-1 회귀 + auditLogger 가 권한 게이트를 우회하지 않음을 확인)

#### `apps/web/server/api/routers/admin/menu.test.ts` — 4 tests

테스트 픽스처: `prisma` mock. `caller = appRouter.createCaller({ session: adminSession, prisma: mockPrisma, ip, userAgent, siteId: 1 })`.

- **D-4**: `caller.admin.menu.create({ siteId: 1, title: 'Main', isAdminMenu: false })` → `prisma.menu.create` 가 해당 data 로 호출됨. (REQ-ADMIN-030)
- **D-5**: `caller.admin.menu.list({ siteId: 1 })` → `prisma.menu.findMany({ where: { siteId: 1 }, orderBy: [{ listOrder: 'asc' }, { createdAt: 'asc' }] })` 결과 반환.
- **D-6**: `caller.admin.menu.get({ id: 1 })` → `prisma.menu.findUnique` 가 `include: { items: { where: { parentId: null }, orderBy: { listOrder: 'asc' } } }` 와 함께 호출됨, 결과 반환. menu 없음 → `NOT_FOUND` TRPCError.
- **D-7**: `caller.admin.menu.delete({ id: 1 })` → `prisma.menu.delete({ where: { id: 1 } })` 호출. MenuItem cascade 는 schema 차원에서 보장됨 (별도 테스트 불필요).

#### `apps/web/server/api/routers/admin/menu-item.test.ts` — 3 tests

- **D-8**: `caller.admin.menuItem.create({ menuId: 1, parentId: null, title: 'Home', url: '/', groupIds: [1, 2] })` → `prisma.menuItem.create` 가 해당 data 로 호출됨. parentId null 은 최상위 항목. (REQ-ADMIN-030 트리, REQ-ADMIN-032 groupIds)
- **D-9**: `caller.admin.menuItem.update({ id: 5, parentId: 3, listOrder: 2 })` → `prisma.$transaction` 안에서 `tx.menuItem.update({ where: { id: 5 }, data: { parentId: 3, listOrder: 2 } })` 호출. (REQ-ADMIN-031 의 transactional 부분)
- **D-10**: `caller.admin.menuItem.delete({ id: 5 })` → `prisma.menuItem.delete({ where: { id: 5 } })` 호출.

#### `apps/web/server/api/routers/admin/log.test.ts` — 2 tests

- **D-11**: `caller.admin.log.list({})` → `prisma.adminLog.findMany` + `prisma.adminLog.count` 둘 다 `where: {}` 로 호출됨 (default page=1, pageSize=50, skip=0). 반환 형태 `{ total, items, page, pageSize }` 검증.
- **D-12**: `caller.admin.log.list({ action: 'admin.module.create', from: new Date('2026-01-01'), to: new Date('2026-12-31'), page: 2, pageSize: 100 })` → `where` 가 `{ action: { contains: 'admin.module.create' }, createdAt: { gte: ..., lte: ... } }`, `skip: 100`, `take: 100` 으로 호출됨. (REQ-ADMIN-072 필터 + 페이지네이션)

→ 총 12 개 테스트 (D-1 ~ D-12).

본 슬라이스에서 UI 컴포넌트 단위 테스트 (`MenuTable`, `MenuItemEditor`, `AdminLogTable`, `AdminLogFilters`) 와 Server Action 단위 테스트 (`actions.test.ts`) 는 작성하지 않는다. 이유:
- Slice C 의 UI 테스트 (`ModuleTable`, `CreateModuleForm`, `DeleteModuleButton`) 와 Server Action 테스트 (`actions.test.ts`) 가 이미 React Testing Library + jsdom 패턴 + `next/cache` / `next/navigation` mock 패턴을 정립함.
- 본 슬라이스의 컴포넌트 / actions 는 동일 패턴의 변형 (테이블 렌더 + Server Action 호출 + `revalidatePath` + `redirect`) 이라 추가 단위 테스트가 회귀 방지에 주는 한계 가치가 낮음.
- 시각 / 통합 검증은 수동 sanity check 와 후속 슬라이스의 e2e (Playwright) 도입으로 커버.

→ 본 결정은 Risks 표에 명시. e2e 슬라이스 도입 전까지 UI / Server Action 회귀는 수동 sanity 에 의존.

### Domain layer contract (간단 시그니처)

```ts
// apps/web/server/api/routers/admin/menu.ts
export const adminMenuRouter: Router<{
  create:  Mutation<{ siteId: number; title: string; isAdminMenu?: boolean }, Menu>;
  list:    Query<{ siteId: number }, Menu[]>;
  get:     Query<{ id: number }, Menu & { items: MenuItem[] }>;
  delete:  Mutation<{ id: number }, Menu>;
}>;

// apps/web/server/api/routers/admin/menu-item.ts
export const adminMenuItemRouter: Router<{
  list:    Query<{ menuId: number; parentId: number | null }, MenuItem[]>;
  create:  Mutation<MenuItemCreateInput, MenuItem>;
  update:  Mutation<MenuItemUpdateInput, MenuItem>;
  delete:  Mutation<{ id: number }, MenuItem>;
}>;

// apps/web/server/api/routers/admin/log.ts
export const adminLogRouter: Router<{
  list: Query<AdminLogListInput, { total: number; items: AdminLog[]; page: number; pageSize: number }>;
}>;

// apps/web/app/admin/menu/actions.ts
export async function createMenuAction(prev: ActionState, fd: FormData): Promise<ActionState>;
export async function deleteMenuAction(id: number): Promise<{ ok: true } | { error: string }>;
export async function createMenuItemAction(prev: ActionState, fd: FormData): Promise<ActionState>;
export async function updateMenuItemAction(prev: ActionState, fd: FormData): Promise<ActionState>;
export async function deleteMenuItemAction(id: number): Promise<{ ok: true } | { error: string }>;
```

### REQ → Enforcement chain

| REQ                                  | 코드 / 파일                                                                                  | 테스트                |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------- |
| REQ-ADMIN-070 (모든 admin mutation 기록) | `server/api/trpc.ts` 의 `auditLogger` 미들웨어                                                | D-1                   |
| REQ-ADMIN-070 (query 는 미기록)       | `auditLogger` 의 `type === 'mutation'` 분기                                                   | D-2                   |
| REQ-ADMIN-071 (AdminLog 필드)         | `auditLogger` 가 `actorId / action / diff / ip / userAgent` 채워 `adminLog.create` 호출      | D-1                   |
| REQ-ADMIN-072 (감사 로그 조회, 부분)  | `admin.log.list` + `/admin/logs/page.tsx` (필터 + 페이지네이션). CSV / IP 필터는 Slice E.   | D-11, D-12            |
| REQ-ADMIN-030 (Menu 생성/목록/삭제)   | `admin.menu.{create,list,get,delete}` + `/admin/menu/*`                                       | D-4, D-5, D-6, D-7    |
| REQ-ADMIN-030 (MenuItem 트리 — 1-depth) | `admin.menu.get` 의 `include: { items: { where: { parentId: null } } }` + `admin.menuItem.list({ parentId })` | D-6, D-8              |
| REQ-ADMIN-031 (parentId + listOrder transaction, 부분) | `admin.menuItem.update` 의 `prisma.$transaction`. DnD UX 는 Slice E.                            | D-9                   |
| REQ-ADMIN-032 (groupIds ACL)          | `admin.menuItem.{create,update}` 의 `groupIds: z.array(z.number().int().positive())`         | D-8                   |
| REQ-ADMIN-033 (MenuItem 메타데이터)   | `MenuItemInput` zod schema 의 url/icon/cssClass/description/openInNewWindow/expand/normalBtn/hoverBtn/activeBtn | D-8 (간접 — 입력 패스스루) |
| REQ-ADMIN-034 (admin 메뉴 캐시 분리) | `apps/web/lib/admin/cache-keys.ts` 의 `menuCacheKey(siteId, 'admin' \| 'public')` constant 도입. 실제 cache 적용은 캐시 슬라이스. | (스캐폴딩 only — 별도 테스트 없음) |
| Admin Shell sidebar IA 갱신          | `AdminSidebar.tsx` 의 `/admin/menu`, `/admin/logs` 항목 enabled 전환                          | (수동 sanity check)   |

본 슬라이스에서 REQ-ADMIN-034 의 `menuCacheKey` constant 는 도입만 하고 실제 `unstable_cache` 적용은 캐시 슬라이스 (REQ-ADMIN-060~063 묶음) 에서 수행한다. 본 슬라이스가 cache key 의 single source of truth 를 미리 정의해 두는 의미.

### @MX 태그 후보

@MX 태그는 본 슬라이스의 GREEN 단계에서 추가한다. 우선순위 (`code_comments=ko` 기준):

- `server/api/trpc.ts` 의 `auditLogger` 미들웨어 — **@MX:ANCHOR** (REQ-ADMIN-070 의 단일 진입점. 모든 admin mutation 이 본 미들웨어를 통과해야 AdminLog 가 생성됨. fan_in 즉시 4+ 이며 Slice E 의 menu/site/members 라우터 도입으로 증가.) @MX:REASON: "AdminLog 우회 방지 — resolver 별 수동 기록을 채택하면 신규 mutation 도입 시 매번 잊을 위험이 큼. 본 미들웨어가 protectedAdminProcedure 체인의 마지막에 위치해 모든 mutation 을 자동 기록함."
- `server/api/trpc.ts` 의 `auditLogger` 안 `console.error` 분기 — **@MX:WARN** (AdminLog.create 실패가 silent 로 처리되어 production 에서 감사 로그 손실이 발생해도 발견이 늦을 수 있음.) @MX:REASON: "AdminLog 기록 실패를 mutation 실패로 전파하면 사용자 경험이 무관한 사유로 깨짐. 대신 후속 슬라이스에서 (a) error sink 로 외부 알림, (b) 실패율 메트릭 도입이 필요."
- `server/api/routers/admin/menu.ts` 의 `admin.menu.get` 의 1-depth include — **@MX:NOTE** (트리 깊이 제한. Slice E 의 lazy load 또는 명시적 depth 파라미터 도입 시 본 결정을 참조.) @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030
- `server/api/routers/admin/menu-item.ts` 의 `update` 안 `$transaction` — **@MX:NOTE** (REQ-ADMIN-031 의 transactional 부분 — single update 라 transaction 없이도 atomic 이지만, Slice E 의 batch reorder 가 들어올 때 본 패턴을 확장.) @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
- `app/admin/menu/[id]/page.tsx` 의 "Slice E 에서 드래그앤드롭 도입" 안내 — **@MX:TODO** (REQ-ADMIN-031 UX 표면 미구현.) @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031 @MX:PRIORITY: P1
- `app/admin/logs/page.tsx` 의 "CSV 내보내기 (준비중)" 버튼 — **@MX:TODO** (REQ-ADMIN-072 후반 미구현.) @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072 @MX:PRIORITY: P2
- `lib/admin/cache-keys.ts` 의 `menuCacheKey` — **@MX:NOTE** (REQ-ADMIN-034 의 admin / public 메뉴 캐시 키 분리 — single source of truth. 실제 cache 적용은 캐시 슬라이스에서.) @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-034
- `server/api/trpc.ts` 의 `auditLogger.diff.input` 에 민감 키 마스킹 미적용 — **@MX:TODO** (사이트 설정 슬라이스가 `requireAdminTwoFactor` 같은 민감 필드를 mutation input 으로 받기 시작할 때 마스킹 필요.) @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-081 @MX:PRIORITY: P1

### Dependencies

- 외부 신규 npm 의존성: **없음**. 본 슬라이스는 Slice C 가 도입한 shadcn/ui + lucide-react + sonner 만 사용. dnd-kit / react-query 는 Slice E 도입.
- 내부 의존:
  - `@/server/api/trpc` (Slice B + 본 슬라이스에서 `auditLogger` 확장)
  - `@/server/api/root` (Slice B 의 `appRouter` — admin 라우터 자동 포함)
  - `@/server/api/context` (Slice B 의 `createContext` — siteId 재해석)
  - `@/lib/trpc/server` (Slice C 의 `getServerCaller`)
  - `@/lib/auth/admin-middleware` (Slice B 의 `isAdminSession`)
  - `@/lib/admin/site-context` (Slice C 의 `getCurrentSiteId`)
  - `@rhymix-ts/ui/components` (Slice C 의 shadcn primitives — Button, Table, Input, Label, Dialog)
- Prisma 스키마: 변경 없음. Slice A 가 정의한 Menu / MenuItem / AdminLog 모델 그대로 사용.
- 기존 라우트와의 충돌: `app/admin/menu/*`, `app/admin/logs/` 는 Slice C 의 `app/admin/modules/*` 와 별도 경로. AdminSidebar 의 두 항목 `disabled` 제거가 유일한 기존 파일 수정 (외 Slice B 의 trpc.ts).

### Verification

- `pnpm --filter @rhymix-ts/web typecheck` → 0 errors
- `pnpm --filter @rhymix-ts/web test` → D-1 ~ D-13 모두 GREEN + Slice A/B/C 회귀 없음 (특히 Slice C 의 `admin.module.{create,delete}` 가 본 슬라이스의 `auditLogger` 와 정상 통합되어 `AdminLog.create` 가 호출되는지 — D-1 이 covers)
- `pnpm test` (전체 워크스페이스) → 427+ (Slice C 결과) + 13 신규 = 440+ GREEN, AUTH-001 + Slice A/B/C 회귀 없음
- `pnpm --filter @rhymix-ts/web build` → Next.js build 통과. App Router 의 `[id]` 동적 라우트 (`app/admin/menu/[id]/page.tsx`) 가 올바르게 prerender 처리되는지 확인.
- 브라우저 sanity (수동, Slice C 의 docker-compose / dev DB 환경에서):
  - 관리자 로그인 후 `/admin` → sidebar 의 "메뉴 편집", "관리자 로그" 항목이 enable 상태로 표시.
  - `/admin/menu` → "새 메뉴" 버튼 + 빈 테이블 (또는 기존 menus). "새 메뉴" 클릭 → 폼 → title 입력 후 submit → `/admin/menu` 로 redirect + 행 추가.
  - `/admin/menu/[id]` → 1-depth MenuItem 표시 + "새 MenuItem" 폼 + 각 행에 수정/삭제 버튼. listOrder 숫자 입력으로 reorder 가능.
  - `/admin/logs` → 직전 sanity 의 module / menu CRUD 가 모두 `AdminLog` 행으로 표시됨 (실제 AdminLog 가 정상 기록되는지 확인). actor 필터 / action 필터 / 기간 필터 동작 확인. "CSV 내보내기" 는 disabled 상태로 표시.
  - 비관리자 sanity: 비관리자 로그인 후 `/admin/menu` 접근 → `/login?callbackUrl=/admin/menu` 로 redirect (Slice C 의 layout 가드).
- DB sanity: `psql ... -c "SELECT id, actor_id, action, target, ip, created_at FROM admin_logs ORDER BY created_at DESC LIMIT 20"` — `auditLogger` 가 `admin.module.create`, `admin.menu.create`, `admin.menuItem.update`, `admin.menu.delete` 등 mutation path 를 정확히 기록했는지 확인.
- `git diff --stat main` → 변경 파일 수 확인 (목표: ~17 신규 + 3 수정 = ~20 파일).

### Risks

| 리스크                                                                                       | 영향                                                       | 완화                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auditLogger` 미들웨어가 모든 mutation 마다 `prisma.adminLog.create` 를 동기적으로 await → mutation 응답 지연 | 사용자 응답 시간 증가 (DB write 한 번 추가)                | DB 가 같은 인스턴스에 있어 write latency 는 보통 5ms 이하. 부담이 보이면 후속 슬라이스에서 fire-and-forget (Promise discard) 또는 background queue 로 전환. 본 슬라이스는 동기 write 채택 — 실패 가시성 우선.                                                  |
| `auditLogger` 의 `AdminLog.create` 실패가 silent → production 에서 감사 로그 손실 발견 늦음   | 컴플라이언스 / 보안 인시던트 추적 누락                       | `console.error` 로만 남기는 본 슬라이스의 선택을 `@MX:WARN` 으로 명시. 후속 슬라이스에서 (a) error sink (Sentry 등) 연결, (b) 실패율 메트릭, (c) audit log 의 redundant write (별도 파일 sink) 도입 검토.                                                       |
| `auditLogger.diff.input` 에 사이트 설정의 민감 필드가 그대로 저장될 가능성 (예: `siteSettings.update` 가 추후 도입될 때 비밀 키를 input 으로 받음) | AdminLog 가 비밀 정보 보관소화 — DB 노출 시 2차 피해 확대 | 본 슬라이스에서는 module/menu/log 의 input 에 비밀 정보가 없어 즉시 문제는 없음. 단, `@MX:TODO` 로 마스킹 도입 시점을 Site Settings 슬라이스 (Slice E) 의 사전 작업으로 명시.                                                                                  |
| `AdminLog.id` (BigInt) 가 JSX 렌더 시 `Object.prototype.toString` 으로 변환되어 `[object BigInt]` 또는 throw 가능 | UI 깨짐 또는 SSR 에러                                       | `AdminLogTable` 의 `id` 셀은 `String(log.id)` 로 명시 변환. zod 의 transformer 가 BigInt 를 직렬화하지만 JSX 텍스트로 들어갈 때는 명시 변환이 안전. 단위 테스트는 작성하지 않으나 수동 sanity 로 확인 (Q5).                                                       |
| `admin.menu.get` 의 1-depth include 가 트리 전체를 보여주지 못해 UX 가 빈약                   | 메뉴 트리가 깊을 때 사용자가 펼치기 부담                    | 본 슬라이스 UX 는 1-depth 표시 + 각 item 클릭 시 children 의 `admin.menuItem.list({ menuId, parentId })` 호출 (lazy load). Slice E 의 dnd-kit 도입과 함께 트리 전체 펼침 UX 도 정식 도입. 본 슬라이스에서는 lazy load 패턴이 우선.                            |
| `admin.menuItem.update` 의 `parentId` 변경 시 listOrder 충돌 (같은 parent 의 다른 자식과 listOrder 가 겹침) | UI 표시 순서 비결정성                                       | 본 슬라이스의 UX 는 "listOrder 직접 편집" 이므로 사용자 책임. Slice E 의 dnd-kit + `admin.menuItem.reorder` 가 도입되면 reorder 안에서 같은 parent 의 listOrder 를 일괄 재배열 (0, 10, 20, ...) 패턴으로 자동 정규화. 본 슬라이스의 `update` 는 단순 patch 만. |
| `admin.log.list` 의 결과셋이 수만 행일 때 offset 페이지네이션이 느림 (`OFFSET` cost)            | logs 페이지 응답 지연                                      | 본 슬라이스의 pageSize 상한 200 + 일반 사용 패턴 (최근 50개 보기) 에서는 문제 없음. 후속 슬라이스에서 cursor-based 페이지네이션 (`createdAt`-based) 도입 검토. Risks 표 명시로 충분.                                                                          |
| `auditLogger` 가 `protectedAdminProcedure` 에만 붙어 있어 publicProcedure 가 노출된 admin endpoint 가 있으면 우회 | AdminLog 기록 누락                                          | 본 슬라이스의 admin 라우터는 모두 `protectedAdminProcedure` 사용. 코드 리뷰 단계에서 `grep -r 'publicProcedure' apps/web/server/api/routers/admin/` → 결과 없음 확인. typecheck 가 모든 admin 라우터 가 `protectedAdminProcedure` 인지 verify 하지는 않지만, 표준 패턴으로 보장. |
| MenuItem 의 `groupIds: number[]` 가 빈 배열 (`[]`) 일 때 의미가 "공개" 인지 "모두 비공개" 인지 명시 부재 | ACL 해석 모호                                              | 본 슬라이스는 라우터의 input/output 만 다루므로 ACL 해석 책임 없음. ACL 해석 로직은 메뉴 렌더링 슬라이스 (사이트 표면) 에서 정의. spec.md REQ-ADMIN-032 의 "교집합이 비어 있으면 숨김" 정의를 그대로 따르되, 빈 배열의 의미는 사이트 메뉴 렌더링 슬라이스 SPEC 에서 확정. |
| `admin.menu.get` 의 `NOT_FOUND` TRPCError 가 클라이언트에서 어떻게 표시되는지 미정             | `/admin/menu/[id]` 페이지 가 잘못된 id 로 접근 시 깨짐    | Server Component 가 throw 되면 `error.tsx` boundary 가 처리. Slice C 의 `app/admin/error.tsx` 는 도입되지 않았으므로 본 슬라이스에서 `app/admin/menu/[id]/error.tsx` 도입 검토 — 단, 본 슬라이스의 범위는 라우터 + 기본 UI 까지로 한정하고 error boundary 는 후속 슬라이스에서 정식 도입. 임시로 Server Component 가 `notFound()` 를 호출해 404 페이지로 redirect. |
| UI 컴포넌트 단위 테스트 미작성으로 인해 `MenuItemEditor` 의 분기 (parentId 변경, 빈 트리 등) 회귀가 늦게 발견될 가능성 | 시각 회귀 누락                                              | Slice C 의 UI 테스트 패턴이 있으므로 필요 시 본 슬라이스의 GREEN 단계에서 추가 가능. 본 슬라이스는 우선 비-UI 테스트로 시작하고 수동 sanity 로 보강. e2e 슬라이스 도입 시 정식 회귀 방지. Risks 표 명시.                                                       |
| `auditLogger` 의 `console.error` 가 production 로그에서 사라질 가능성 (Next.js standalone 빌드)| AdminLog 손실을 디버그 어려움                                | 본 슬라이스의 로깅은 `console.error` 만. 후속 SPEC 의 로깅 슬라이스 (만약 도입한다면) 에서 logger 추상화 도입. 본 슬라이스의 결정은 "단순함 우선" — `console.error` 가 stderr 로 가는 한 컨테이너 로그에서 보임. Risks 표 명시.                              |

### Heads-up for Slice E

본 슬라이스가 완료되면 Slice E 는 다음을 이어받는다.

- **드래그앤드롭 reorder (REQ-ADMIN-031 UX)**: `@dnd-kit/core` + `@dnd-kit/sortable` 도입. `admin.menuItem.reorder` 라우터 (배치 reorder — `prisma.$transaction` 으로 다수 MenuItem 의 listOrder 일괄 갱신). `@trpc/react-query` + `TRPCProvider` + `QueryClient` 인프라 도입 (optimistic update). 본 슬라이스의 `MenuItemEditor` 가 자연스럽게 DnD 로 진화.
- **CSV 내보내기 (REQ-ADMIN-072 후반)**: `app/api/admin/logs/export.csv/route.ts` Route Handler — streaming 응답. 본 슬라이스의 `/admin/logs` 페이지의 disabled 버튼 enable 전환.
- **IP 필터 (REQ-ADMIN-072 후반)**: `admin.log.list` 의 input 에 `ip?: string` 추가. 본 슬라이스에서 누락된 필터.
- **`target` 추출 로직 (REQ-ADMIN-071 정련)**: `auditLogger` 가 resolver 의 return value 로부터 `target` 을 자동 추출 (예: `module:notice`, `menu:1`). 본 슬라이스의 빈 문자열을 의미 있는 식별자로 채움.
- **민감 키 마스킹 (REQ-ADMIN-081 사전 작업)**: `auditLogger.diff.input` 의 `*_secret`, `*_key`, `*_token`, `*_password` 패턴 자동 마스킹. Site Settings 슬라이스 도입 전 필수.
- **AdminLog error sink**: `console.error` 를 정식 logger (Pino / Sentry 등) 로 교체. AdminLog.create 실패율 메트릭 도입.
- **Site Settings 페이지 (REQ-ADMIN-050~063)**: `admin.site.*` 라우터 + `/admin/site/settings/page.tsx` + `SiteSetting` 모델 도입. `requireAdminTwoFactor` 필드 도입 — Slice C 의 layout TODO 자리 활성화.
- **2FA 강제 (REQ-ADMIN-023)**: `requireAdmin2FAIfEnabled` 미들웨어 도입 — Slice C 의 layout 의 TODO 자리. Site Settings 슬라이스와 짝.
- **Members 관리 페이지 (US-7)**: `admin.members.*` 라우터 + `/admin/members/page.tsx`. AUTH-001 의 User / UserGroup 표면. 사이트별 그룹 권한 편집.
- **캐시 슬라이스 (REQ-ADMIN-060~063)**: 본 슬라이스의 `menuCacheKey` constant 를 실제 `unstable_cache` 와 결합. 캐시 invalidation hook (mutation 후 revalidateTag).
- **Admin Shell error boundary**: `app/admin/error.tsx` + `app/admin/menu/[id]/error.tsx`. TRPCError NOT_FOUND 의 친화적 표시.
- **MenuItem 트리 전체 펼침 UX**: 본 슬라이스의 1-depth + lazy load 패턴 위에 "모두 펼치기" 액션 도입. dnd-kit 와 함께.
- **MenuItem 의 `normalBtn / hoverBtn / activeBtn` 시각 편집기**: 본 슬라이스의 raw JSON textarea 를 컬러 피커 + 이미지 업로더로 교체. SPEC-THEME-001 와 연계.
- **UI 컴포넌트 단위 테스트 보강**: `MenuItemEditor`, `AdminLogTable`, `AdminLogFilters` 의 React Testing Library 테스트. 본 슬라이스에서 미작성 (Risks 항목).

---

## Open Questions (Slice D 종료 시점 재검토 예정)

1. **`auditLogger` 의 `target` 추출 패턴** — 본 슬라이스는 빈 문자열. 후속 슬라이스에서 (a) resolver 가 반환한 객체의 `id` / `mid` 자동 추출, (b) procedure metadata 로 `targetFormat` 선언 (예: `target: "module:${mid}"`), (c) middleware 에서 path 파싱 후 first segment 사용 — 중 어느 패턴이 가장 견고한지 결정 필요.
2. **AdminLog 의 `failure` 케이스 추적** — 본 슬라이스는 성공 mutation 만 기록. 실패한 mutation (예: mid 충돌) 도 별도 테이블 / 또는 동일 테이블의 `success: boolean` 컬럼으로 기록할지는 별도 SPEC 의 보안 / 컴플라이언스 요구에 따라 결정.
3. **MenuItem `groupIds` 의 빈 배열 의미** — REQ-ADMIN-032 의 "교집합이 비어 있으면 숨김" 해석에서 `groupIds=[]` 는 (a) 모두에게 공개, (b) 아무도 못 봄 둘 다 가능. 메뉴 렌더링 슬라이스가 정의해야 하지만 본 슬라이스의 admin UI 의 placeholder/안내 문구가 이를 명시해야 함.
4. **`admin.log.list` 의 cursor 페이지네이션 도입 시점** — offset 페이지네이션의 비용은 `OFFSET 10000` 이상에서 가시화. logs 가 수만 행 누적 시점에 cursor (`createdAt + id`) 로 전환할지를 모니터링 후 결정.
5. **`admin.menu.get` 의 1-depth 제한** — 본 슬라이스는 lazy load. 트리 전체 깊이가 보통 2~3 단계에 그치면 한 번에 다 fetch 하는 편이 lazy load 보다 단순. 실제 사용 패턴 (메뉴 깊이 분포) 데이터 누적 후 Slice E 에서 결정.
6. **`MenuItemEditor` 의 raw JSON textarea (normalBtn/hoverBtn/activeBtn)** — UX 가 부담스러움. Slice E 의 시각 편집기 (또는 SPEC-THEME-001 의 디자인 토큰 슬라이스) 와 통합 시점을 명확히.
7. **AdminLog 의 long-term 보존 정책** — 컴플라이언스 (예: 1년 보관) 가 추후 SPEC 에서 도입되면 본 슬라이스의 AdminLog 가 무한 누적되는 문제 발생. retention policy + archive 슬라이스가 별도로 필요.

---

Version: 1.0.0
Created: 2026-05-16
Author: manager-spec via /moai plan SPEC-ADMIN-001 Slice D
