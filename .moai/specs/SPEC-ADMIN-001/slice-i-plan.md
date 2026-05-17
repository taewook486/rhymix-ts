# SPEC-ADMIN-001 Slice I Plan

Status: completed
Methodology: TDD (RED-GREEN-REFACTOR)
Scope: 잔여 REQ 5종 마무리 — 2FA 강제(REQ-ADMIN-023) + cross-level DnD(REQ-ADMIN-031) + WidgetInstance DB 프리셋(REQ-ADMIN-043) + AdminLog IP 필터(REQ-ADMIN-072 IP) + 모듈 일괄 작업 UI(REQ-ADMIN-090)
Base: main = 8956175 (Slice H 완료 — Export/Import + AdminFavorites, 508 tests)
Depends on: Slice A~H 완료

> **Note**: 본 슬라이스는 SPEC-ADMIN-001 최종 슬라이스(마무리)다. Slice I 완료 시 SPEC-ADMIN-001 의 `status` 를 `draft` → `completed` 로 전환한다.

---

## Pre-Flight Findings

### F1. 2FA 저장 위치 (REQ-ADMIN-023)
`Site` 모델에는 `requireAdminTwoFactor` 칼럼이 없다. 대신 `SiteSetting`(siteId, key, value Json) 키-값 테이블이 Slice A 마이그레이션에 이미 정의되어 있으나 현재 사용처가 없다. 별도 마이그레이션 없이 `SiteSetting.key="requireAdminTwoFactor"` 로 boolean 을 저장한다.

**결정**: SiteSetting 키-값 사용. 신규 칼럼·마이그레이션 불필요.

### F2. 2FA 세션 플래그
`session.user` 에 `twoFactorVerified` 같은 필드는 아직 없다. SPEC-AUTH-001 의 실제 OTP 흐름이 구현되지 않은 상태이므로 본 슬라이스는 **세션 플래그 검사 훅 + 기본 false** 만 도입한다.

**결정**: `session.user.twoFactorVerified === true` 인 경우만 통과. 실제 OTP UI/검증은 SPEC-AUTH-001 후속 슬라이스로 이월(주석 명시). 본 슬라이스는 게이트 로직만 추가하고 테스트는 mock session 으로 검증한다.

### F3. DnD cross-level 의 reorder 와의 관계 (REQ-ADMIN-031)
현재 `admin.menuItem.reorder` 는 이미 `parentId` 도 단일 `$transaction` 으로 갱신할 수 있도록 입력 스키마(`parentId: z.number().int().nullable()`)가 설계되어 있다 (Slice E 완료). 즉, 백엔드 procedure 자체는 cross-level 을 지원한다.

**누락분**: 프론트엔드 `MenuBuilder` 가 same-level 만 호출하고 있다. Slice I 는 **클라이언트 DnD 동작이 parentId 변경도 reorder 입력에 포함**하도록 확장하고, 회귀 테스트를 추가한다.

**결정**: 백엔드 `reorder` 의 cross-level 단위 테스트 추가(서버 측 보장) + MenuBuilder 클라이언트 DnD 핸들러 확장.

### F4. WidgetInstance 모델 존재 여부 (REQ-ADMIN-043)
`packages/db/prisma/schema.prisma` 에 `Widget` / `WidgetInstance` 모델이 아직 없다. Slice G 는 in-memory `WidgetRegistry` 만 도입했다. REQ-ADMIN-043 은 Optional 이므로 본 슬라이스에서 신규 마이그레이션을 도입한다.

**결정**: Prisma 스키마에 `WidgetInstance` 모델 추가 + 단일 마이그레이션 1건. `Widget` 모델은 코드 레지스트리(in-memory)가 이미 단일 진실의 원천이므로 DB 모델로 만들지 않는다 — `WidgetInstance.widgetName` 만 문자열로 보관해 코드 레지스트리와 결합.

