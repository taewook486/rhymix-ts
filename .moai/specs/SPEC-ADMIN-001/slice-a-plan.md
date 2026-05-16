# SPEC-ADMIN-001 Slice A Plan

Status: ready
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: Foundation 스키마 + 도메인 레이어 (UI / 미들웨어 / tRPC 없음)
Base: main = 0cadb8e (AUTH-001 Slice H 완료 — 291 tests green)

> **Note**: 본 슬라이스는 SPEC-ADMIN-001 "Module Instance System" 의 **순수 백엔드 기반** 만 다룬다. Host 해석 미들웨어, `[mid]` 라우팅, tRPC `admin.module.*` 엔드포인트, Admin Shell UI 는 Slice B 이후에서 분리해 다룬다. Slice A 의 산출물은 (a) Prisma schema 의 Foundation 모델 8 종, (b) 모듈 레지스트리 + ModuleDefinition 인터페이스, (c) `mid` 검증 함수, (d) `createModuleInstance` / `deleteModuleInstance` / `getModuleInstanceByMid` 서비스 함수다. 이 네 가지가 Slice B 의 라우팅/미들웨어/UI 가 의존할 수 있는 안정적 계약을 제공한다.

---

## Pre-Flight Findings (2026-05-16)

Slice A 착수 직전 spec.md 의 Domain Model 섹션과 현재 schema.prisma, 그리고 AUTH-001 의 admin/audit 코드를 점검해 다음 세 가지 항목을 결론지었다.

### Q1: AdminLog vs AuditLog — 별도 테이블로 신설

