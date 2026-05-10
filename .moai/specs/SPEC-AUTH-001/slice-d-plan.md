# SPEC-AUTH-001 Slice D Plan

Status: planning (created 2026-05-10)
Methodology: TDD (RED-GREEN-REFACTOR)
Split: D1 (Adapter Foundation) + D2 (Admin Features)
Base: main = 739a9b1 (Slice A/B/C 완료)

## Migration Strategy

Slice A부터 Slice C까지는 `prisma db push`로 schema 동기화만 수행해 왔으며, 정식 migration 디렉터리(`packages/db/prisma/migrations/`)는 존재하지 않는다. Slice D1에서 `prisma migrate dev`를 도입하면서 다음 정책을 따른다.

- **첫 migration (init)**: Slice A~D1 시점의 누적 스키마(User, EmailAuthToken, AutoLogin, MemberDevice, LoginAttempt, AuditLog 등 기존 모델 + Auth.js Account/Session/VerificationToken 신규 모델)를 squash하여 단일 init migration으로 발행한다. 이전 dev DB는 재생성을 권장한다 (drift 가능성).
- **이후 변경**: 모든 schema 변경은 별도 migration 파일로 발행 (`prisma migrate dev --name ...`). dev에서는 `--create-only`로 SQL을 검토한 후 적용한다.
- **SPEC-INSTALL-001 seed와의 호환성**: SPEC-INSTALL-001의 시드 스크립트가 `User.id`를 Int로 가정하고 있는지, autoincrement 시퀀스가 Auth.js Account/Session FK와 호환되는지 D1 시작 시점에 검증해야 한다. 만약 충돌 시 SPEC-INSTALL-001 측 변경 또는 별도 호환 레이어 도입.
- **production migration**: D1 머지 이후 운영 환경 (있다면)에서는 `prisma migrate deploy`로 일관 적용. dev/prod schema drift는 CI에서 `prisma migrate diff`로 감지.

---

## D1 — Adapter Foundation

### Goal
Auth.js v5 PrismaAdapter 도입으로 JWT 기반 세션을 데이터베이스 세션으로 전환한다. REQ-AUTH-020(상태 변경 시 세션 즉시 무효화) enforcement 기반을 마련하고, D2의 admin 기능이 의존할 Session row 삭제 메커니즘을 제공한다.

### Branch
`feature/auth-001-slice-d1` (base: main = 739a9b1)

### REQ / AC scope
- REQ-AUTH-020 partial: 세션 무효화 *기반* 마련 (DB 세션 전환). 실제 admin trigger 구현은 D2.
- 새 AC 없음. AC-AUTH-013 atomicity gap (last_login_at/last_login_ip 갱신과 세션 생성의 원자성)을 보강.

### Schema additions (`packages/db/prisma/schema.prisma`)
- `model Account` (Auth.js 표준 형태, `userId Int` FK to `User.id`, provider/providerAccountId 복합 unique)
- `model Session` (`sessionToken String @unique`, `userId Int` FK, `expires DateTime`)
- `model VerificationToken` (Auth.js 표준; SPEC-AUTH-001 `EmailAuthToken`과 별개로 유지 — 두 모델은 용도가 다름)
- `User` 모델에 Auth.js 호환 보조 필드 추가:
  - `name String?` (Auth.js User shape 호환, optional)
  - `image String?` (Auth.js User shape 호환, optional)
  - 기존 `userName`/`nickName`은 그대로 유지

### File list (new + modified)

| File | Status | Purpose |
|---|---|---|
| `packages/db/prisma/schema.prisma` | edit | Account/Session/VerificationToken 추가, User 보조 필드 추가 |
| `packages/db/prisma/migrations/<ts>_init/migration.sql` | new | 누적 schema squash |
| `packages/db/prisma/migrations/<ts>_authjs_adapter/migration.sql` | new | adapter 모델 migration (또는 init에 포함) |
| `apps/web/lib/auth/config.ts` | edit | `strategy: "database"` + PrismaAdapter, jwt/session callback 정리 |
| `apps/web/lib/auth/config.test.ts` | new | 세션 전략 + adapter 결합 테스트 |
| `apps/web/package.json` | edit | `@auth/prisma-adapter` 추가 |
| `.moai/specs/SPEC-AUTH-001/progress.md` | append | Slice D1 결과 섹션 |

### Test plan (RED first)
1. `session.strategy === "database"` 확인 (Auth.js config 객체 검증)
2. PrismaAdapter가 NextAuth config에 attach됨 (어댑터 인스턴스 타입/메소드 검증)
3. login 성공 시 Session row가 생성됨 (모킹된 PrismaAdapter 또는 통합 테스트)
4. signOut 시 Session row 삭제 검증
5. Slice C jwt/session callback 회귀 검사 (callback 제거 후에도 user.id, isAdmin이 session에 정상 노출되는지)
6. login.ts와의 인터페이스 변경 없음 (계약 보존 — Slice C login 함수는 그대로 동작)