### F5. AdminLog IP 필터 (REQ-ADMIN-072 IP)
`admin.log.list` 입력 스키마에 `ip` 가 없다. `AdminLog.ip` 칼럼은 이미 존재한다. CSV export 라우트(`/api/admin/logs/export`)도 동일 query string 을 받으므로 함께 확장한다.

**결정**: `admin.log.list` 입력에 `ip?: string` 추가, CSV export query string 에도 추가.

### F6. 모듈 일괄 작업 UI (REQ-ADMIN-090)
`apps/web/components/admin/ModuleTable.tsx` 는 현재 체크박스 없는 단순 테이블이다. 일괄 삭제 Server Action 도 없다. 회원 일괄 작업(`admin.user.bulk`)이 Slice E 에 이미 존재하므로 동일 패턴을 모듈 인스턴스에 적용한다.

**결정**:
- `apps/web/components/admin/ModuleTable.tsx` 에 체크박스 컬럼 + 선택 액션바 추가
- `apps/web/lib/admin/module-actions.ts` 에 `bulkDeleteModulesAction(ids: number[])` Server Action 추가
- 백엔드는 기존 `admin.module.delete` 를 반복 호출(트랜잭션 없음 — Slice A 의 `onUninstall` 훅이 각 인스턴스별 단일 트랜잭션을 보장)

---

## Task Decomposition

### Task I-1: 2FA 강제 게이트 (REQ-ADMIN-023)

**Files (new)**:
- `apps/web/lib/auth/two-factor.ts`
- `apps/web/lib/auth/two-factor.test.ts`

**Files (modify)**:
- `apps/web/app/admin/layout.tsx` — `// TODO requireAdmin2FAIfEnabled` 위치에 활성화
- `apps/web/server/api/trpc.ts` — `requireAdmin` 미들웨어 뒤에 `requireAdmin2FAIfEnabled` 미들웨어 체인 (no-op 기본, SiteSetting 활성 시 차단)
- `apps/web/server/api/trpc.test.ts` (또는 새 `trpc.two-factor.test.ts`)

**`two-factor.ts` 설계**:
```ts
/**
 * SiteSetting.key='requireAdminTwoFactor' 의 boolean value 를 읽는다.
 * 키가 없으면 false (기본 비활성).
 */
export async function isAdminTwoFactorRequired(
  prisma: PrismaClient,
): Promise<boolean>

/**
 * session 에 twoFactorVerified === true 가 있을 때만 통과.
 * SPEC-AUTH-001 의 실제 OTP 흐름은 후속 슬라이스에서 이 플래그를 채운다.
 */
export function isSessionTwoFactorVerified(session: Session | null): boolean
```

**tRPC 미들웨어**:
```ts
const requireAdmin2FAIfEnabled = t.middleware(async ({ ctx, next }) => {
  const required = await isAdminTwoFactorRequired(ctx.prisma);
  if (required && !isSessionTwoFactorVerified(ctx.session)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '2FA 인증이 필요합니다.',
    });
  }
  return next();
});

// 체인: publicProcedure.use(requireAdmin).use(requireAdmin2FAIfEnabled).use(auditLogger)
```

**layout.tsx 변경**:
```ts
const session = await auth()
if (!isAdminSession(session)) redirect('/login?callbackUrl=/admin')

const required = await isAdminTwoFactorRequired(prisma)
if (required && !isSessionTwoFactorVerified(session)) {
  redirect('/login/two-factor?callbackUrl=/admin')
}
```

**Tests (RED first)**:
- I-1-1: SiteSetting 없음 → `isAdminTwoFactorRequired` → `false`
- I-1-2: SiteSetting `requireAdminTwoFactor=true` → `isAdminTwoFactorRequired` → `true`
- I-1-3: `session.user.twoFactorVerified=true` → `isSessionTwoFactorVerified` → `true`
- I-1-4: session 없음 / 플래그 누락 → `false`
- I-1-5: tRPC 통합 — 2FA 활성 + 미인증 관리자가 `admin.module.list` 호출 → `FORBIDDEN`
- I-1-6: tRPC 통합 — 2FA 비활성 → 정상 통과 (기존 동작 회귀 방지)
- I-1-7: layout 통합 — 2FA 활성 + 미인증 → `/login/two-factor` 로 redirect
- I-1-8: layout 통합 — 2FA 비활성 → 기존 admin shell 정상 렌더