AUTH-001 Slice D2 에서 도입한 `AuditLog` 는 다음 형태로 이미 운용 중이다 (packages/db/prisma/schema.prisma:322).

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  actorId   Int?
  targetId  Int?       // user.id 정수 참조 전용
  action    String     // STATUS_CHANGED | MEMBER_DELETED | SESSION_REVOKED | ADMIN_PROMOTED | ADMIN_DEMOTED
  metadata  Json       // { previousStatus, newStatus, reason, ... }
  ip        String?
  userAgent String?
  createdAt DateTime
}
```

반면 spec.md (line 543~556, REQ-ADMIN-070~072) 가 정의하는 `AdminLog` 는 다음과 같이 의도가 다르다.

```prisma
model AdminLog {
  id         BigInt   @id @default(autoincrement())
  actorId    Int
  action     String     // create | update | delete | configure | cache.purge.all
  target     String     // "module:notice" | "menu:1" | "site:settings" — 문자열 descriptor
  diff       Json       // { name: ["Old","New"] }
  ip         String?
  userAgent  String?
  createdAt  DateTime
}
```

세 가지 차이가 결정적이다.

| 항목       | AuditLog (AUTH)           | AdminLog (ADMIN)                          |
| ---------- | ------------------------- | ----------------------------------------- |
| PK         | `Int`                     | **`BigInt`** (운영 환경 폭증 대비)        |
| target     | `targetId: Int?` (user.id) | **`target: String`** (`"module:notice"`)  |
| 변경 내용  | `metadata: Json` (이벤트별 자유) | **`diff: Json`** (before/after 페어)   |
| 주 사용처  | 인증 도메인 이벤트 (성공/실패) | **관리자 mutation 의 before/after 추적** |

→ **채택 경로**: `AdminLog` 를 별도 모델로 신설한다. AUTH 의 `AuditLog` 는 변경하지 않으며, 두 테이블은 의도가 다르므로 공존한다. Slice A 는 모델만 만들고 실제 기록 로직은 Slice B (tRPC 미들웨어 `auditLogger`) 에서 도입한다.

### Q2: `mid` unique 제약 — `(siteId, mid)` 복합 유니크 (spec.md 명시)

현재 schema.prisma 의 `ModuleInstance.mid` 는 전역 `@unique` 로 선언되어 있다 (line 81). 그러나 spec.md (line 459) 와 REQ-ADMIN-001 / US-1 (멀티 사이트 운영) 은 명시적으로 다음을 요구한다.

```prisma
@@unique([siteId, mid])
```

→ **채택 경로**: 현재 `mid String @unique` 를 제거하고 `mid String @db.Citext` + `@@unique([siteId, mid])` 로 마이그레이션한다. citext 확장은 AUTH-001 에서 이미 활성화되어 있다 (schema.prisma line 20, `extensions = [citext, pgcrypto]`). 단일 사이트 MVP 시나리오에서도 (siteId=1, mid="notice") 와 (siteId=2, mid="notice") 의 분리 운용이 가능해진다.

### Q3: ModuleDefinition / Registry / Service 위치 — `packages/core/src/modules/`

신규 도메인 레이어를 어디에 둘지 세 가지 후보를 검토했다.

| 후보                          | 장점                                          | 단점                                       |
| ----------------------------- | --------------------------------------------- | ------------------------------------------ |
| `packages/admin/` 신규 패키지 | 명시적 도메인 분리                            | 빈 패키지 추가 비용, 의존 그래프 복잡화    |
| `packages/modules/` 신규 패키지 | "module system" 이라는 SPEC 정체성과 일치    | 동일한 빈 패키지 비용                      |
| **`packages/core/src/modules/`** (채택) | 기존 워크스페이스 재사용 (`@rhymix-ts/core`), 신규 의존 없음 | `core` 가 약간 비대해짐 (수용 가능) |

`packages/core` 는 이미 `@rhymix-ts/core` 워크스페이스로 존재하며 `install/diagnostics` 등 부트스트랩 코드의 거점 역할을 한다 (packages/core/package.json). 모듈 레지스트리는 (a) SSR 렌더링 시 `[mid]/page.tsx` 에서 로딩, (b) tRPC `admin.module.*` 라우터에서 로딩, (c) install seed 에서 로딩 — 세 위치 모두에서 import 되므로 shared 패키지가 자연스럽다. `packages/auth` 와 동일한 패턴 (`@rhymix-ts/auth` workspace) 을 따른다.

→ **채택 경로**: `packages/core/src/modules/` 디렉터리에 본 슬라이스 산출물을 둔다. exports 는 `packages/core/package.json` 의 `exports` 맵에 `"./modules"` 를 추가한다.

---

## Migration Strategy

AUTH-001 슬라이스에서 이미 `prisma migrate dev --create-only --name <ts>_<name>` 워크플로를 정착시켰다 (packages/db/prisma/migrations/ 에 `20260510170500_init`, `20260510170600_session_revocation` 등 누적). 본 슬라이스의 schema 변경은 단일 migration 으로 묶는다.

- **Migration name**: `add_admin_foundation_models`
- **적용 범위**: Site / Domain / ModuleInstance 컬럼 확장 + ModuleConfig / Menu / MenuItem / AdminLog / AdminFavorite 신규 테이블 7 종 + 관련 인덱스
- **Drift 처리**: `ModuleInstance.mid` 의 unique 제약 변경 (`@unique` 제거 + `@@unique([siteId, mid])` 추가) 은 destructive 가능. dev DB 에 기존 row 가 거의 없을 것이나 `prisma migrate dev --create-only` 로 SQL 검토 후 apply.
- **citext 활성화**: 이미 활성화됨 (AUTH-001 Slice A). 추가 작업 불필요. `Domain.hostname` 과 `ModuleInstance.mid` 가 `@db.Citext` 를 사용한다.
- **SPEC-INSTALL-001 seed 호환성**: install seed 는 현재 Site 1 행 + Domain 1 행만 생성한다 (SPEC-ADMIN-001 spec.md 999~1014 의 자동 프로비저닝은 INSTALL-001 의 후속 작업이며 본 슬라이스 범위 아님). Site 의 `defaultLanguage`/`timeZone` 컬럼은 변경 없이 유지되므로 seed 회귀 없음. Domain 에 신규 컬럼 (`forceHttps`, `indexModuleInstanceId`, `settings` 등) 이 추가되지만 모두 default 값이 있어 기존 seed insert 가 그대로 동작한다.

---

## Slice A — Foundation Schema + Domain Layer

### Goal

SPEC-ADMIN-001 의 Module Instance System / Multi-Domain 기반을 구성하는 (a) Prisma 스키마와 (b) 모듈 레지스트리 + 인스턴스 서비스의 순수 백엔드 계층을 완성한다. Slice B 이후의 미들웨어/라우팅/UI 가 의존할 수 있는 안정적 도메인 계약 (`ModuleDefinition` 인터페이스, `validateMid` 함수, `createModuleInstance` / `deleteModuleInstance` / `getModuleInstanceByMid` 함수) 을 RED first 로 만들어 둔다.

### Branch

`feature/admin-001-slice-a` (base: main = 0cadb8e)

### REQ / AC scope

Slice A 에서 완전 구현:

- **REQ-ADMIN-001** (`mid` citext, 길이 1-80, 패턴 `^[a-z0-9][a-z0-9_-]*$`) — schema `ModuleInstance.mid @db.Citext` + `validateMid` 함수
- **REQ-ADMIN-002** (`mid` 생성 시 4단계 검증) — `validateMid` (패턴/예약어/충돌) + `createModuleInstance` (DB 유니크)
- **REQ-ADMIN-003** (`mid` 예약어 차단) — `RESERVED_MIDS` 상수 + `validateMid` 의 두 번째 단계
- **REQ-ADMIN-004** (`onInstall` 훅 + 트랜잭션 롤백) — `createModuleInstance` 가 `prisma.$transaction` 안에서 `def.onInstall(ctx)` 호출
- **REQ-ADMIN-005** (`onUninstall` 훅) — `deleteModuleInstance` 가 동일 트랜잭션 안에서 `def.onUninstall(ctx)` 호출
- **REQ-ADMIN-006** (`indexModuleInstanceId` 참조 시 삭제 금지, 409) — `deleteModuleInstance` 가 사전 조회 + `IndexModuleProtectedError` 발생
- **REQ-ADMIN-007** (`ModuleInstance` 코어 + `ModuleConfig` JSON 분리 + Zod 검증) — schema 의 1:1 FK + `createModuleInstance` 가 `def.configSchema.parse(defaultConfig)` 적용

Slice A 에서 schema 만 준비 (실제 기록/조회는 Slice B+):

- REQ-ADMIN-070 ~ 072 (AdminLog) — 모델만 신설, mutation 경로에서의 기록 로직은 Slice B 의 tRPC `auditLogger` 미들웨어 단계

명시적으로 Slice A 범위 밖 (Slice B 이후):

- REQ-ADMIN-010 ~ 014 (Host 해석 미들웨어, `[mid]` 라우팅, HTTPS 강제) → Slice B
- REQ-ADMIN-020 ~ 023 (`/admin` 라우트 가드, 2FA) → Slice B
- REQ-ADMIN-030 ~ 034 (Menu / MenuItem CRUD, 캐시) → 스키마는 본 슬라이스, 도메인 로직은 별도
- REQ-ADMIN-040 ~ 043 (Widget Registry) → 별도 슬라이스 (Widget 도 본 슬라이스의 schema 범위에 들어가지 않음 — Slice A 는 Module 만)
- REQ-ADMIN-050 ~ 063 (사이트 설정 / 캐시 액션) → Slice B
- REQ-ADMIN-080 ~ 101 (헬스, 가져오기/내보내기, 즐겨찾기) → 후속 슬라이스 (AdminFavorite schema 만 본 슬라이스에서 준비)

### Schema changes (`packages/db/prisma/schema.prisma`)

#### 1. `Site` — 컬럼명 정렬 (기존 모델 유지)

현재 `defaultLanguage`, `timeZone` 이 존재한다 (line 29-30). spec.md 의 `Site` 모델은 `defaultLanguage` + `defaultTimezone` 을 요구한다 (line 398-399). 한 컬럼명 차이 (`timeZone` vs `defaultTimezone`) 가 있으나 의미는 동일하다. **현재 명칭 (`timeZone`) 을 유지**하고 spec.md 와의 정렬은 Slice B 의 tRPC layer 에서 alias 로 처리한다 (INSTALL-001 seed 호환성 우선). spec.md 의 `contactEmail` / `settings Json` 는 본 슬라이스에서 추가하지 않는다 (REQ-ADMIN-051 은 Slice B 의 site settings 슬라이스 범위).

→ **변경 없음**

#### 2. `Domain` — 확장

현재 schema (line 63-76):

```prisma
model Domain {
  id              Int     @id @default(autoincrement())
  siteId          Int
  hostname        String  @unique          // ← citext 로 변경
  isDefault       Boolean @default(false)
  defaultLayoutId Int?
  defaultMenuId   Int?
  scheme          String  @default("https") // ← forceHttps 로 의미 통합 가능하나 본 슬라이스에서는 유지
  ...
}
```

spec.md (line 411-434) 요구사항 적용:

```prisma
model Domain {
  id                       Int      @id @default(autoincrement())
  siteId                   Int
  site                     Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  hostname                 String   @unique @db.Citext         // ← @db.Citext 추가
  isDefault                Boolean  @default(false)
  forceHttps               Boolean  @default(true)              // ← 신규
  defaultLanguage          String?                              // ← 신규 (도메인별 오버라이드)
  defaultTimezone          String?                              // ← 신규
  defaultLayoutId          Int?
  defaultMobileLayoutId    Int?                                 // ← 신규
  defaultMenuId            Int?
  indexModuleInstanceId    Int?                                 // ← 신규 FK
  indexModuleInstance      ModuleInstance? @relation("IndexModule", fields: [indexModuleInstanceId], references: [id])
  scheme                   String   @default("https")           // ← 유지 (`http`/`https` 문자열 — install 단계 호환)
  settings                 Json     @default("{}")              // ← 신규 (robots, csp 등)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([siteId])
  @@map("domains")
}
```

- `scheme` 과 `forceHttps` 가 의미적으로 겹친다. 현재 install seed 는 `scheme="https"` 만 설정하므로, `forceHttps` 는 `(scheme === "https")` 로부터 default `true` 를 갖되 별도 column 으로 분리한다. Slice B 의 미들웨어 (REQ-ADMIN-014) 는 `forceHttps` 만 본다.

#### 3. `ModuleInstance` — 확장 (핵심 변경)

현재 schema (line 79-91) 는 stub 수준이다. spec.md (line 436-462) 의 완전 정의로 교체:

```prisma
model ModuleInstance {
  id                Int       @id @default(autoincrement())
  siteId            Int                                         // ← non-nullable 로 승격 (현재 Int?)
  site              Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  moduleCode        String                                       // ← 신규 (현재 `module` 컬럼을 `moduleCode` 로 개명)
  mid               String    @db.Citext                         // ← @unique 제거 + @db.Citext 추가
  name              String                                       // ← 신규
  browserTitle      String?                                      // ← 신규
  description       String?                                      // ← 신규
  layoutId          Int?                                         // ← 신규
  mobileLayoutId    Int?                                         // ← 신규
  skin              String?                                      // ← 신규
  mobileSkin        String?                                      // ← 신규
  menuId            Int?                                         // ← 신규
  isDefault         Boolean   @default(false)                    // ← 유지
  rssEnabled        Boolean   @default(false)                    // ← 신규
  rssTitle          String?                                      // ← 신규
  rssDescription    String?                                      // ← 신규
  config            ModuleConfig?                                // ← 1:1 (신규 ModuleConfig 모델)
  domainsAsIndex    Domain[]  @relation("IndexModule")           // ← 신규 역참조
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([siteId, mid])                                        // ← 핵심: 전역 unique 제거 + 복합 unique
  @@index([moduleCode])                                          // ← 기존 `@@index([module])` 를 개명
  @@map("module_instances")
}
```

- **Destructive change**: 현재 `mid String @unique` → `mid String @db.Citext` + `@@unique([siteId, mid])`. 현재 dev DB 에 row 가 거의 없으므로 영향 미미.
- **컬럼 개명**: `module` → `moduleCode` (Q2 의 spec.md 명칭 정렬). install seed 도 `module` 로 insert 하지 않으므로 호환성 영향 없음.
- 기존 `config Json @default("{}")` 컬럼은 제거하고 `ModuleConfig` 1:1 FK 로 분리 (REQ-ADMIN-007).

#### 4. `ModuleConfig` — 신규

```prisma
model ModuleConfig {
  id                Int            @id @default(autoincrement())
  moduleInstanceId  Int            @unique
  moduleInstance    ModuleInstance @relation(fields: [moduleInstanceId], references: [id], onDelete: Cascade)
  config            Json           @default("{}")
  updatedAt         DateTime       @updatedAt

  @@map("module_configs")
}
```

#### 5. `Menu` — 신규

```prisma
model Menu {
  id          Int        @id @default(autoincrement())
  siteId      Int
  site        Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
  title       String
  isAdminMenu Boolean    @default(false)
  listOrder   Int        @default(0)
  items       MenuItem[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([siteId])
  @@map("menus")
}
```

#### 6. `MenuItem` — 신규 (트리)

```prisma
model MenuItem {
  id              Int        @id @default(autoincrement())
  menuId          Int
  menu            Menu       @relation(fields: [menuId], references: [id], onDelete: Cascade)
  parentId        Int?
  parent          MenuItem?  @relation("MenuItemTree", fields: [parentId], references: [id], onDelete: Cascade)
  children        MenuItem[] @relation("MenuItemTree")
  title           String
  url             String?
  icon            String?
  cssClass        String?
  description     String?
  groupIds        Int[]      @default([])
  openInNewWindow Boolean    @default(false)
  expand          Boolean    @default(false)
  listOrder       Int        @default(0)
  normalBtn       Json?
  hoverBtn        Json?
  activeBtn       Json?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([menuId, parentId, listOrder])
  @@map("menu_items")
}
```

#### 7. `AdminLog` — 신규 (Q1 의 결정 반영, AuditLog 와 별도)

```prisma
model AdminLog {
  id         BigInt   @id @default(autoincrement())
  actorId    Int
  action     String     // "create" | "update" | "delete" | "configure" | "cache.purge.all" | ...
  target     String     // "module:notice" | "menu:1" | "site:settings"
  diff       Json       @default("{}")
  ip         String?
  userAgent  String?
  createdAt  DateTime   @default(now()) @db.Timestamptz

  @@index([actorId, createdAt])
  @@index([target, createdAt])
  @@index([action, createdAt])
  @@map("admin_logs")
}
```

#### 8. `AdminFavorite` — 신규

```prisma
model AdminFavorite {
  id         Int      @id @default(autoincrement())
  memberId   Int      // → User.id (AUTH-001 Slice A 에서 도입한 User 모델)
  user       User     @relation(fields: [memberId], references: [id], onDelete: Cascade)
  label      String
  href       String
  icon       String?
  listOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([memberId, listOrder])
  @@map("admin_favorites")
}
```

- `User` 모델에 역참조 추가: `adminFavorites AdminFavorite[]` (한 줄 추가).

### Files (new + modified)

| File                                                                                | Status | Purpose                                                                          |
| ----------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`                                                  | edit   | 위 8 개 모델 변경 / 신설                                                          |
| `packages/db/prisma/migrations/<ts>_add_admin_foundation_models/migration.sql`      | new    | `add_admin_foundation_models` migration                                          |
| `packages/core/package.json`                                                        | edit   | exports 맵에 `"./modules"` 추가                                                   |
| `packages/core/src/modules/types.ts`                                                | new    | `ModuleDefinition<TConfig>` 인터페이스 + `ModuleLifecycleContext` + 에러 타입    |
| `packages/core/src/modules/registry.ts`                                             | new    | `registerModule(def)`, `getModule(code)`, `listModules()`, `resetRegistry()`     |
| `packages/core/src/modules/registry.test.ts`                                        | new    | RED first                                                                         |
| `packages/core/src/modules/mid-validator.ts`                                        | new    | `RESERVED_MIDS` 상수 + `validateMid(mid): MidValidationResult`                   |
| `packages/core/src/modules/mid-validator.test.ts`                                   | new    | RED first                                                                         |
| `packages/core/src/modules/module-instance-service.ts`                              | new    | `createModuleInstance`, `deleteModuleInstance`, `getModuleInstanceByMid`         |
| `packages/core/src/modules/module-instance-service.test.ts`                         | new    | RED first                                                                         |
| `packages/core/src/modules/errors.ts`                                               | new    | `MidInvalidError`, `MidReservedError`, `MidConflictError`, `IndexModuleProtectedError`, `ModuleNotRegisteredError` |
| `packages/core/src/modules/index.ts`                                                | new    | barrel exports                                                                    |
| `packages/core/src/index.ts`                                                        | edit   | `export * as modules from './modules'` (옵션, namespace 노출용)                  |
| `.moai/specs/SPEC-ADMIN-001/progress.md`                                            | new    | Slice A 결과 섹션 (마지막에 작성)                                                 |

### Test plan (RED first, 13+ tests)

본 슬라이스는 TDD 모드를 따른다. 각 테스트는 RED 부터 시작해 GREEN 으로 진행한다. test runner 는 `vitest` (root `package.json` scripts 확인).

#### `mid-validator.test.ts` — 5 tests

- **A-1**: `validateMid("board-1")` → `{ ok: true }` (유효 패턴, 예약어 아님)
- **A-2**: `validateMid("Board")` → `{ ok: false, code: "INVALID_PATTERN" }` (대문자 금지)
- **A-3**: `validateMid("admin")` → `{ ok: false, code: "RESERVED_KEYWORD" }`
- **A-4**: `validateMid("_next")` → `{ ok: false, code: "RESERVED_KEYWORD" }`
- **A-5**: `validateMid("")` → `{ ok: false, code: "INVALID_LENGTH" }` 및 81자 문자열 → 동일

`RESERVED_MIDS` 상수 정의 (REQ-ADMIN-003 예약어 목록과 spec.md line 108 의 "etc." 를 반영):

```ts
export const RESERVED_MIDS = new Set([
  "admin", "api", "_next", "static", "assets",
  "health", "auth", "404", "500",
  "robots.txt", "sitemap.xml", "favicon.ico",
]);
```

#### `module-instance-service.test.ts` — 6 tests

테스트 픽스처: vitest setup 에서 install seed 가 Site(id=1) + Domain(hostname="localhost") 1행을 생성한다고 가정. 본 슬라이스의 테스트는 Site 1 을 그대로 사용한다.

테스트용 `ModuleDefinition` 픽스처:

```ts
const fakeBoard: ModuleDefinition<{ skinName: string }> = {
  code: "board",
  displayName: "Board",
  configSchema: z.object({ skinName: z.string() }),
  defaultConfig: { skinName: "default" },
  onInstall: vi.fn(async () => {}),
  onUninstall: vi.fn(async () => {}),
  routes: {},
};
```

- **A-6**: `createModuleInstance({ siteId: 1, moduleCode: "board", mid: "notice", name: "Notice" })` 호출 시 (a) `ModuleInstance` row 1개 생성, (b) `ModuleConfig` row 1개 생성 (config = defaultConfig 가 Zod 통과), (c) `fakeBoard.onInstall` 이 1회 호출됨 (tx + instance 인자 포함).
- **A-7**: 동일 (siteId, mid) 두 번째 호출 → `MidConflictError` 발생 + DB row count 는 1 유지 (롤백 검증). 첫 번째 row 는 그대로 유지.
- **A-8**: `fakeBoard.onInstall = vi.fn(async () => { throw new Error("install failed"); })` 로 모킹 후 호출 → 에러가 propagate 되고 `ModuleInstance` / `ModuleConfig` row 가 0개 (트랜잭션 전체 롤백, REQ-ADMIN-004).
- **A-9**: 인스턴스 X 생성 후 `Domain.indexModuleInstanceId = X.id` 로 갱신, `deleteModuleInstance(X.id)` 호출 → `IndexModuleProtectedError` 발생 + row 잔존 (REQ-ADMIN-006).
- **A-10**: `deleteModuleInstance(X.id)` 정상 호출 (index 참조 없음) → (a) `fakeBoard.onUninstall` 1회 호출, (b) `ModuleInstance` row 삭제, (c) `ModuleConfig` row 도 cascade 로 삭제 (REQ-ADMIN-005).
- **A-11**: `createModuleInstance({ siteId: 1, mid: "Board" })` 후 `getModuleInstanceByMid(1, "BOARD")` → 동일 row 반환 (citext 대소문자 무관, REQ-ADMIN-001).

#### `registry.test.ts` — 3 tests

- **A-12**: `registerModule(fakeBoard)` → `getModule("board")` 가 `fakeBoard` 반환. `listModules()` 가 `[fakeBoard]` 반환.
- **A-13**: 미등록 코드 → `getModule("wiki")` 가 `ModuleNotRegisteredError` 발생 (혹은 `undefined` 반환 — spec.md line 769 의 throw 패턴을 따른다 → throw).
- **A-14**: 동일 코드 중복 등록 → `registerModule(fakeBoard)` 두 번째 호출 시 명시적 에러 (spec.md line 763 `already registered`). `resetRegistry()` 후에는 재등록 가능.

→ 총 14 개 테스트 (A-1 ~ A-14).

### Domain layer contract (간단 시그니처)

```ts
// packages/core/src/modules/types.ts
export interface ModuleDefinition<TConfig = unknown> {
  code: string;
  displayName: string;
  description?: string;
  configSchema: z.ZodType<TConfig>;
  defaultConfig: TConfig;
  onInstall?:   (ctx: ModuleLifecycleContext) => Promise<void>;
  onUninstall?: (ctx: ModuleLifecycleContext) => Promise<void>;
  onConfigure?: (ctx: ModuleLifecycleContext, prev: TConfig, next: TConfig) => Promise<void>;
  routes: ModuleRouteMap;          // Slice A 에서는 빈 객체 허용; Slice B 에서 채움
  adminPages?: ModuleAdminPage[];  // Slice A 에서는 미정의 허용
  cacheTags?: (instanceId: number) => string[];
}

export interface ModuleLifecycleContext {
  tx: PrismaTransactionClient;     // AUTH-001 D1 에서 도입한 TransactionClient 타입 재사용
  instance: ModuleInstance;
  actor: { memberId: number; ip?: string; userAgent?: string };
}

// packages/core/src/modules/registry.ts
export function registerModule(def: ModuleDefinition): void;
export function getModule(code: string): ModuleDefinition;            // throws ModuleNotRegisteredError
export function listModules(): ModuleDefinition[];
export function resetRegistry(): void;                                // test only

// packages/core/src/modules/mid-validator.ts
export type MidValidationResult =
  | { ok: true }
  | { ok: false; code: "INVALID_LENGTH" | "INVALID_PATTERN" | "RESERVED_KEYWORD" };
export const RESERVED_MIDS: ReadonlySet<string>;
export function validateMid(mid: string): MidValidationResult;

// packages/core/src/modules/module-instance-service.ts
export interface CreateInstanceInput {
  siteId: number;
  moduleCode: string;
  mid: string;
  name: string;
  config?: unknown;             // 미지정 시 def.defaultConfig
  actor: { memberId: number; ip?: string; userAgent?: string };
}
export async function createModuleInstance(
  input: CreateInstanceInput,
  ctx: { prisma: PrismaClient },
): Promise<ModuleInstance & { config: ModuleConfig }>;

export async function deleteModuleInstance(
  instanceId: number,
  actor: { memberId: number; ip?: string; userAgent?: string },
  ctx: { prisma: PrismaClient },
): Promise<{ ok: true; deletedId: number }>;

export async function getModuleInstanceByMid(
  siteId: number,
  mid: string,
  ctx: { prisma: PrismaClient },
): Promise<(ModuleInstance & { config: ModuleConfig | null }) | null>;
```

### REQ → Enforcement chain

| REQ            | 함수 / 모델                                                | 테스트            |
| -------------- | --------------------------------------------------------- | ----------------- |
| REQ-ADMIN-001  | `ModuleInstance.mid @db.Citext` + `validateMid` 길이/패턴 | A-1, A-2, A-5     |
| REQ-ADMIN-002  | `createModuleInstance` 진입 시 `validateMid` 호출 + DB unique | A-6, A-7      |
| REQ-ADMIN-003  | `RESERVED_MIDS` 상수 + `validateMid` 두 번째 단계         | A-3, A-4          |
| REQ-ADMIN-004  | `createModuleInstance` 의 `prisma.$transaction` + `def.onInstall(ctx)` | A-6, A-8 |
| REQ-ADMIN-005  | `deleteModuleInstance` 의 `def.onUninstall(ctx)` 호출     | A-10              |
| REQ-ADMIN-006  | `deleteModuleInstance` 의 `Domain.indexModuleInstanceId` 사전 조회 | A-9        |
| REQ-ADMIN-007  | `ModuleConfig` 1:1 FK + `def.configSchema.parse(config)`  | A-6 (config 검증) |

### @MX 태그 후보

@MX 태그는 본 슬라이스의 GREEN 단계에서 추가한다. 우선순위는 다음과 같다 (`code_comments=ko` 기준).

- `createModuleInstance` — **@MX:ANCHOR** (REQ-ADMIN-004 의 onInstall 트랜잭션 단일 진입점. tRPC, install seed, programmatic API 가 모두 이 함수를 통과해야 한다.)
- `deleteModuleInstance` — **@MX:ANCHOR** (REQ-ADMIN-005 / 006 의 onUninstall + 인덱스 보호 단일 진입점)
- `validateMid` — **@MX:ANCHOR** (REQ-ADMIN-001 ~ 003 의 4단계 검증 단일 함수. 어떤 mutation 경로도 이 함수를 거치지 않고 ModuleInstance 를 만들 수 없도록 한다.)
- `registry.ts` 의 모듈 레벨 `REGISTRY` Map — **@MX:WARN** (process-scoped state. Next.js dev mode 의 HMR 또는 serverless 환경에서 레지스트리가 초기화될 수 있다. @MX:REASON 으로 "module-level singleton; relies on Node.js single-process runtime; not safe under per-request worker isolation" 명시.)
- `RESERVED_MIDS` 상수 — **@MX:NOTE** (목록 변경 시 마이그레이션 영향 — 기존에 생성된 인스턴스 mid 와 충돌 가능성)

### Dependencies

- 외부 신규 npm 의존성 없음 (`zod` 는 `@rhymix-ts/core` 가 이미 의존).
- 내부 의존: `@rhymix-ts/db` (Prisma client, `PrismaTransactionClient` 타입), `@rhymix-ts/auth` 와는 무관 (본 슬라이스는 actor 정보를 단순 객체로만 받음).
- AUTH-001 의 `TransactionClient` 패턴 재사용 (AUTH-001 D1 에서 외부 트랜잭션 수용 패턴을 정착시킴, packages/auth/src/admin.ts:184 의 `revokeAllSessions(..., { prisma: tx })` 와 동일 형태). 본 슬라이스의 `createModuleInstance` 도 동일한 시그니처 룰을 따른다 (단, Slice A 에서는 service 함수가 직접 `prisma.$transaction` 을 시작; 외부 tx 수용은 Slice B 의 tRPC layer 와 통합할 때 필요해지면 도입).

### Verification

- `pnpm --filter @rhymix-ts/db prisma migrate dev --name add_admin_foundation_models --create-only` → 생성된 SQL 검토 → apply
- `pnpm --filter @rhymix-ts/db prisma validate`
- `pnpm --filter @rhymix-ts/core typecheck`
- `pnpm --filter @rhymix-ts/db typecheck`
- `pnpm test` (전체 워크스페이스, AUTH-001 의 291 + 본 슬라이스의 14 개 신규 테스트 = 305+ 모두 GREEN)
- `git diff --stat main` — 변경 파일 수 확인 (목표: ~13 개 + migration SQL 1 개)

### Risks

| 리스크                                                                                 | 영향                                                       | 완화                                                                                                                            |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ModuleInstance.mid @unique` 제거 시 dev DB drift                                     | migration apply 실패                                       | `prisma migrate dev --create-only` 로 SQL 사전 검토. 필요 시 `DROP INDEX` 명시. 현재 dev DB 의 `ModuleInstance` row 가 0개로 추정됨. |
| 레지스트리 process-scoped 한계 (HMR / serverless)                                      | dev 환경에서 모듈이 중복 등록되어 "already registered" 에러 | `@MX:WARN` 으로 명시 + `registerModule` 이 dev 환경 (`process.env.NODE_ENV !== 'production'`) 에서는 중복 등록 시 silent overwrite 옵션 (별도 결정. Slice A 에서는 strict throw 유지, HMR 충돌은 Slice B 에서 부트스트랩 패턴으로 해결) |
| `onInstall` 훅 안에서 외부 모듈 코드가 트랜잭션 외부 작업 (파일 I/O, fetch) 수행      | 트랜잭션 롤백되어도 외부 부수효과 잔존                     | `ModuleLifecycleContext` 인터페이스 docstring 에 "tx 안에서만 prisma 호출. 외부 I/O 는 onInstall 의 책임이 아님 — 별도 hook 후 처리" 명시. 본 슬라이스는 정책 문서화만, 강제 enforcement 는 도입 안 함. |
| AUTH-001 의 `AuditLog` 와 본 슬라이스의 `AdminLog` 가 운영자에게 혼동을 줄 가능성     | 디버깅 시 어느 테이블을 봐야 하는지 불명확                 | 본 슬라이스에서 `AdminLog` 신설은 schema 만, 실제 기록은 Slice B 의 tRPC `auditLogger` 미들웨어에서 시작. README / progress.md 에 두 테이블의 역할 분리 명시. |
| `ModuleInstance.config Json` 제거 → `ModuleConfig` 1:1 분리의 마이그레이션 데이터 이전 | 기존 row 의 config 손실 가능성                             | 현재 dev DB row 가 0개 추정. 운영 환경 deploy 전에 별도 data migration SQL (`INSERT INTO module_configs SELECT id, config FROM module_instances`) 추가 필요. **본 슬라이스는 dev 만 다룸**, prod migration 은 별도 운영 SPEC 에서. |

### Heads-up for Slice B

본 슬라이스가 완료되면 Slice B 는 다음을 이어받는다.

- **Host 기반 Domain 해석 미들웨어** (REQ-ADMIN-010 / 011): `apps/web/middleware.ts` 에서 `req.headers.host` → `Domain` 레코드 조회. 본 슬라이스에서 `Domain.hostname @unique @db.Citext` 가 준비되었으므로 미들웨어는 `prisma.domain.findUnique({ where: { hostname } })` 한 줄로 해석 가능.
- **Next.js `[mid]` 동적 라우팅** (REQ-ADMIN-012 / 013): `app/[mid]/page.tsx` 에서 `getModuleInstanceByMid(domain.siteId, mid)` (본 슬라이스 산출물) → `getModule(instance.moduleCode)` (본 슬라이스 산출물) → `def.routes.index(...)` 위임.
- **HTTPS 강제 리다이렉트** (REQ-ADMIN-014): `Domain.forceHttps` (본 슬라이스에서 추가) 를 미들웨어에서 검사.
- **tRPC `admin.module.*` 엔드포인트**: `module.create` / `module.update` / `module.updateConfig` / `module.delete` 가 본 슬라이스의 `createModuleInstance` / `deleteModuleInstance` / `getModuleInstanceByMid` 를 호출.
- **Admin Shell UI 기본 레이아웃**: spec.md line 904~926 의 sidebar IA 기반. SPEC-AUTH-001 Slice H 의 `apps/web/app/admin/page.tsx` placeholder 를 본격 구현.
- **AdminLog 기록 로직**: tRPC 미들웨어 `auditLogger` 가 모든 mutation 의 before/after diff 를 `AdminLog` 에 기록.

---

## Open Questions (Slice A 종료 시점 재검토 예정)

1. **`ModuleInstance.scheme` vs `Domain.forceHttps` 의 역할 분담** — 본 슬라이스는 `Domain.forceHttps` 를 신규 도입했으나 `Domain.scheme` 도 보존했다. Slice B 미들웨어 구현 시 두 컬럼의 관계 ("`scheme === 'https'` 이면 자동으로 `forceHttps=true`" 또는 두 컬럼 독립) 를 확정.
2. **모듈 레지스트리 부트스트랩 위치** — spec.md line 1047 "정적 import vs `app/modules/*/register.ts` 자동 발견" 미해결. Slice A 는 정적 import 만 지원하고, Slice B 에서 실제 모듈 (board, wiki 등) 의 등록 위치를 정한다.
3. **`onInstall` 외부 부수효과 정책** — 트랜잭션 안에서 외부 I/O 를 허용/금지/별도 후처리 hook 으로 분리할지. 본 슬라이스는 문서화만; Slice B 에서 실제 board 모듈 onInstall 구현 시 결정.
4. **dev 환경 HMR 중복 등록 처리** — Slice A 는 strict throw. Slice B 의 Next.js 부트스트랩 패턴 (서버 시작 시 1회 등록, HMR 시 재실행 차단) 으로 자연스럽게 해결될 가능성. 추적 필요.

---

Version: 1.0.0
Created: 2026-05-16
Author: manager-spec via /moai plan SPEC-ADMIN-001 Slice A