### Dependencies
- `@auth/prisma-adapter` (npm 신규 의존성)
- `@rhymix-ts/db` (이미 워크스페이스 의존성, 재사용)

### Verification
- `pnpm --filter @rhymix-ts/db prisma migrate dev --create-only` 후 SQL 검토 → `--name init` 적용
- `pnpm --filter @rhymix-ts/db prisma validate`
- `pnpm --filter @rhymix-ts/auth typecheck`, `pnpm --filter @rhymix-ts/db typecheck`, `pnpm --filter web typecheck`
- `pnpm test` (전 워크스페이스, 222 + 신규 테스트)

### Risks
- **Auth.js User shape의 Int userId 호환성**: Auth.js 공식 타입은 `User.id: string`을 가정하는 곳이 있음. Account/Session도 `userId Int` FK로 강제 시 어댑터 내부 타입 호환성 문제 발생 가능. → D1 시작 즉시 `@auth/prisma-adapter` 소스/타입 확인 후 결정 (필요 시 Account.userId/Session.userId만 Int로 두고 어댑터 wrapper에서 string ↔ int 변환).
- **첫 migration이 기존 dev DB와 drift**: `db push` 기반으로 만들어진 dev DB는 migration history가 없음. 재생성 안내 (`prisma migrate reset`) 또는 `prisma migrate resolve --applied`로 baseline 처리 필요.
- **Slice C와의 회귀**: jwt/session callback 제거 후에도 isAdmin/groups가 session에 노출되어야 함. database session에서는 callback이 다르게 동작하므로 통합 테스트 필수.

---

## D2 — Admin Features

### Goal
관리자 권한 흐름 + 회원 status 변경 시 즉시 세션 무효화 + soft delete + RBAC 구현. D1에서 마련한 database session 위에 status 변경 → Session row 삭제 → 다음 요청 차단의 enforcement chain을 완성한다.

### Branch
`feature/auth-001-slice-d2` (base: D1 머지 후 main)

### REQ / AC scope
- REQ-AUTH-020 (status 변경 시 세션 + autologin 즉시 무효화) — 완전 구현
- REQ-AUTH-021 (soft delete + PII anonymize + 90일 retention)
- REQ-AUTH-034 (group 기반 admin 권한 — group.is_admin OR user.is_admin)
- REQ-AUTH-054 (마지막 admin 강등 차단)
- AC-AUTH-020, AC-AUTH-034, AC-AUTH-053(가상 ID 보호 — 강등 시도자 식별), AC-AUTH-054 충족

### File list

| File | Status | Purpose |
|---|---|---|
| `packages/auth/src/admin.ts` | new | `changeUserStatus`, `softDeleteUser`, `restoreUser`, `demoteCheck`, `isAdmin` (group resolution 포함) |
| `packages/auth/src/admin.test.ts` | new | RED first |
| `packages/auth/src/rbac.ts` | new | `resolveAdminPrivilege(user, groups)`, `isLastAdmin(prisma)` |
| `packages/auth/src/rbac.test.ts` | new | RED first |
| `packages/auth/src/index.ts` | edit | re-exports |
| `apps/web/lib/auth/admin-actions.ts` | new | Server Actions: `setMemberStatus`, `deleteMember`, `restoreMember`, `assignGroup`, `removeGroup` |
| `apps/web/lib/auth/admin-actions.test.ts` | new | 통합 테스트 |
| `apps/web/lib/auth/middleware.ts` | new | Auth.js 미들웨어로 admin route (`/admin/*`) 보호, `isAdmin` 검사 |
| `.moai/specs/SPEC-AUTH-001/progress.md` | append | Slice D2 결과 섹션 |
| (선택) `packages/db/prisma/migrations/<ts>_soft_delete/migration.sql` | new | retention/anonymization 컬럼 (`deletedAt`, anonymized fields) 필요 시 |

### Test plan (RED first, 약 20+ tests)

- `changeUserStatus(SUSPENDED)`:
  - User.status 갱신
  - 해당 user의 모든 Session row 삭제
  - 해당 user의 모든 AutoLogin row 삭제
  - AuditLog 기록 (action=STATUS_CHANGED, actorId, targetId)
- `changeUserStatus(DELETED)`:
  - soft delete (PII 필드 anonymize: email/userName/nickName/phoneNumber → `deleted_<id>` 또는 null)
  - status=DELETED, deletedAt set
  - 모든 Session/AutoLogin 삭제
  - AuditLog 기록 (action=MEMBER_DELETED)