### Task I-2: DnD cross-level (REQ-ADMIN-031)

**Files (new)**:
- 없음

**Files (modify)**:
- `apps/web/server/api/routers/admin/menu-item.test.ts` — cross-level 케이스 추가
- `apps/web/components/admin/MenuBuilder.tsx` (또는 Slice E 에서 만든 DnD 컴포넌트) — `handleDragEnd` 가 drop target 의 `parentId` 를 reorder 입력에 포함하도록 확장

**백엔드 (변경 없음, 테스트만 추가)**:
기존 `admin.menuItem.reorder` 는 이미 `{ id, parentId, listOrder }[]` 를 받아 단일 `$transaction` 으로 갱신한다. cross-level 입력도 처리 가능하다.

**Tests (RED first)**:
- I-2-1: `reorder` 입력에 동일 항목의 parentId 가 변경되면 `parentId` + `listOrder` 가 한 트랜잭션 안에서 갱신된다 (기존 same-level 테스트와 분리)
- I-2-2: cross-level 입력에서 `listOrder` 가 새 부모 기준으로 0 부터 다시 매겨진다 (입력 그대로 반영되는지 검증)
- I-2-3: MenuBuilder UI 단위 테스트 — 한 항목을 다른 부모로 드롭하면 mock `reorder` 호출에 `parentId` 변경이 포함된다

### Task I-3: WidgetInstance DB 프리셋 (REQ-ADMIN-043)

**Files (new)**:
- `packages/db/prisma/migrations/2026XXXXXXXXXX_widget_instance/migration.sql` (자동 생성)
- `apps/web/server/api/routers/admin/widget.ts`
- `apps/web/server/api/routers/admin/widget.test.ts`

**Files (modify)**:
- `packages/db/prisma/schema.prisma` — `WidgetInstance` 모델 추가
- `apps/web/server/api/routers/admin/index.ts` — `widget` 라우터 등록

**Prisma 스키마 추가**:
```prisma
model WidgetInstance {
  id          Int      @id @default(autoincrement())
  widgetName  String   // WidgetRegistry 의 name 과 매칭 (code-side 단일 진실)
  label       String
  props       Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([widgetName])
  @@map("widget_instances")
}
```

**tRPC procedures (`admin.widget`)**:
```ts
admin.widget.savePreset({ widgetName: string, label: string, props: unknown })
  → WidgetInstance
  // 서버에서 WidgetRegistry.getWidget(widgetName).propsSchema.parse(props) 로 검증
  // 미등록 widgetName → BAD_REQUEST

admin.widget.listPresets({ widgetName?: string })
  → WidgetInstance[]

admin.widget.deletePreset({ id: number })
  → { deleted: true }
```

**Tests (RED first)**:
- I-3-1: 등록된 위젯 + 유효 props → `savePreset` 성공, DB 에 레코드 생성
- I-3-2: 미등록 widgetName → `BAD_REQUEST`
- I-3-3: 유효 widgetName + 잘못된 props 형태 → `BAD_REQUEST` (Zod validation)
- I-3-4: `listPresets()` → 전체 목록, `listPresets({ widgetName: 'hello' })` → 필터 적용
- I-3-5: `deletePreset` → DB 삭제
- I-3-6: 비관리자 → 모두 `FORBIDDEN`

### Task I-4: AdminLog IP 필터 (REQ-ADMIN-072 IP)

**Files (modify)**:
- `apps/web/server/api/routers/admin/log.ts` — `ip?: string` 입력 + `where` 절 추가
- `apps/web/server/api/routers/admin/log.test.ts` — IP 필터 케이스 추가
- `apps/web/app/api/admin/logs/export/route.ts` (Slice E CSV export) — query string `ip` 파싱 추가
- `apps/web/app/admin/logs/page.tsx` (또는 client 필터 UI) — `ip` 입력 필드 추가

**`log.list` 변경**:
```ts
.input(
  z.object({
    actorId: z.number().int().positive().optional(),
    action: z.string().optional(),
    target: z.string().optional(),
    ip: z.string().optional(),   // NEW
    from: z.date().optional(),
    to: z.date().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
  }),
)
// where 절: ...(input.ip ? { ip: { contains: input.ip } } : {}),
```

**Tests (RED first)**:
- I-4-1: IP 필터 없이 호출 → 전체 로그 반환 (회귀 없음)
- I-4-2: `ip='10.0.0.'` 부분 일치 → 해당 IP prefix 의 로그만 반환
- I-4-3: CSV export — query string `?ip=10.0.0.1` → CSV 에 해당 IP 행만 포함
- I-4-4: 관리자 logs 페이지에서 IP 필터 입력 → tRPC 입력에 ip 가 전달됨

`@MX:TODO` 제거: `log.ts` 의 `IP 필터 — Slice E` TODO 주석을 본 슬라이스에서 제거한다.

### Task I-5: 모듈 인스턴스 일괄 작업 UI (REQ-ADMIN-090)

**Files (new)**:
- `apps/web/lib/admin/module-actions.ts` (또는 기존 파일에 함수 추가)
- `apps/web/components/admin/ModuleTable.test.tsx` (체크박스/액션바 케이스 확장)

**Files (modify)**:
- `apps/web/components/admin/ModuleTable.tsx` — 체크박스 헤더 + 행 체크박스 + 선택 액션바
- `apps/web/app/admin/modules/page.tsx` — `ModuleTable` 가 server action 을 받을 수 있게 props 전달

**Server Action**:
```ts
'use server'
export async function bulkDeleteModulesAction(
  ids: number[],
): Promise<{ deleted: number; failed: number[] }> {
  // 1. session check (isAdminSession → 비관리자 즉시 throw)
  // 2. for each id: getServerCaller().admin.module.delete({ id })
  //    — 실패한 id 는 failed[] 에 모음 (REQ-ADMIN-006 도메인 index 보호 인스턴스는 실패)
  // 3. revalidatePath('/admin/modules')
}
```

**UI 동작**:
- 헤더 체크박스 → 전체 선택/해제
- 행 체크박스 → 개별 선택
- 1개 이상 선택 시 상단에 "N개 선택됨 | [선택 삭제]" 바 표시
- "선택 삭제" 클릭 → confirm dialog → `bulkDeleteModulesAction` 호출 → toast 결과 표시

**Tests (RED first)**:
- I-5-1: ModuleTable — 행 체크박스 토글 시 선택 상태가 반영된다 (Testing Library)
- I-5-2: 헤더 체크박스 → 모든 행 선택/해제
- I-5-3: 0개 선택 시 액션바 비표시
- I-5-4: 1개 이상 선택 시 액션바 표시 + "선택 삭제" 버튼 클릭 시 action 호출 mock 검증
- I-5-5: `bulkDeleteModulesAction` 단위 테스트 — 비관리자 호출 → throw
- I-5-6: 일부 id 가 인덱스 모듈로 지정되어 실패 → `failed[]` 에 포함되고 `deleted` 카운트는 성공한 것만

---

## File Summary