- `restoreUser(userId)`:
  - DELETED 상태에서 복구는 retention 기간 내에만 허용
  - PII 복원 불가 (이미 anonymize됨) → 에러 또는 부분 복구
  - AuditLog (action=MEMBER_RESTORED)
- 마지막 admin 강등 시도:
  - REQ-AUTH-054 차단, 에러 코드 `LAST_ADMIN_PROTECTED`
  - AuditLog 기록 (action=ADMIN_DEMOTION_BLOCKED)
- `isAdmin(userId, prisma)`:
  - user.isAdmin=true → admin
  - user.isAdmin=false 이지만 is_admin=true 그룹 멤버 → admin (REQ-AUTH-034)
  - user.isAdmin=false 이고 admin 그룹 미소속 → not admin
- 비-admin이 admin Server Action 호출 시 차단 (`UNAUTHORIZED`)
- 90일 경과한 DELETED 회원의 hard delete 함수 (manual 호출 가능, 실제 cron은 별도 SPEC):
  - retention 통과한 row만 삭제
  - AuditLog 기록 (action=MEMBER_HARD_DELETED)
- AuditLog 이벤트 전체: STATUS_CHANGED, MEMBER_DELETED, MEMBER_RESTORED, ADMIN_DEMOTION_BLOCKED, GROUP_ASSIGNED, GROUP_REMOVED, MEMBER_HARD_DELETED

### Dependencies
- D1 완료 (database session 필수 — Session row 삭제로 무효화 enforcement)
- D1의 Session row 삭제 메커니즘이 D2 status 변경 시 호출됨

### Verification
- `prisma validate`, `pnpm typecheck`, `pnpm test`
- 기존 회귀 없음 (Slice A/B/C 222 + D1 신규 테스트 모두 통과)

### Risks
- **마지막 admin 판단의 race condition**: 동시에 두 개 트랜잭션이 마지막 admin 강등을 시도하면 둘 다 통과할 수 있음. → SERIALIZABLE 격리 수준 또는 advisory lock (`SELECT pg_advisory_xact_lock(...)`) 또는 `SELECT FOR UPDATE` + COUNT 트릭 필요. D2 시작 시 결정.
- **soft delete 후 unique constraint 충돌**: `userId`/`emailAddress`가 citext + unique이므로 anonymize 후에도 고유성 유지 필요. 재가입 가능하도록 anonymize 시점에 `userId → "deleted_<timestamp>_<id>"`, `email → "deleted_<id>@deleted.invalid"` 같은 접두 패턴 사용. D2 시작 시 정책 확정.
- **AuditLog actor 식별**: admin Server Action 호출자의 `session.user.id`를 `actorId`로 기록. database session 환경에서 `auth()` 호출로 정확히 가져와야 함 (D1 결과에 의존).
- **PII anonymize 범위**: 게시물/댓글 등 외래키 보존을 위해 user row 자체는 유지하되, 어떤 필드까지 anonymize할지 결정 필요 (regdate, lastLoginIp 등). D2 시작 시 결정.

---

## Deferred (out of Slice D scope)

- REQ-AUTH-016/017 password reset flow → 별도 슬라이스 (가칭 Slice F)
- REQ-AUTH-018/019 AutoLogin rotation 로직 → Slice E
- REQ-AUTH-032 password force change after N days → Slice E 또는 후속
- REQ-AUTH-033 IP rate limiting reject 로직 → Slice E
- Admin UI (`apps/web/admin/*` pages) → Slice F 또는 별도 SPEC
- Hard delete cron 작업 → 인프라 SPEC

## Open Questions

1. **Auth.js User shape에 Int userId 호환 가능 여부** — D1 시작 시 `@auth/prisma-adapter` 타입/소스 확인 후 즉시 결정.
2. **마지막 admin 차단의 격리 수준** — SERIALIZABLE vs advisory lock vs SELECT FOR UPDATE. D2 시작 시 결정.
3. **soft delete 후 unique constraint 처리 정책** — anonymize 시 unique 충돌 회피 패턴 (접두 vs 다른 컬럼 도입). D2 시작 시 결정.
4. **PII anonymize 필드 범위** — 어떤 필드까지 익명화하고 어떤 필드는 audit/통계 목적으로 보존할지. D2 시작 시 결정.
5. **SPEC-INSTALL-001 seed와의 충돌** — D1 첫 migration이 SPEC-INSTALL-001 seed를 깨뜨리는지 D1 시작 시 확인.

---

Version: 1.0.0
Created: 2026-05-10
Author: manager-spec via /moai plan SPEC-AUTH-001 Slice D