| 파일 | 상태 | 태스크 |
|------|------|--------|
| `apps/web/lib/auth/two-factor.ts` | new | I-1 |
| `apps/web/lib/auth/two-factor.test.ts` | new | I-1 |
| `apps/web/app/admin/layout.tsx` | edit | I-1 |
| `apps/web/server/api/trpc.ts` | edit | I-1 |
| `apps/web/server/api/trpc.two-factor.test.ts` | new | I-1 |
| `apps/web/components/admin/MenuBuilder.tsx` | edit | I-2 |
| `apps/web/server/api/routers/admin/menu-item.test.ts` | edit | I-2 |
| `packages/db/prisma/schema.prisma` | edit | I-3 |
| `packages/db/prisma/migrations/2026XXXXXXXXXX_widget_instance/migration.sql` | new | I-3 |
| `apps/web/server/api/routers/admin/widget.ts` | new | I-3 |
| `apps/web/server/api/routers/admin/widget.test.ts` | new | I-3 |
| `apps/web/server/api/routers/admin/index.ts` | edit | I-3 |
| `apps/web/server/api/routers/admin/log.ts` | edit | I-4 |
| `apps/web/server/api/routers/admin/log.test.ts` | edit | I-4 |
| `apps/web/app/api/admin/logs/export/route.ts` | edit | I-4 |
| `apps/web/app/admin/logs/page.tsx` | edit | I-4 |
| `apps/web/lib/admin/module-actions.ts` | new (or edit) | I-5 |
| `apps/web/components/admin/ModuleTable.tsx` | edit | I-5 |
| `apps/web/components/admin/ModuleTable.test.tsx` | edit | I-5 |
| `apps/web/app/admin/modules/page.tsx` | edit | I-5 |
| `.moai/specs/SPEC-ADMIN-001/slice-i-plan.md` | new | — |

---

## REQ Enforcement Chain (Slice I)

| REQ | 게이트 | 구현 위치 | 검증 |
|-----|--------|-----------|------|
| REQ-ADMIN-023 | 2FA 강제 | `requireAdmin2FAIfEnabled` 미들웨어 + layout redirect | I-1-5, I-1-7 |
| REQ-ADMIN-031 (cross-level) | DnD 트랜잭션 | `admin.menuItem.reorder` (기존) + MenuBuilder 핸들러 확장 | I-2-1, I-2-3 |
| REQ-ADMIN-043 | WidgetInstance | `admin.widget.savePreset/listPresets/deletePreset` | I-3-1, I-3-4 |
| REQ-ADMIN-072 (IP) | IP 필터 | `admin.log.list` 입력 + where 절, CSV export query | I-4-2, I-4-3 |
| REQ-ADMIN-090 | 일괄 작업 | ModuleTable 체크박스 + `bulkDeleteModulesAction` | I-5-4, I-5-6 |

---

## Acceptance Criteria (Slice I)

- **AC-I-1-1**: SiteSetting `requireAdminTwoFactor=true` + 미인증 세션 → `admin.module.list` 호출 `FORBIDDEN`
- **AC-I-1-2**: SiteSetting `requireAdminTwoFactor=true` + 미인증 세션 → `/admin` 접근 시 `/login/two-factor` 로 redirect
- **AC-I-1-3**: SiteSetting 비활성 → 기존 admin 동작 회귀 없음 (Slice A~H 의 508 tests pass)
- **AC-I-2-1**: `admin.menuItem.reorder` 가 `parentId` 변경 + `listOrder` 갱신을 단일 `$transaction` 으로 처리
- **AC-I-2-2**: MenuBuilder 의 cross-level DnD → reorder 입력에 변경된 parentId 포함
- **AC-I-3-1**: `admin.widget.savePreset({ widgetName: 'hello', label: 'preset1', props: { name: 'Alice' } })` → WidgetInstance 생성
- **AC-I-3-2**: 미등록 widgetName / 잘못된 props → `BAD_REQUEST`
- **AC-I-4-1**: `admin.log.list({ ip: '10.0.0.' })` → 해당 IP prefix 만 반환
- **AC-I-4-2**: `GET /api/admin/logs/export?ip=10.0.0.1` → CSV 에 매칭 행만
- **AC-I-5-1**: ModuleTable — 다중 선택 → "선택 삭제" 버튼 → 모든 선택 인스턴스가 삭제됨 (인덱스 모듈은 실패로 분류)
- **AC-I-5-2**: 비관리자 `bulkDeleteModulesAction` 호출 → throw
- 기존 508 테스트 회귀 없음

---

## @MX Tag 작업

- **추가**:
  - `apps/web/lib/auth/two-factor.ts` — `@MX:ANCHOR` (REQ-ADMIN-023 단일 진입점, fan_in ≥ 2: layout + trpc)
  - `packages/db/prisma/schema.prisma` `WidgetInstance` 근처 — `@MX:NOTE` (widgetName 이 코드 레지스트리와의 결합 키임을 명시)
- **제거**:
  - `apps/web/app/admin/layout.tsx` 의 `@MX:TODO requireAdmin2FAIfEnabled` → 본 슬라이스에서 해소
  - `apps/web/server/api/trpc.ts` 의 `TODO (Slice E site-settings): requireAdmin2FAIfEnabled` 주석 → 해소
  - `apps/web/server/api/routers/admin/log.ts` 의 `@MX:TODO IP 필터 — Slice E` → 해소
- **검토**:
  - `apps/web/server/api/routers/admin/menu-item.ts` 의 `@MX:ANCHOR` (reorder) — fan_in 여전히 ≥ 3, 유지

---

## SPEC 상태 전환 (Slice I 완료 시)

- `.moai/specs/SPEC-ADMIN-001/spec.md` frontmatter
  - `status: draft` → `status: completed`
  - `updated:` 필드 추가 (완료일)
- `.moai/specs/SPEC-ADMIN-001/spec.md` 본문 하단 `## HISTORY` 또는 `## Completion` 섹션에 다음을 추가:
  ```
  - 2026-05-XX (Slice I): 잔여 REQ-023/031(cross-level)/043/072(IP)/090 완결.
    SPEC-ADMIN-001 base 구현 완료. 다운스트림 SPEC (CONTENT-001, THEME-001) 진행 가능.
  ```

---

## Deferred / Out of Scope (Slice I 이후)

본 슬라이스가 닫지 않는 항목은 SPEC-ADMIN-001 의 `Open Questions` 또는 후속 SPEC 으로 명시 이월:

- **실제 OTP UI 흐름**: `/login/two-factor` 페이지, TOTP 시크릿 발급/검증 → **SPEC-AUTH-001** 후속 슬라이스 (본 슬라이스는 게이트만 도입, session 플래그는 mock)
- **Redis 캐시 어댑터**: REQ-ADMIN-060 의 선택 구현 → 후속 인프라 SPEC
- **AdminLog 파티셔닝/아카이빙**: spec.md Open Question #2 → 후속 운영 SPEC
- **관리자 UI 다국어**: spec.md Open Question #3 → 후속 i18n SPEC
- **위젯 임베드 권한 모델**: spec.md Open Question #5 (trusted group 제어) → SPEC-THEME-001 또는 콘텐츠 권한 SPEC

---

## Heads-up: SPEC-ADMIN-001 완료 후 다음 작업

의존성 그래프상 ADMIN-001 가 닫히면 다음이 가능해진다:

1. **SPEC-CONTENT-001** (게시판/문서 시스템)
   - `Document`, `Comment`, `Board` 모델 도입
   - `board` 모듈을 `ModuleDefinition.routes.index` 로 실제 구현 (현재 mock)
   - `[mid]/page.tsx` 가 ModuleInstance 의 moduleCode='board' 인 인스턴스를 실제 렌더링
   - 첨부파일, 태그, 검색
2. **SPEC-THEME-001** (레이아웃/스킨/위젯 디자인)
   - 3-pane 디자인 에디터 (spec.md "Three-Pane Design Editor" 섹션)
   - 위젯 디자인 에디터 — Slice I 의 `WidgetInstance` 프리셋 위에 비주얼 편집기 부착
   - 테마 manifest 의 Zod 스키마 → 동적 폼 자동 렌더링
3. **SPEC-AUTH-001 후속**
   - 실제 TOTP 발급/검증 흐름 (Slice I 가 만든 2FA 게이트가 의미 있게 동작)

---

Version: 1.0.0
Created: 2026-05-17
Author: manager-spec
